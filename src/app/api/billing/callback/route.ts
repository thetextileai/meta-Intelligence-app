import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Brand from "@/models/Brand";
import { PLANS } from "@/lib/shopify-billing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");
  const chargeId = searchParams.get("charge_id");
  const planId = searchParams.get("plan") || "starter";
  const host = searchParams.get("host") || "";

  if (!shop) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  await dbConnect();
  const cleanShop = shop.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim().toLowerCase();
  const plan = PLANS[planId] || PLANS.starter;

  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + plan.trialDays);

  await Brand.findOneAndUpdate(
    {
      $or: [
        { shopifyStoreUrl: new RegExp(cleanShop, "i") },
        { shopifyDomains: cleanShop },
      ],
    },
    {
      planName: plan.id,
      planPrice: plan.price,
      planStatus: "active",
      shopifyChargeId: chargeId || "",
      trialEndsAt: trialEnds,
    }
  );

  // Redirect merchant back into embedded app
  const redirectUrl = new URL(`/embedded`, req.url);
  redirectUrl.searchParams.set("shop", cleanShop);
  if (host) redirectUrl.searchParams.set("host", host);
  redirectUrl.searchParams.set("billing_success", "true");

  return NextResponse.redirect(redirectUrl);
}
