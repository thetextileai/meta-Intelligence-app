import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook } from "@/lib/verify-webhook";

export const dynamic = "force-dynamic";

/**
 * Mandatory Shopify Compliance Webhook: customers/data_request
 * Triggered when a customer requests their data from the store owner.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const hmac = req.headers.get("x-shopify-hmac-sha256");

    if (!verifyShopifyWebhook(rawBody, hmac)) {
      return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    console.log("[Shopify GDPR] Customer data request received for store:", payload.shop_domain);

    // Tameta Decision Intelligence does not store individual customer PII profiles (only aggregate order numbers)
    return NextResponse.json({ success: true, message: "Customer data request acknowledged" });
  } catch (err: any) {
    console.error("[Shopify GDPR Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
