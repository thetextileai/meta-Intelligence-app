import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import Brand from "@/models/Brand";

export const dynamic = "force-dynamic";

/**
 * Shopify OAuth Callback Endpoint
 * Exchanges code for permanent access token, provisions store, triggers sync.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");
  const code = searchParams.get("code");
  const hmac = searchParams.get("hmac");
  const host = searchParams.get("host");

  if (!shop || !code) {
    return NextResponse.json(
      { error: "Missing required OAuth parameters (shop or code)" },
      { status: 400 }
    );
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID || "b5a43396667708536cddc4e977f4dd3e";
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || process.env.SHOPIFY_API_SECRET || "";

  // 1. Verify HMAC
  if (hmac && clientSecret) {
    const paramsMap: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      if (key !== "hmac" && key !== "signature") {
        paramsMap[key] = val;
      }
    });

    const message = Object.keys(paramsMap)
      .sort()
      .map((key) => `${key}=${paramsMap[key]}`)
      .join("&");

    const generatedHash = crypto
      .createHmac("sha256", clientSecret)
      .update(message)
      .digest("hex");

    if (generatedHash !== hmac) {
      console.warn(`[Shopify OAuth] HMAC signature warning for store: ${shop}`);
    }
  }

  // 2. Exchange Code for Access Token
  const tokenUrl = `https://${shop}/admin/oauth/access_token`;
  let accessToken = "";

  try {
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return NextResponse.json({ error: "Token exchange failed", details: errText }, { status: 500 });
    }

    const tokenData = await tokenRes.json();
    accessToken = tokenData.access_token;
  } catch (err: any) {
    return NextResponse.json({ error: "Network error during OAuth", message: err.message }, { status: 500 });
  }

  // 3. Connect to DB & Provision / Update Store
  await dbConnect();
  const cleanShop = shop
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim()
    .toLowerCase();

  let storeName = cleanShop.replace(".myshopify.com", "");
  let storeCurrency = "INR";

  try {
    const shopProfileRes = await fetch(`https://${cleanShop}/admin/api/2024-07/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });
    if (shopProfileRes.ok) {
      const profileData = await shopProfileRes.json();
      if (profileData.shop?.name) storeName = profileData.shop.name;
      if (profileData.shop?.currency) storeCurrency = profileData.shop.currency;
    }
  } catch {}

  let brand = await Brand.findOne({
    $or: [
      { shopifyStoreUrl: new RegExp(cleanShop, "i") },
      { shopifyDomains: cleanShop },
    ],
  });

  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 7);

  if (!brand) {
    brand = await Brand.create({
      name: storeName,
      shopifyStoreUrl: cleanShop,
      shopifyDomains: [cleanShop],
      shopifyAccessToken: accessToken,
      shopifyApiSecret: clientSecret,
      shopifyStatus: "connected",
      currency: storeCurrency,
      status: "active",
      planName: "trial",
      planStatus: "trial",
      trialEndsAt: trialEnds,
    });
  } else {
    brand.shopifyAccessToken = accessToken;
    if (clientSecret) brand.shopifyApiSecret = clientSecret;
    brand.shopifyStatus = "connected";
    if (!brand.name || brand.name.includes(".myshopify.com")) {
      brand.name = storeName;
    }
    await brand.save();
  }

  // 4. Redirect merchant into embedded app experience inside Shopify Admin
  const embeddedUrl = new URL(`/embedded`, req.url);
  embeddedUrl.searchParams.set("shop", cleanShop);
  if (host) embeddedUrl.searchParams.set("host", host);
  embeddedUrl.searchParams.set("brandId", String(brand._id));

  return NextResponse.redirect(embeddedUrl);
}
