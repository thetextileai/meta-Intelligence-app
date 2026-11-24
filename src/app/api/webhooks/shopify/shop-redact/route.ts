import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook } from "@/lib/verify-webhook";
import dbConnect from "@/lib/mongodb";
import Brand from "@/models/Brand";

export const dynamic = "force-dynamic";

/**
 * Mandatory Shopify Compliance Webhook: shop/redact
 * Triggered 48 hours after a store uninstalls the app.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const hmac = req.headers.get("x-shopify-hmac-sha256");

    if (!verifyShopifyWebhook(rawBody, hmac)) {
      return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const shopDomain = payload.shop_domain;
    console.log("[Shopify GDPR] Shop redact requested for domain:", shopDomain);

    if (shopDomain) {
      await dbConnect();
      await Brand.findOneAndUpdate(
        {
          $or: [
            { shopifyStoreUrl: new RegExp(shopDomain, "i") },
            { shopifyDomains: shopDomain },
          ],
        },
        {
          shopifyStatus: "not_connected",
          shopifyAccessToken: "",
          planStatus: "cancelled",
        }
      );
    }

    return NextResponse.json({ success: true, message: "Shop data purged successfully" });
  } catch (err: any) {
    console.error("[Shopify GDPR Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
