import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Initiates Shopify OAuth flow when a merchant clicks "Install" or enters their store domain.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");

  if (!shop) {
    return NextResponse.json({ error: "Missing required 'shop' parameter" }, { status: 400 });
  }

  const cleanShop = shop
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim()
    .toLowerCase();

  const clientId = process.env.SHOPIFY_CLIENT_ID || "b5a43396667708536cddc4e977f4dd3e";
  const scopes = process.env.SHOPIFY_SCOPES || "read_orders,read_products,read_all_orders";
  const appUrl = process.env.SHOPIFY_APP_URL || "https://brands.tameta.tech";
  const redirectUri = `${appUrl}/api/auth/callback`;

  const installUrl = `https://${cleanShop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}`;

  return NextResponse.redirect(installUrl);
}
