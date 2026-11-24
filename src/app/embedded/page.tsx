import { Suspense } from "react";
import dbConnect from "@/lib/mongodb";
import Brand from "@/models/Brand";
import Order from "@/models/Order";
import Campaign from "@/models/Campaign";
import DailyMetric from "@/models/DailyMetric";
import ShopifyAppClient from "@/components/ShopifyAppClient";

export const dynamic = "force-dynamic";

export default async function EmbeddedPage(props: {
  searchParams: Promise<{
    shop?: string;
    host?: string;
    brandId?: string;
    range?: string;
    billing_success?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const shopParam = searchParams.shop || "";
  const hostParam = searchParams.host || "";
  const brandIdParam = searchParams.brandId || "";
  const rangeParam = searchParams.range || "last_7_days";

  await dbConnect();

  const cleanShop = shopParam
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim()
    .toLowerCase();

  let brand: any = null;

  if (brandIdParam) {
    brand = await Brand.findById(brandIdParam).lean();
  }

  if (!brand && cleanShop) {
    brand = await Brand.findOne({
      $or: [
        { shopifyStoreUrl: new RegExp(cleanShop, "i") },
        { shopifyDomains: cleanShop },
      ],
    }).lean();
  }

  if (!brand) {
    const clientId = process.env.SHOPIFY_CLIENT_ID || "b5a43396667708536cddc4e977f4dd3e";
    const appUrl = process.env.SHOPIFY_APP_URL || "https://brands.tameta.tech";
    const installUrl = cleanShop
      ? `/api/auth/shopify?shop=${cleanShop}`
      : `https://admin.shopify.com/oauth/install_custom_app?client_id=${clientId}`;

    return (
      <div className="min-h-screen bg-[#f6f6f7] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#e1e3e5] p-8 text-center">
          <div className="w-16 h-16 bg-[#e02b20]/10 text-[#e02b20] rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl">
            TT
          </div>
          <h1 className="text-xl font-bold text-[#202223] mb-2">Tameta Decision Intelligence</h1>
          <p className="text-xs text-[#6d7175] mb-6">
            Meta Ads True ROAS (+18% GST) and Media Buyer Decision SOP for{" "}
            <span className="font-semibold text-[#202223]">{cleanShop || "your store"}</span>.
          </p>
          <a
            href={installUrl}
            target="_top"
            className="w-full inline-flex items-center justify-center px-5 py-3 rounded-xl bg-[#202223] hover:bg-black text-white font-semibold text-xs transition-all shadow-sm"
          >
            Authorize Store
          </a>
        </div>
      </div>
    );
  }

  // Determine date range in IST
  const now = new Date();
  let daysAgo = 7;
  if (rangeParam === "today") daysAgo = 0;
  else if (rangeParam === "yesterday") daysAgo = 1;
  else if (rangeParam === "this_week") daysAgo = 7;
  else if (rangeParam === "this_month") daysAgo = 30;
  else if (rangeParam === "last_30_days") daysAgo = 30;

  const startDate = new Date();
  startDate.setDate(now.getDate() - daysAgo);
  startDate.setHours(0, 0, 0, 0);

  // 1. Fetch Orders (Lean query selecting only KPI fields)
  const orders = await Order.find({
    brandId: brand._id,
    cancelledAt: null,
    orderDate: { $gte: startDate },
  })
    .select("total orderDate financialStatus orderNumber customer")
    .sort({ orderDate: -1 })
    .lean();

  const totalSales = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
  const totalOrders = orders.length;

  let paidOrders = 0;
  let partialPaidOrders = 0;
  let codOrders = 0;

  orders.forEach((o: any) => {
    const status = (o.financialStatus || "").toLowerCase();
    if (status === "paid") paidOrders++;
    else if (status === "partially_paid" || status === "partial") partialPaidOrders++;
    else codOrders++;
  });

  // 2. Fetch Daily Metrics for Ad Spend
  const dateStr = startDate.toISOString().split("T")[0];
  const dailyMetrics = await DailyMetric.find({
    brandId: brand._id,
    date: { $gte: dateStr },
  }).lean();

  const baseSpend = dailyMetrics.reduce((sum: number, m: any) => sum + (m.spend || 0), 0);
  const spendWithGst = Math.round(baseSpend * 1.18);
  const blendedRoas = spendWithGst > 0 ? Number((totalSales / spendWithGst).toFixed(2)) : 0;

  // 3. Fetch Campaigns
  const campaigns = await Campaign.find({ brandId: brand._id })
    .sort({ spend: -1 })
    .lean();

  const activeCampaigns = campaigns.filter((c: any) => (c.status || "").toLowerCase() === "active");
  const totalDailyBudget = activeCampaigns.reduce((sum: number, c: any) => sum + (c.dailyBudget || 0), 0);
  const totalDailyBudgetWithGst = Math.round(totalDailyBudget * 1.18);

  const serializedBrand = {
    _id: brand._id.toString(),
    name: brand.name,
    shopifyStoreUrl: brand.shopifyStoreUrl,
    currency: brand.currency || "INR",
    metaStatus: brand.metaStatus || "not_connected",
    metaAccountId: brand.metaAccountId || "",
    targetCpa: brand.targetCpa ?? 250,
    breakEvenCpa: brand.breakEvenCpa ?? 450,
    targetRoas: brand.targetRoas ?? 3.0,
    averageOrderValue: brand.averageOrderValue ?? 999,
    cogsPercentage: brand.cogsPercentage ?? 30,
    rtoRate: brand.rtoRate ?? 20,
    planName: brand.planName || "trial",
    planStatus: brand.planStatus || "trial",
    trialEndsAt: brand.trialEndsAt ? new Date(brand.trialEndsAt).toISOString() : null,
    lastSyncAt: brand.lastSyncAt ? new Date(brand.lastSyncAt).toISOString() : null,
  };

  const recentOrders = orders.slice(0, 8).map((o: any) => ({
    id: o._id.toString(),
    orderNumber: o.orderNumber || "Order",
    customer: o.customer?.firstName
      ? `${o.customer.firstName} ${o.customer.lastName || ""}`.trim()
      : "Customer",
    city: o.shippingAddress?.city || "India",
    total: o.total || 0,
    paymentStatus: o.financialStatus || "pending",
    date: o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-IN") : "",
  }));

  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#6d7175]">Loading your store metrics...</div>}>
      <ShopifyAppClient
        brand={serializedBrand}
        host={hostParam}
        shop={cleanShop || brand.shopifyStoreUrl}
        range={rangeParam}
        billingSuccess={searchParams.billing_success === "true"}
        stats={{
          totalSales,
          totalOrders,
          paidOrders,
          partialPaidOrders,
          codOrders,
          baseSpend,
          spendWithGst,
          blendedRoas,
          activeCampaignsCount: activeCampaigns.length,
          totalDailyBudget,
          totalDailyBudgetWithGst,
        }}
        campaigns={campaigns.map((c: any) => ({
          id: c._id.toString(),
          name: c.name,
          status: c.status || "PAUSED",
          objective: c.objective || "",
          thumbnailUrl: c.thumbnailUrl || "",
          spend: c.spend || 0,
          spendWithGst: Math.round((c.spend || 0) * 1.18),
          dailyBudget: c.dailyBudget || 0,
          dailyBudgetWithGst: Math.round((c.dailyBudget || 0) * 1.18),
          purchases: c.purchases || 0,
          roas: c.roas || 0,
          cpa: c.cpa || 0,
          clicks: c.clicks || 0,
          ctr: c.ctr || 0,
        }))}
        recentOrders={recentOrders}
      />
    </Suspense>
  );
}
