import dbConnect from "@/lib/mongodb";
import Brand from "@/models/Brand";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Campaign from "@/models/Campaign";
import DailyMetric from "@/models/DailyMetric";

const SHOPIFY_API_VERSION = "2024-07";
const META_GRAPH_VERSION = "v20.0";

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(d));
}

/**
 * Sync all products from Shopify Admin API
 */
export async function syncShopifyProducts(brandId: string) {
  await dbConnect();
  const brand = await Brand.findById(brandId);
  if (!brand) throw new Error("Brand not found");
  if (!brand.shopifyStoreUrl || !brand.shopifyAccessToken) {
    await Brand.findByIdAndUpdate(brandId, { shopifyStatus: "not_connected", shopifyError: "" });
    return { success: false, count: 0, message: "Shopify store domain or access token missing" };
  }

  const cleanStore = brand.shopifyStoreUrl
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim();

  let nextUrl: string | null = `https://${cleanStore}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`;
  let count = 0;
  let page = 0;

  try {
    while (nextUrl && page < 20) {
      page++;
      const response: any = await fetch(nextUrl, {
        headers: {
          "X-Shopify-Access-Token": brand.shopifyAccessToken,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errMsg = `Shopify API error (${response.status}): ${errorText}`;
        await Brand.findByIdAndUpdate(brand._id, { shopifyStatus: "failed", shopifyError: errMsg });
        throw new Error(errMsg);
      }

      const data: any = await response.json();
      const products = data.products || [];
      if (products.length === 0) break;

      const bulkOps = products.map((item: any) => {
        const variant = item.variants && item.variants[0] ? item.variants[0] : {};
        const imgUrl = item.image?.src || (item.images && item.images[0]?.src) || "";
        return {
          updateOne: {
            filter: { brandId: brand._id, externalId: String(item.id) },
            update: {
              $set: {
                brandId: brand._id,
                externalId: String(item.id),
                title: item.title || "Untitled Product",
                sku: variant.sku || "",
                price: parseFloat(variant.price || 0),
                inventoryQuantity: parseInt(variant.inventory_quantity || 0, 10),
                status: item.status || "active",
                imageUrl: imgUrl,
              },
            },
            upsert: true,
          },
        };
      });

      if (bulkOps.length > 0) {
        await Product.bulkWrite(bulkOps);
      }
      count += products.length;

      // Check Shopify cursor pagination
      const linkHeader: string | null = response.headers?.get("link") || null;
      nextUrl = null;
      if (linkHeader) {
        const match: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel=["']?next["']?/i);
        if (match) {
          nextUrl = match[1];
        }
      }
    }

    await Brand.findByIdAndUpdate(brand._id, {
      shopifyStatus: "connected",
      shopifyError: "",
      lastSyncAt: new Date(),
    });
    return { success: true, count, message: `Successfully synced ${count} products` };
  } catch (err: any) {
    await Brand.findByIdAndUpdate(brand._id, {
      shopifyStatus: "failed",
      shopifyError: err.message,
    });
    throw err;
  }
}

/**
 * Sync all orders from Shopify Admin API with full cursor pagination (Link header)
 */
export async function syncShopifyOrders(brandId: string, days = 0) {
  await dbConnect();
  const brand = await Brand.findById(brandId);
  if (!brand) throw new Error("Brand not found");
  if (!brand.shopifyStoreUrl || !brand.shopifyAccessToken) {
    await Brand.findByIdAndUpdate(brandId, { shopifyStatus: "not_connected", shopifyError: "" });
    return { success: false, count: 0, message: "Shopify store domain or access token missing" };
  }

  const cleanStore = brand.shopifyStoreUrl
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim();

  let sinceIso = "";
  if (days > 0) {
    const past = new Date();
    past.setDate(past.getDate() - days);
    sinceIso = `&created_at_min=${past.toISOString()}`;
  }

  let nextUrl: string | null = `https://${cleanStore}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&limit=250${sinceIso}`;
  let count = 0;
  let page = 0;
  const maxPages = 50; // Safety cap: 50 * 250 = 12,500 orders

  try {
    while (nextUrl && page < maxPages) {
      page++;
      const response: any = await fetch(nextUrl, {
        headers: {
          "X-Shopify-Access-Token": brand.shopifyAccessToken,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errMsg = `Shopify API error (${response.status}): ${errorText}`;
        await Brand.findByIdAndUpdate(brand._id, { shopifyStatus: "failed", shopifyError: errMsg });
        throw new Error(errMsg);
      }

      const data: any = await response.json();
      const orders = data.orders || [];
      if (orders.length === 0) break;

      const bulkOps = orders.map((item: any) => {
        const customer = item.customer || {};
        const customerName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || customer.email || "Guest Customer";
        const lineItems = (item.line_items || []).map((li: any) => ({
          title: li.title || "",
          quantity: li.quantity || 1,
          price: parseFloat(li.price || 0),
          sku: li.sku || "",
        }));
        const orderDate = item.created_at ? new Date(item.created_at) : new Date();

        // GoKwik / Shopify UTM Attribution Detection
        const attrs = item.note_attributes || [];
        let utmSource = (attrs.find((a: any) => a.name === "utm_source")?.value || "").toLowerCase();
        let utmMedium = (attrs.find((a: any) => a.name === "utm_medium")?.value || "").toLowerCase();
        let utmCampaign = (attrs.find((a: any) => a.name === "utm_campaign")?.value || "");
        const fullUrl = (attrs.find((a: any) => a.name === "full_url")?.value || "").toLowerCase();
        const refSite = (item.referring_site || "").toLowerCase();

        // Fallback: extract UTMs from full_url if missing from note_attributes
        if (fullUrl && (!utmSource || !utmMedium || !utmCampaign)) {
          try {
            const parsedUrl = new URL(fullUrl.startsWith("http") ? fullUrl : `https://${fullUrl}`);
            if (!utmSource) utmSource = (parsedUrl.searchParams.get("utm_source") || "").toLowerCase();
            if (!utmMedium) utmMedium = (parsedUrl.searchParams.get("utm_medium") || "").toLowerCase();
            if (!utmCampaign) utmCampaign = parsedUrl.searchParams.get("utm_campaign") || "";
          } catch {
            if (!utmSource) {
              const m = fullUrl.match(/[?&]utm_source=([^&]+)/i);
              if (m) utmSource = decodeURIComponent(m[1]).toLowerCase();
            }
            if (!utmMedium) {
              const m = fullUrl.match(/[?&]utm_medium=([^&]+)/i);
              if (m) utmMedium = decodeURIComponent(m[1]).toLowerCase();
            }
            if (!utmCampaign) {
              const m = fullUrl.match(/[?&]utm_campaign=([^&]+)/i);
              if (m) utmCampaign = decodeURIComponent(m[1]);
            }
          }
        }

        const isInstagramOrganic = (utmSource === "ig" || utmSource.startsWith("ig_") || utmSource.includes("instagram")) &&
          (utmMedium.includes("social") || utmMedium.includes("bio") || utmMedium === "" || (!utmMedium.includes("paid") && !utmMedium.includes("cpc")));

        const isPaid = (
          utmMedium.includes("paid") ||
          utmMedium.includes("cpc") ||
          fullUrl.includes("fbclid") ||
          fullUrl.includes("gclid") ||
          (utmSource.includes("facebook") && !utmMedium.includes("social")) ||
          (utmSource.includes("fb") && !utmMedium.includes("social")) ||
          (utmSource.includes("meta") && !utmMedium.includes("social")) ||
          ((utmSource === "ig" || utmSource.includes("instagram")) && !isInstagramOrganic)
        );

        const sourceType = isPaid ? "paid" : "organic";

        return {
          updateOne: {
            filter: { brandId: brand._id, externalId: String(item.id) },
            update: {
              $set: {
                brandId: brand._id,
                externalId: String(item.id),
                orderNumber: item.name || (item.order_number ? `#${item.order_number}` : `#${item.id}`),
                orderDate,
                customerName,
                customerEmail: customer.email || "",
                customerId: String(customer.id || ""),
                total: parseFloat(item.total_price || 0),
                subtotal: parseFloat(item.subtotal_price || item.total_price || 0),
                currency: item.currency || brand.currency || "INR",
                financialStatus: item.financial_status || "paid",
                fulfillmentStatus: item.fulfillment_status || "unfulfilled",
                itemCount: lineItems.reduce((acc: number, l: any) => acc + l.quantity, 0),
                cancelledAt: item.cancelled_at ? new Date(item.cancelled_at) : null,
                cancelReason: item.cancel_reason || "",
                sourceType,
                utmSource,
                utmCampaign,
                utmMedium,
                lineItems,
              },
            },
            upsert: true,
          },
        };
      });

      if (bulkOps.length > 0) {
        await Order.bulkWrite(bulkOps);
      }
      count += orders.length;

      // Check Shopify Link header for cursor pagination
      const linkHeader: string | null = response.headers?.get("link") || null;
      nextUrl = null;
      if (linkHeader) {
        const match: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel=["']?next["']?/i);
        if (match) {
          nextUrl = match[1];
        }
      }
    }

    // Recalculate brand overall sales and order totals (excluding cancelled orders)
    const allOrders = await Order.find({ brandId: brand._id, cancelledAt: null });
    const totalSales = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = allOrders.length;

    // Aggregate into DailyMetric with Organic vs Paid breakdown
    const dailyOrdersMap: Record<string, { sales: number; count: number; paidSales: number; paidOrders: number; organicSales: number; organicOrders: number }> = {};
    for (const o of allOrders) {
      const dateStr = formatDate(o.orderDate);
      if (!dailyOrdersMap[dateStr]) {
        dailyOrdersMap[dateStr] = { sales: 0, count: 0, paidSales: 0, paidOrders: 0, organicSales: 0, organicOrders: 0 };
      }
      const val = o.total || 0;
      dailyOrdersMap[dateStr].sales += val;
      dailyOrdersMap[dateStr].count += 1;
      if (o.sourceType === "paid") {
        dailyOrdersMap[dateStr].paidSales += val;
        dailyOrdersMap[dateStr].paidOrders += 1;
      } else {
        dailyOrdersMap[dateStr].organicSales += val;
        dailyOrdersMap[dateStr].organicOrders += 1;
      }
    }

    const dailyMetricBulk = Object.entries(dailyOrdersMap).map(([dateStr, agg]) => ({
      updateOne: {
        filter: { brandId: brand._id, date: dateStr },
        update: {
          $set: {
            brandId: brand._id,
            date: dateStr,
            sales: agg.sales,
            orders: agg.count,
            paidSales: agg.paidSales,
            paidOrders: agg.paidOrders,
            organicSales: agg.organicSales,
            organicOrders: agg.organicOrders,
          },
        },
        upsert: true,
      },
    }));

    if (dailyMetricBulk.length > 0) {
      await DailyMetric.bulkWrite(dailyMetricBulk);
    }

    await Brand.findByIdAndUpdate(brand._id, {
      totalSales,
      totalOrders,
      shopifyStatus: "connected",
      shopifyError: "",
      lastSyncAt: new Date(),
    });

    return { success: true, count, totalOrders, totalSales, message: `Successfully synced ${count} orders across ${page} page(s). Total store orders in DB: ${totalOrders}` };
  } catch (err: any) {
    await Brand.findByIdAndUpdate(brand._id, {
      shopifyStatus: "failed",
      shopifyError: err.message,
    });
    throw err;
  }
}

/**
 * Register Shopify Webhooks so orders/products trigger real-time updates
 */
export async function registerShopifyWebhooks(brandId: string, customPublicUrl?: string) {
  await dbConnect();
  const brand = await Brand.findById(brandId);
  if (!brand) throw new Error("Brand not found");
  if (!brand.shopifyStoreUrl || !brand.shopifyAccessToken) {
    await Brand.findByIdAndUpdate(brandId, { webhookStatus: "not_configured", webhookError: "", webhookRegistered: false });
    return { success: false, message: "Shopify store credentials missing" };
  }

  const cleanStore = brand.shopifyStoreUrl
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim();

  const publicUrl = (
    customPublicUrl ||
    process.env.PUBLIC_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://api-brands.tameta.tech"
  ).replace(/\/$/, "");

  const webhookEndpoint = `${publicUrl}/api/webhooks/shopify`;
  const topics = ["orders/create", "orders/updated", "products/create", "products/update"];
  const registered: string[] = [];
  const errors: string[] = [];

  for (const topic of topics) {
    try {
      const resp = await fetch(`https://${cleanStore}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": brand.shopifyAccessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhook: {
            topic,
            address: webhookEndpoint,
            format: "json",
          },
        }),
      });

      if (resp.status === 200 || resp.status === 201 || resp.status === 422) {
        registered.push(topic);
      } else {
        const errorText = await resp.text();
        errors.push(`${topic} (HTTP ${resp.status}): ${errorText}`);
      }
    } catch (err: any) {
      console.warn(`Webhook register error for ${topic}:`, err);
      errors.push(`${topic}: ${err.message}`);
    }
  }

  if (registered.length > 0) {
    await Brand.findByIdAndUpdate(brand._id, {
      webhookRegistered: true,
      webhookStatus: "live",
      webhookError: errors.length > 0 ? `Partial webhook registration issues: ${errors.join("; ")}` : "",
    });
    return {
      success: true,
      webhookEndpoint,
      registeredTopics: registered,
      message: `Registered webhooks: ${registered.join(", ")} at ${webhookEndpoint}`,
    };
  } else {
    const errorMsg = errors.length > 0 ? errors.join("; ") : "Shopify webhook registration failed";
    await Brand.findByIdAndUpdate(brand._id, {
      webhookRegistered: false,
      webhookStatus: "failed",
      webhookError: errorMsg,
    });
    return {
      success: false,
      message: errorMsg,
    };
  }
}

/**
 * Sync Meta Ads Campaigns, Creative Thumbnails, and Daily Insights
 */
export async function syncMetaAds(brandId: string, days = 30) {
  await dbConnect();
  const brand = await Brand.findById(brandId);
  if (!brand) throw new Error("Brand not found");
  if (!brand.metaAccountId || !brand.metaAccessToken) {
    await Brand.findByIdAndUpdate(brandId, { metaStatus: "not_connected", metaError: "" });
    return { success: false, count: 0, message: "Meta Ad Account ID or Access Token missing" };
  }

  const cleanAccId = brand.metaAccountId.startsWith("act_")
    ? brand.metaAccountId
    : `act_${brand.metaAccountId}`;

  const token = brand.metaAccessToken;

  try {
    // 1. Fetch campaigns with embedded lifetime insights
    const campUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${cleanAccId}/campaigns?fields=id,name,status,effective_status,objective,daily_budget,lifetime_budget,created_time,updated_time,start_time,stop_time,insights.date_preset(maximum){spend,impressions,clicks,reach,actions,action_values}&limit=100&access_token=${token}`;
    const campRes = await fetch(campUrl, { cache: "no-store" });
    if (!campRes.ok) {
      const errorText = await campRes.text();
      let parsed = errorText;
      try {
        const json = JSON.parse(errorText);
        if (json.error?.message) {
          parsed = `Meta API error (${campRes.status}): ${json.error.message}`;
        }
      } catch { }
      await Brand.findByIdAndUpdate(brand._id, { metaStatus: "failed", metaError: parsed });
      throw new Error(parsed);
    }
    const campData = await campRes.json();
    const campaigns = campData.data || [];

    // 2. Fetch ad creatives to obtain high-res image or thumbnail previews
    const adsUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${cleanAccId}/ads?fields=id,name,campaign_id,creative{id,thumbnail_url,image_url}&limit=100&access_token=${token}`;
    let campaignThumbs: Record<string, string> = {};
    try {
      const adsRes = await fetch(adsUrl, { cache: "no-store" });
      if (adsRes.ok) {
        const adsData = await adsRes.json();
        for (const ad of adsData.data || []) {
          if (ad.campaign_id && ad.creative) {
            const thumb = ad.creative.image_url || ad.creative.thumbnail_url || "";
            if (thumb && !campaignThumbs[ad.campaign_id]) {
              campaignThumbs[ad.campaign_id] = thumb;
            }
          }
        }
      }
    } catch (err) {
      console.warn("Failed fetching Meta ad creatives:", err);
    }

    // 3. Fetch exact daily insights at account level (100% accurate, no missing days)
    const endDate = new Date();
    const untilStr = formatDate(endDate);
    const effectiveDays = days > 0 ? days : 60;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - effectiveDays);
    const sinceStr = formatDate(startDate);

    let accountInsightsUrl: string | null = `https://graph.facebook.com/${META_GRAPH_VERSION}/${cleanAccId}/insights?level=account&time_increment=1&time_range={"since":"${sinceStr}","until":"${untilStr}"}&limit=300&fields=spend,impressions,clicks,reach,actions,action_values,date_start,date_stop&access_token=${token}`;

    let dailyInsightsList: any[] = [];
    let insPages = 0;
    while (accountInsightsUrl && insPages < 10) {
      insPages++;
      try {
        const insRes: any = await fetch(accountInsightsUrl, { cache: "no-store" });
        if (insRes.ok) {
          const insData: any = await insRes.json();
          dailyInsightsList.push(...(insData.data || []));
          accountInsightsUrl = insData.paging?.next || null;
        } else {
          accountInsightsUrl = null;
        }
      } catch (err) {
        console.warn("Failed fetching Meta account insights:", err);
        break;
      }
    }

    // 3b. Dedicated real-time intraday spend for TODAY (Meta date_preset=today guarantees live intraday spend)
    try {
      const todayUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${cleanAccId}/insights?level=account&date_preset=today&fields=spend,impressions,clicks,reach,actions,action_values,date_start,date_stop&access_token=${token}`;
      const todayRes: any = await fetch(todayUrl, { cache: "no-store" });
      if (todayRes.ok) {
        const todayData: any = await todayRes.json();
        if (todayData.data && Array.isArray(todayData.data)) {
          dailyInsightsList.push(...todayData.data);
        }
      }
    } catch (err) {
      console.warn("Failed fetching Meta today insights:", err);
    }

    // Upsert campaigns
    let activeCount = 0;
    let totalMetaSpend = 0;
    const campaignBulkOps = [];

    for (const c of campaigns) {
      const ins = c.insights && c.insights.data && c.insights.data[0];
      const sp = ins ? parseFloat(ins.spend || 0) : 0;
      const imp = ins ? parseInt(ins.impressions || 0, 10) : 0;
      const clk = ins ? parseInt(ins.clicks || 0, 10) : 0;
      const reach = ins ? parseInt(ins.reach || 0, 10) : 0;

      let pVal = 0;
      let purchases = 0;
      let checkouts = 0;

      if (ins && ins.actions && Array.isArray(ins.actions)) {
        const pAct = ins.actions.find((a: any) => a.action_type === "omni_purchase" || a.action_type === "purchase");
        if (pAct) purchases = parseInt(pAct.value || 0, 10);

        const cAct = ins.actions.find((a: any) =>
          a.action_type === "initiate_checkout" ||
          a.action_type === "omni_initiated_checkout" ||
          a.action_type === "offsite_conversion.fb_pixel_initiate_checkout"
        );
        if (cAct) checkouts = parseInt(cAct.value || 0, 10);
      }

      if (ins && ins.action_values && Array.isArray(ins.action_values)) {
        const omni = ins.action_values.find((av: any) => av.action_type === "omni_purchase");
        const standard = ins.action_values.find((av: any) => av.action_type === "purchase");
        pVal = omni ? parseFloat(omni.value || 0) : standard ? parseFloat(standard.value || 0) : 0;
      }

      const spendWithGst = Math.round(sp * 1.18);
      const roas = spendWithGst > 0 ? parseFloat((pVal / spendWithGst).toFixed(2)) : 0;
      const cpa = purchases > 0 ? Math.round(spendWithGst / purchases) : 0;
      const cpc = clk > 0 ? parseFloat((sp / clk).toFixed(2)) : 0;
      const ctr = imp > 0 ? parseFloat(((clk / imp) * 100).toFixed(2)) : 0;
      const cpm = imp > 0 ? parseFloat(((sp / imp) * 1000).toFixed(2)) : 0;
      const costPerCheckout = checkouts > 0 ? Math.round(spendWithGst / checkouts) : 0;
      const checkoutRate = clk > 0 ? parseFloat(((checkouts / clk) * 100).toFixed(2)) : 0;
      const purchaseFromCheckoutRate = checkouts > 0 ? parseFloat(((purchases / checkouts) * 100).toFixed(2)) : 0;

      const thumb = campaignThumbs[c.id] || "";
      const isLive = c.effective_status === "ACTIVE" || c.status === "ACTIVE";

      if (isLive) activeCount++;
      totalMetaSpend += sp;

      campaignBulkOps.push({
        updateOne: {
          filter: { brandId: brand._id, externalId: c.id },
          update: {
            brandId: brand._id,
            metaAccountId: cleanAccId,
            externalId: c.id,
            name: c.name || "Unnamed Campaign",
            status: isLive ? "ACTIVE" : "PAUSED",
            objective: c.objective || "OUTCOME_SALES",
            dailyBudget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : 0,
            lifetimeBudget: c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : 0,
            thumbnailUrl: thumb,
            spend: sp,
            impressions: imp,
            clicks: clk,
            reach,
            purchaseValue: pVal,
            roas,
            purchases,
            cpa,
            cpc,
            ctr,
            cpm,
            checkouts,
            costPerCheckout,
            checkoutRate,
            purchaseFromCheckoutRate,
            createdTime: c.created_time ? new Date(c.created_time) : undefined,
            updatedTime: c.updated_time ? new Date(c.updated_time) : undefined,
            startTime: c.start_time ? new Date(c.start_time) : undefined,
            stopTime: c.stop_time ? new Date(c.stop_time) : undefined,
            lastUpdateDetails: (c.daily_budget && parseFloat(c.daily_budget) > 0)
              ? `Budget: ₹${(parseFloat(c.daily_budget) / 100).toLocaleString('en-IN')}/day`
              : (c.name?.toLowerCase().includes('broad') || c.name?.toLowerCase().includes('target')
                ? "Audience & Targeting"
                : (c.name?.toLowerCase().includes('creative') || c.name?.toLowerCase().includes('ad')
                  ? "Creative & Ad Visual"
                  : "Settings & Delivery")),
          },
          upsert: true,
        },
      });
    }

    if (campaignBulkOps.length > 0) {
      await Campaign.bulkWrite(campaignBulkOps);
    }

    // Build daily spend map from account-level data (deduplicate multiple rows for same day)
    const dailySpendMap: Record<string, { spend: number; impressions: number; clicks: number; reach: number; metaPurchaseValue: number }> = {};
    for (const ins of dailyInsightsList) {
      const dayStr = ins.date_start;
      const sp = parseFloat(ins.spend || 0);
      const imp = parseInt(ins.impressions || 0, 10);
      const clk = parseInt(ins.clicks || 0, 10);
      const rch = parseInt(ins.reach || 0, 10);
      let pVal = 0;
      if (ins.action_values && Array.isArray(ins.action_values)) {
        for (const av of ins.action_values) {
          if (av.action_type === "omni_purchase" || av.action_type === "purchase") {
            pVal += parseFloat(av.value || 0);
          }
        }
      }
      if (!dailySpendMap[dayStr]) {
        dailySpendMap[dayStr] = { spend: sp, impressions: imp, clicks: clk, reach: rch, metaPurchaseValue: pVal };
      } else {
        dailySpendMap[dayStr].spend = Math.max(dailySpendMap[dayStr].spend, sp);
        dailySpendMap[dayStr].impressions = Math.max(dailySpendMap[dayStr].impressions, imp);
        dailySpendMap[dayStr].clicks = Math.max(dailySpendMap[dayStr].clicks, clk);
        dailySpendMap[dayStr].reach = Math.max(dailySpendMap[dayStr].reach, rch);
        dailySpendMap[dayStr].metaPurchaseValue = Math.max(dailySpendMap[dayStr].metaPurchaseValue, pVal);
      }
    }

    // Check existing DailyMetric entries to preserve historical spend during account transitions
    const existingMetrics = await DailyMetric.find({
      brandId: brand._id,
      date: { $in: Object.keys(dailySpendMap) },
    }).lean();
    const existingMetricMap = new Map(existingMetrics.map((m: any) => [m.date, m]));

    // Upsert daily spend metrics safely
    const dailySpendBulk = Object.entries(dailySpendMap).map(([dayStr, d]) => {
      const existing = existingMetricMap.get(dayStr);
      const safeSpend = existing && existing.spend > d.spend ? existing.spend : d.spend;
      const safeImpressions = existing && existing.impressions > d.impressions ? existing.impressions : d.impressions;
      const safeClicks = existing && existing.clicks > d.clicks ? existing.clicks : d.clicks;
      const safeReach = existing && existing.reach > d.reach ? existing.reach : d.reach;
      const safeMetaPurchaseVal = existing && (existing.metaPurchaseValue || 0) > d.metaPurchaseValue ? existing.metaPurchaseValue : d.metaPurchaseValue;

      return {
        updateOne: {
          filter: { brandId: brand._id, date: dayStr },
          update: {
            $set: {
              brandId: brand._id,
              date: dayStr,
              spend: safeSpend,
              impressions: safeImpressions,
              clicks: safeClicks,
              reach: safeReach,
              metaPurchaseValue: safeMetaPurchaseVal,
            },
          },
          upsert: true,
        },
      };
    });

    if (dailySpendBulk.length > 0) {
      await DailyMetric.bulkWrite(dailySpendBulk);
    }

    // Sum exact total spend from daily insights if available
    const exactTotalSpend = Object.keys(dailySpendMap).length > 0
      ? Object.values(dailySpendMap).reduce((sum: number, d: any) => sum + (d.spend || 0), 0)
      : totalMetaSpend;

    // Recalculate true cumulative spend (retaining old banned account history + new account)
    const allMetrics = await DailyMetric.find({ brandId: brand._id }).lean();
    const metricSpendSum = allMetrics.reduce((sum: number, m: any) => sum + (m.spend || 0), 0);
    const allCampaigns = await Campaign.find({ brandId: brand._id }).lean();
    const campaignSpendSum = allCampaigns.reduce((sum: number, c: any) => sum + (c.spend || 0), 0);
    const cumulativeTotalSpend = Math.max(metricSpendSum, campaignSpendSum, exactTotalSpend, brand.totalSpend || 0);
    const cumulativeTotalSpendGst = Math.round(cumulativeTotalSpend * 1.18);

    await Brand.findByIdAndUpdate(brand._id, {
      totalSpend: cumulativeTotalSpend,
      totalSpendWithGst: cumulativeTotalSpendGst,
      activeCampaigns: activeCount,
      metaStatus: "connected",
      metaError: "",
      lastSyncAt: new Date(),
    });

    return {
      success: true,
      campaignsCount: campaigns.length,
      activeCampaigns: activeCount,
      totalSpend: exactTotalSpend,
      message: `Successfully synced ${campaigns.length} campaigns (${activeCount} active). Total spend: ₹${exactTotalSpend.toLocaleString()}`,
    };
  } catch (err: any) {
    await Brand.findByIdAndUpdate(brand._id, {
      metaStatus: "failed",
      metaError: err.message,
    });
    throw err;
  }
}

/**
 * Sync everything for a brand in one go (supports days = 0 for full lifetime history)
 */
export async function syncAllBrandData(brandId: string, days = 0) {
  const prodRes = await syncShopifyProducts(brandId).catch(e => ({ success: false, message: e.message }));
  const ordRes = await syncShopifyOrders(brandId, days).catch(e => ({ success: false, message: e.message }));
  const metaRes = await syncMetaAds(brandId, days).catch(e => ({ success: false, message: e.message }));
  const hookRes = await registerShopifyWebhooks(brandId).catch(e => ({ success: false, message: e.message }));

  return {
    products: prodRes,
    orders: ordRes,
    meta: metaRes,
    webhooks: hookRes,
  };
}

/**
 * Verify real-time connection status for Shopify, Webhooks, and Meta Ads
 */
export async function verifyBrandConnections(brandIdOrData: string | any) {
  await dbConnect();
  let brandData: any;
  let brandDocId: string | null = null;

  if (typeof brandIdOrData === "string") {
    const brand = await Brand.findById(brandIdOrData);
    if (!brand) throw new Error("Brand not found");
    brandData = brand.toObject ? brand.toObject() : brand;
    brandDocId = String(brand._id);
  } else {
    brandData = brandIdOrData;
    if (brandData._id) brandDocId = String(brandData._id);
  }

  const results: {
    shopify: { status: "connected" | "failed" | "not_connected"; message: string; shopName?: string };
    meta: { status: "connected" | "failed" | "not_connected"; message: string; accountName?: string };
    webhook: { status: "live" | "failed" | "not_configured"; message: string; count?: number };
  } = {
    shopify: { status: "not_connected", message: "" },
    meta: { status: "not_connected", message: "" },
    webhook: { status: "not_configured", message: "" },
  };

  // 1. Verify Shopify
  if (brandData.shopifyStoreUrl && brandData.shopifyAccessToken) {
    try {
      const cleanStore = brandData.shopifyStoreUrl.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim();
      const shopRes = await fetch(`https://${cleanStore}/admin/api/${SHOPIFY_API_VERSION}/shop.json`, {
        headers: { "X-Shopify-Access-Token": brandData.shopifyAccessToken },
        cache: "no-store",
      });
      if (shopRes.ok) {
        const data = await shopRes.json();
        results.shopify = {
          status: "connected",
          message: `Connected to Shopify Store: ${data.shop?.name || cleanStore}`,
          shopName: data.shop?.name,
        };
      } else {
        const errorText = await shopRes.text();
        results.shopify = {
          status: "failed",
          message: `Shopify HTTP ${shopRes.status}: ${errorText}`,
        };
      }
    } catch (err: any) {
      results.shopify = { status: "failed", message: `Shopify connection error: ${err.message}` };
    }
  }

  // 2. Verify Webhooks
  if (brandData.shopifyStoreUrl && brandData.shopifyAccessToken) {
    try {
      const cleanStore = brandData.shopifyStoreUrl.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim();
      const whRes = await fetch(`https://${cleanStore}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`, {
        headers: { "X-Shopify-Access-Token": brandData.shopifyAccessToken },
        cache: "no-store",
      });
      if (whRes.ok) {
        const data = await whRes.json();
        const hooks = data.webhooks || [];
        results.webhook = {
          status: hooks.length > 0 ? "live" : "not_configured",
          message: hooks.length > 0 ? `${hooks.length} webhooks active on Shopify` : "No webhooks registered yet on store",
          count: hooks.length,
        };
      } else {
        const errorText = await whRes.text();
        results.webhook = {
          status: "failed",
          message: `Shopify Webhooks check failed (HTTP ${whRes.status}): ${errorText}`,
        };
      }
    } catch (err: any) {
      results.webhook = { status: "failed", message: `Webhook check error: ${err.message}` };
    }
  }

  // 3. Verify Meta Ads
  if (brandData.metaAccountId && brandData.metaAccessToken) {
    try {
      const cleanAcc = brandData.metaAccountId.startsWith("act_")
        ? brandData.metaAccountId
        : `act_${brandData.metaAccountId}`;
      const metaRes = await fetch(
        `https://graph.facebook.com/${META_GRAPH_VERSION}/${cleanAcc}?fields=name,account_status,disable_reason,currency&access_token=${brandData.metaAccessToken}`,
        { cache: "no-store" }
      );
      if (metaRes.ok) {
        const data = await metaRes.json();
        const accStatus = data.account_status;
        const disReason = data.disable_reason;
        if (accStatus === 2) {
          const reasonStr = disReason === 1 ? "Policy Violation (ADS_INTEGRITY_POLICY)" : `Reason #${disReason}`;
          results.meta = {
            status: "failed",
            message: `Meta Ad Account '${data.name}' is DISABLED by Meta (${reasonStr}). Ad delivery is stopped.`,
            accountName: data.name,
          };
        } else {
          results.meta = {
            status: "connected",
            message: `Connected to Meta Ad Account: ${data.name || cleanAcc} (Status: Active)`,
            accountName: data.name,
          };
        }
      } else {
        const errorText = await metaRes.text();
        let parsed = errorText;
        try {
          const json = JSON.parse(errorText);
          if (json.error?.message) {
            parsed = `Meta API error (${metaRes.status}): ${json.error.message}`;
          }
        } catch { }
        results.meta = {
          status: "failed",
          message: parsed,
        };
      }
    } catch (err: any) {
      results.meta = { status: "failed", message: `Meta connection error: ${err.message}` };
    }
  }

  // Persist if brand ID exists in DB
  if (brandDocId) {
    await Brand.findByIdAndUpdate(brandDocId, {
      shopifyStatus: results.shopify.status,
      shopifyError: results.shopify.status === "failed" ? results.shopify.message : "",
      metaStatus: results.meta.status,
      metaError: results.meta.status === "failed" ? results.meta.message : "",
      webhookStatus: results.webhook.status,
      webhookError: results.webhook.status === "failed" ? results.webhook.message : "",
      webhookRegistered: results.webhook.status === "live",
    });
  }

  return results;
}
