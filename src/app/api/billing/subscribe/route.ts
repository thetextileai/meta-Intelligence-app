import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Brand from "@/models/Brand";
import { createSubscription } from "@/lib/shopify-billing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");
  const plan = (searchParams.get("plan") || "starter") as "starter" | "pro";
  const host = searchParams.get("host") || "";

  if (!shop) {
    return NextResponse.json({ error: "Missing required 'shop' parameter" }, { status: 400 });
  }

  await dbConnect();
  const cleanShop = shop.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim().toLowerCase();

  const brand = await Brand.findOne({
    $or: [
      { shopifyStoreUrl: new RegExp(cleanShop, "i") },
      { shopifyDomains: cleanShop },
    ],
  });

  if (!brand || !brand.shopifyAccessToken) {
    return NextResponse.json({ error: "Store not installed or authorized" }, { status: 404 });
  }

  try {
    const { confirmationUrl } = await createSubscription({
      shop: cleanShop,
      accessToken: brand.shopifyAccessToken,
      planId: plan,
      host,
    });

    if (!confirmationUrl) {
      return NextResponse.json({ error: "Failed to generate Shopify billing URL" }, { status: 500 });
    }

    return NextResponse.redirect(confirmationUrl);
  } catch (err: any) {
    console.error("[Shopify Billing Create Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
