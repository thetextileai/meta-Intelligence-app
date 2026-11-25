import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Brand from "@/models/Brand";
import { syncShopifyOrders, syncShopifyProducts, syncMetaAds } from "@/lib/sync-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId, shop, type = "all" } = body;

    await dbConnect();

    let brand = null;
    if (brandId) {
      brand = await Brand.findById(brandId);
    } else if (shop) {
      const cleanShop = shop.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim().toLowerCase();
      brand = await Brand.findOne({
        $or: [
          { shopifyStoreUrl: new RegExp(cleanShop, "i") },
          { shopifyDomains: cleanShop },
        ],
      });
    }

    if (!brand) {
      return NextResponse.json({ success: false, error: "Store not found" }, { status: 404 });
    }

    const bId = String(brand._id);
    const results: Record<string, any> = {};

    if (type === "orders" || type === "all") {
      try {
        results.orders = await syncShopifyOrders(bId, 14);
      } catch (err: any) {
        results.orders = { success: false, error: err.message };
      }
    }

    if (type === "products" || type === "all") {
      try {
        results.products = await syncShopifyProducts(bId);
      } catch (err: any) {
        results.products = { success: false, error: err.message };
      }
    }

    if ((type === "meta" || type === "all") && brand.metaAccountId && brand.metaAccessToken) {
      try {
        results.meta = await syncMetaAds(bId, 14);
      } catch (err: any) {
        results.meta = { success: false, error: err.message };
      }
    }

    await Brand.findByIdAndUpdate(bId, { lastSyncAt: new Date() });

    return NextResponse.json({
      success: true,
      brandId: bId,
      results,
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Shopify App Sync Error]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
