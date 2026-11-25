import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook } from "@/lib/verify-webhook";
import dbConnect from "@/lib/mongodb";
import Brand from "@/models/Brand";
import Order from "@/models/Order";
import DailyMetric from "@/models/DailyMetric";
import { formatLocalDate } from "@/lib/date-filters";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const hmac = req.headers.get("x-shopify-hmac-sha256");
    const topic = req.headers.get("x-shopify-topic") || "";
    const rawShop = req.headers.get("x-shopify-shop-domain") || "";

    if (!verifyShopifyWebhook(rawBody, hmac)) {
      return NextResponse.json({ error: "Invalid HMAC signature" }, { status: 401 });
    }

    await dbConnect();
    const cleanShop = rawShop
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .trim()
      .toLowerCase();

    const brand = await Brand.findOne({
      $or: [
        { shopifyStoreUrl: new RegExp(cleanShop, "i") },
        { shopifyDomains: cleanShop },
      ],
    });

    if (!brand) {
      return NextResponse.json({ message: "Store not found" }, { status: 200 });
    }

    const data = JSON.parse(rawBody);

    if (topic === "orders/create" || topic === "orders/updated" || topic === "orders/cancelled") {
      const customer = data.customer || {};
      const customerName =
        `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
        customer.email ||
        "Guest Customer";
      const lineItems = (data.line_items || []).map((li: any) => ({
        title: li.title || "",
        quantity: li.quantity || 1,
        price: parseFloat(li.price || 0),
        sku: li.sku || "",
      }));

      const orderDate = data.created_at ? new Date(data.created_at) : new Date();

      const attrs = data.note_attributes || [];
      let utmSource = (attrs.find((a: any) => a.name === "utm_source")?.value || "").toLowerCase();
      let utmMedium = (attrs.find((a: any) => a.name === "utm_medium")?.value || "").toLowerCase();
      let utmCampaign = attrs.find((a: any) => a.name === "utm_campaign")?.value || "";
      const fullUrl = (attrs.find((a: any) => a.name === "full_url")?.value || "").toLowerCase();

      const isPaid =
        utmMedium.includes("paid") ||
        utmMedium.includes("cpc") ||
        fullUrl.includes("fbclid") ||
        utmSource.includes("facebook") ||
        utmSource.includes("fb") ||
        utmSource.includes("meta");

      await Order.findOneAndUpdate(
        { brandId: brand._id, externalId: String(data.id) },
        {
          brandId: brand._id,
          externalId: String(data.id),
          orderNumber: data.name || (data.order_number ? `#${data.order_number}` : `#${data.id}`),
          orderDate,
          customerName,
          customerEmail: customer.email || "",
          customerId: String(customer.id || ""),
          total: parseFloat(data.total_price || 0),
          subtotal: parseFloat(data.subtotal_price || data.total_price || 0),
          currency: data.currency || brand.currency || "INR",
          financialStatus: data.financial_status || "paid",
          fulfillmentStatus: data.fulfillment_status || "unfulfilled",
          itemCount: lineItems.reduce((acc: number, l: any) => acc + l.quantity, 0),
          cancelledAt: data.cancelled_at ? new Date(data.cancelled_at) : null,
          cancelReason: data.cancel_reason || "",
          sourceType: isPaid ? "paid" : "organic",
          utmSource,
          utmCampaign,
          utmMedium,
          lineItems,
        },
        { upsert: true }
      );

      // Update DailyMetric sales & orders for that IST date
      const istDateStr = formatLocalDate(orderDate);
      const dayStart = new Date(`${istDateStr}T00:00:00+05:30`);
      const dayEnd = new Date(`${istDateStr}T23:59:59.999+05:30`);
      const dayOrders = await Order.find({
        brandId: brand._id,
        cancelledAt: null,
        orderDate: { $gte: dayStart, $lte: dayEnd },
      })
        .select("total")
        .lean();

      const daySales = dayOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);
      await DailyMetric.findOneAndUpdate(
        { brandId: brand._id, date: istDateStr },
        { $set: { sales: daySales, orders: dayOrders.length } },
        { upsert: true }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Shopify App Orders Webhook Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
