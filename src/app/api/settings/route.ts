import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Brand from "@/models/Brand";
import { syncMetaAds } from "@/lib/sync-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      brandId,
      shop,
      name,
      metaAccountId,
      metaAccessToken,
      targetCpa,
      breakEvenCpa,
      targetRoas,
      averageOrderValue,
      cogsPercentage,
      rtoRate,
    } = body;

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

    const updateFields: Record<string, any> = {};

    if (name && typeof name === "string") updateFields.name = name.trim();
    if (targetCpa !== undefined && !isNaN(Number(targetCpa))) updateFields.targetCpa = Number(targetCpa);
    if (breakEvenCpa !== undefined && !isNaN(Number(breakEvenCpa))) updateFields.breakEvenCpa = Number(breakEvenCpa);
    if (targetRoas !== undefined && !isNaN(Number(targetRoas))) updateFields.targetRoas = Number(targetRoas);
    if (averageOrderValue !== undefined && !isNaN(Number(averageOrderValue))) updateFields.averageOrderValue = Number(averageOrderValue);
    if (cogsPercentage !== undefined && !isNaN(Number(cogsPercentage))) updateFields.cogsPercentage = Number(cogsPercentage);
    if (rtoRate !== undefined && !isNaN(Number(rtoRate))) updateFields.rtoRate = Number(rtoRate);

    if (metaAccountId !== undefined && metaAccountId.trim()) {
      const cleanActId = metaAccountId.trim().startsWith("act_")
        ? metaAccountId.trim()
        : `act_${metaAccountId.trim()}`;
      updateFields.metaAccountId = cleanActId;

      const tokenToVerify = metaAccessToken?.trim() || brand.metaAccessToken;
      if (metaAccessToken && metaAccessToken.trim()) {
        updateFields.metaAccessToken = metaAccessToken.trim();
      }

      if (tokenToVerify) {
        try {
          const verifyRes = await fetch(
            `https://graph.facebook.com/v20.0/${cleanActId}?fields=id,name&access_token=${tokenToVerify}`
          );
          const verifyData = await verifyRes.json();
          if (verifyData.error) {
            return NextResponse.json(
              { success: false, error: `Meta API verification failed: ${verifyData.error.message}` },
              { status: 400 }
            );
          }
          updateFields.metaStatus = "connected";
          updateFields.metaError = "";
        } catch (err: any) {
          return NextResponse.json(
            { success: false, error: `Could not reach Meta API: ${err.message}` },
            { status: 400 }
          );
        }
      }
    }

    const updated = await Brand.findByIdAndUpdate(brand._id, updateFields, { new: true }).lean();

    if (updated && (updateFields.metaAccessToken || updateFields.metaAccountId) && (updated as any).metaStatus === "connected") {
      syncMetaAds(String((updated as any)._id), 30).catch((e: any) =>
        console.warn("[Shopify App Settings] Background Meta sync warning:", e?.message)
      );
    }

    return NextResponse.json({
      success: true,
      message: "Configuration saved successfully!",
      brand: updated,
    });
  } catch (err: any) {
    console.error("[Shopify App Settings Error]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
