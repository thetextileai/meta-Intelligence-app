import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Campaign from "@/models/Campaign";
import Brand from "@/models/Brand";
import Product from "@/models/Product";

export interface HorizonMetrics {
  spend: number;
  spendWithGst: number;
  impressions: number;
  clicks: number;
  reach: number;
  frequency: number;
  purchases: number;
  purchaseValue: number;
  cpa: number;
  roas: number;
  ctr: number;
  cpc: number;
  cm2: number;
}

export interface DecisionCardMetricSummary {
  // Active timeframe metrics
  activeCpa: number;
  activePurchases: number;
  activeSpendGst: number;
  activeRoas: number;
  activeCm2: number;
  activeCtr: number;
  activeCpc: number;
  activeFrequency: number;
  timeframe: "7d" | "3d" | "30d";
  timeframeLabel: string;
  safeCpa: number | null;
  optimisticCpa: number;
  tier: "T1" | "T2" | "T3" | "T4";
  nMin: number;

  // Window benchmarks
  w7Cpa: number;
  w3Cpa: number;
  w30Cpa: number;
  lifetimeCpa: number;
  targetCpa: number;
  breakEvenCpa: number;
  w7Purchases: number;
  w3Purchases: number;
  w30Purchases: number;
  lifetimePurchases: number;
  w7SpendGst: number;
  w3SpendGst: number;
  w30SpendGst: number;
  lifetimeSpendGst: number;
  w7Roas: number;
  w3Roas: number;
  w30Roas: number;
  lifetimeRoas: number;
  w7Frequency: number;
  w3Frequency: number;
  w30Frequency: number;
  w7Ctr: number;
  w3Ctr: number;
  w30Ctr: number;
  w7Cpc: number;
  w3Cpc: number;
  w30Cpc: number;
  ctr: number;
  cpc: number;
  estimatedCm2: number;
  w7Cm2: number;
  w3Cm2: number;
  w30Cm2: number;
  lifetimeCm2: number;

  // Tri-Horizon Diagnostics for Media Buyers
  triHorizon: {
    w3: HorizonMetrics;
    w7: HorizonMetrics;
    w30: HorizonMetrics;
  };
  trendAnalysis: {
    velocity: "ACCELERATING" | "FATIGUING" | "STABLE" | "LEARNING";
    frequencyWarning: boolean;
    cpaTrendPct: number;
    roasTrendPct: number;
    explanation: string;
  };
}

export interface ChangeCard {
  ruleId: string;
  action: string;
  termMoved: string;
  expectedEffect: string;
  earliestReadDate: string;
  rollbackValue: string;
}

export interface CampaignDecisionCard {
  campaignId: string;
  externalId: string;
  campaignName: string;
  brandId: string;
  brandName: string;
  currency: string;
  status: string;
  currentDailyBudget: number;
  currentDailyBudgetGst: number;
  recommendedDailyBudget: number;
  recommendedDailyBudgetGst: number;
  budgetDeltaPct: number;
  decision: "SCALE" | "HOLD" | "REDUCE" | "PAUSE" | "INVESTIGATE" | "INSUFFICIENT_EVIDENCE";
  badgeColor: "emerald" | "amber" | "rose" | "purple" | "slate" | "blue";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  primaryReason: string;
  actionText: string;
  metrics: DecisionCardMetricSummary;
  changeCard: ChangeCard;
  blockers: string[];
  cooldownHoursRemaining: number;
  evaluatedAt: string;
}

export interface BrandFleetDecisionSummary {
  brandId: string;
  brandName: string;
  currency: string;
  totalActiveCampaigns: number;
  scaleCount: number;
  holdCount: number;
  reduceCount: number;
  pauseCount: number;
  investigateCount: number;
  insufficientEvidenceCount: number;
  totalDailyBudget: number;
  recommendedNetBudgetChange: number;
  decisions: CampaignDecisionCard[];
}

/**
 * Calculates estimated CM2 (Contribution Margin 2) in INR:
 * CM2 = Realized Revenue - COGS - Logistics (Forward + RTO) - Ad Spend (with GST)
 */
export function estimateCampaignCm2(
  revenue: number,
  spendWithGst: number,
  ordersCount: number,
  cogsPct: number = 30,
  rtoRatePct: number = 20,
  forwardFreight: number = 80,
  rtoFreight: number = 60
): number {
  if (revenue <= 0 && spendWithGst <= 0) return 0;

  const deliveredRatio = Math.max(0, 1 - rtoRatePct / 100);
  const realizedRevenue = revenue * deliveredRatio;
  const cogs = realizedRevenue * (cogsPct / 100);
  const totalFreight = ordersCount * forwardFreight + ordersCount * (rtoRatePct / 100) * rtoFreight;
  const cm1 = realizedRevenue - cogs - totalFreight;
  return Math.round(cm1 - spendWithGst);
}

function parseMetaInsightRow(row: any) {
  const sp = parseFloat(row.spend || 0);
  const imp = parseInt(row.impressions || 0, 10);
  const clk = parseInt(row.clicks || 0, 10);
  const rch = parseInt(row.reach || 0, 10);
  const freq = parseFloat(row.frequency || 0);
  let pur = 0;
  let pVal = 0;

  if (row.actions && Array.isArray(row.actions)) {
    for (const act of row.actions) {
      if (act.action_type === "omni_purchase" || act.action_type === "purchase") {
        pur = Math.max(pur, parseInt(act.value || 0, 10));
      }
    }
  }

  if (row.action_values && Array.isArray(row.action_values)) {
    for (const av of row.action_values) {
      if (av.action_type === "omni_purchase" || av.action_type === "purchase") {
        pVal = Math.max(pVal, parseFloat(av.value || 0));
      }
    }
  }

  const spendWithGst = Math.round(sp * 1.18);
  const cpa = pur > 0 ? Math.round(spendWithGst / pur) : spendWithGst;
  const roas = spendWithGst > 0 ? parseFloat((pVal / spendWithGst).toFixed(2)) : 0;
  const ctr = imp > 0 ? parseFloat(((clk / imp) * 100).toFixed(2)) : 0;
  const cpc = clk > 0 ? parseFloat((spendWithGst / clk).toFixed(2)) : 0;

  return {
    spend: sp,
    spendWithGst,
    impressions: imp,
    clicks: clk,
    reach: rch,
    frequency: freq,
    purchases: pur,
    purchaseValue: pVal,
    cpa,
    roas,
    ctr,
    cpc,
  };
}

/**
 * Master SOP v3.0 (Tri-Horizon Decision Engine)
 * Implements simultaneous 3-Day (Velocity), 7-Day (Baseline), and 30-Day (Evergreen)
 * evaluation based on Meta Ads Expert Media Buying Standards.
 */
export async function evaluateCampaignDecisions(
  brandId?: string,
  timeframeStr: string = "7d",
  options?: { skipLiveMeta?: boolean }
): Promise<{
  success: boolean;
  timeframe: "7d" | "3d" | "30d";
  fleetSummary: BrandFleetDecisionSummary[];
  allCards: CampaignDecisionCard[];
}> {
  await dbConnect();

  const timeframe: "7d" | "3d" | "30d" =
    timeframeStr === "3d" ? "3d" : timeframeStr === "30d" ? "30d" : "7d";

  const brandFilter: any = { status: "active" };
  if (brandId) {
    brandFilter._id = brandId;
  }

  const brands = await Brand.find(brandFilter).lean();
  const fleetSummaries: BrandFleetDecisionSummary[] = [];
  const allCards: CampaignDecisionCard[] = [];
  const now = new Date();

  // Multi-horizon live Meta API query map: [campaignId] -> { w3, w7, w30 }
  const liveMetaMap: Record<
    string,
    {
      w3?: ReturnType<typeof parseMetaInsightRow>;
      w7?: ReturnType<typeof parseMetaInsightRow>;
      w30?: ReturnType<typeof parseMetaInsightRow>;
    }
  > = {};

  if (!options?.skipLiveMeta) {
    const brandsWithToken = brands.filter((b: any) => b.metaAccountId && b.metaAccessToken);
    if (brandsWithToken.length > 0) {
      try {
        const fetchPromises = brandsWithToken.flatMap((b: any) => {
          const cleanAccId = b.metaAccountId.startsWith("act_") ? b.metaAccountId : `act_${b.metaAccountId}`;
          return (["last_3d", "last_7d", "last_30d"] as const).map(async (preset) => {
            const url = `https://graph.facebook.com/v20.0/${cleanAccId}/insights?level=campaign&date_preset=${preset}&fields=campaign_id,campaign_name,spend,impressions,clicks,reach,frequency,actions,action_values&limit=100&access_token=${b.metaAccessToken}`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3500);
            try {
              const res = await fetch(url, { signal: controller.signal });
              clearTimeout(timeout);
              if (!res.ok) return { preset, data: [] };
              const json = await res.json();
              return { preset, data: json.data || [] };
            } catch {
              clearTimeout(timeout);
              return { preset, data: [] };
            }
          });
        });

        const horizonResults = await Promise.allSettled(fetchPromises);
        for (const res of horizonResults) {
          if (res.status === "fulfilled" && res.value) {
            const { preset, data } = res.value;
            for (const row of data) {
              const campId = String(row.campaign_id);
              if (!liveMetaMap[campId]) {
                liveMetaMap[campId] = {};
              }
              const parsed = parseMetaInsightRow(row);
              if (preset === "last_3d") liveMetaMap[campId].w3 = parsed;
              else if (preset === "last_7d") liveMetaMap[campId].w7 = parsed;
              else if (preset === "last_30d") liveMetaMap[campId].w30 = parsed;
            }
          }
        }
      } catch (err: any) {
        console.warn("[Decision Engine] Live Meta multi-horizon fetch warning:", err?.message || err);
      }
    }
  }

  for (const b of brands) {
    const bId = String(b._id);
    const targetCpa = b.targetCpa || 250;
    const breakEvenCpa = b.breakEvenCpa || Math.round(targetCpa * 1.8);
    const targetRoas = b.targetRoas || 2.5;
    const cogsPct = b.cogsPercentage || 30;
    const rtoPct = b.rtoRate || 20;

    // Determine Product Tier (T1 to T4)
    let tier: "T1" | "T2" | "T3" | "T4" = "T2";
    let nMin = 20;
    let k = 3;
    let z = 1.0;
    let tierCap = 0.15;
    let cooldownHours = 72;

    if (targetCpa <= 200) {
      tier = "T1";
      nMin = 30;
      k = 3;
      z = 1.0;
      tierCap = 0.20;
      cooldownHours = 48;
    } else if (targetCpa <= 500) {
      tier = "T2";
      nMin = 20;
      k = 3;
      z = 1.0;
      tierCap = 0.15;
      cooldownHours = 72;
    } else if (targetCpa <= 1200) {
      tier = "T3";
      nMin = 12;
      k = 4;
      z = 1.0;
      tierCap = 0.10;
      cooldownHours = 72;
    } else {
      tier = "T4";
      nMin = 6;
      k = 4;
      z = 1.65;
      tierCap = 0.10;
      cooldownHours = 96;
    }

    const campaigns: any[] = await Campaign.find({
      brandId: b._id,
      status: { $in: ["ACTIVE", "active"] },
    }).lean();

    const outOfStockCount = await Product.countDocuments({
      brandId: b._id,
      status: "active",
      inventoryQuantity: { $lte: 0 },
    });
    const totalActiveProducts = await Product.countDocuments({
      brandId: b._id,
      status: "active",
    });

    const isSevereStockOut =
      totalActiveProducts > 0 && outOfStockCount / totalActiveProducts >= 0.7;

    const brandCards: CampaignDecisionCard[] = [];

    for (const c of campaigns) {
      const cId = String(c._id);
      const extId = c.externalId || "";
      const currentDailyBudget = c.dailyBudget || 0;
      const currentDailyBudgetGst = Math.round(currentDailyBudget * 1.18);

      const live = liveMetaMap[extId] || {};

      // 1. Resolve 3-Day Horizon (Velocity & Fatigue)
      const w3Raw = live.w3 || c.w3Metrics || {};
      const w3Spend = typeof w3Raw.spend === "number" ? w3Raw.spend : 0;
      const w3SpendGst = w3Raw.spendWithGst || Math.round(w3Spend * 1.18);
      const w3Purchases = w3Raw.purchases || 0;
      const w3PurchaseVal = w3Raw.purchaseValue || 0;
      const w3Impressions = w3Raw.impressions || 0;
      const w3Clicks = w3Raw.clicks || 0;
      const w3Reach = w3Raw.reach || 0;
      const w3Frequency = w3Raw.frequency || (w3Reach > 0 ? parseFloat((w3Impressions / w3Reach).toFixed(2)) : 1.0);
      const w3Cpa = w3Purchases > 0 ? Math.round(w3SpendGst / w3Purchases) : (w3SpendGst > 0 ? w3SpendGst : 0);
      const w3Roas = w3SpendGst > 0 ? parseFloat((w3PurchaseVal / w3SpendGst).toFixed(2)) : 0;
      const w3Ctr = w3Impressions > 0 ? parseFloat(((w3Clicks / w3Impressions) * 100).toFixed(2)) : (c.ctr || 0);
      const w3Cpc = w3Clicks > 0 ? parseFloat((w3SpendGst / w3Clicks).toFixed(2)) : (c.cpc || 0);
      const w3Cm2 = estimateCampaignCm2(w3PurchaseVal, w3SpendGst, w3Purchases, cogsPct, rtoPct);

      // 2. Resolve 7-Day Horizon (Core Operational Baseline)
      const w7Raw = live.w7 || c.w7Metrics || {};
      const w7Spend = typeof w7Raw.spend === "number" ? w7Raw.spend : (c.spend ? Math.min(c.spend, currentDailyBudget * 7) : 0);
      const w7SpendGst = w7Raw.spendWithGst || Math.round(w7Spend * 1.18);
      const w7Purchases = w7Raw.purchases || 0;
      const w7PurchaseVal = w7Raw.purchaseValue || 0;
      const w7Impressions = w7Raw.impressions || 0;
      const w7Clicks = w7Raw.clicks || 0;
      const w7Reach = w7Raw.reach || 0;
      const w7Frequency = w7Raw.frequency || (w7Reach > 0 ? parseFloat((w7Impressions / w7Reach).toFixed(2)) : 1.2);
      const w7Cpa = w7Purchases > 0 ? Math.round(w7SpendGst / w7Purchases) : (w7SpendGst > 0 ? w7SpendGst : 0);
      const w7Roas = w7SpendGst > 0 ? parseFloat((w7PurchaseVal / w7SpendGst).toFixed(2)) : (c.roas || 0);
      const w7Ctr = w7Impressions > 0 ? parseFloat(((w7Clicks / w7Impressions) * 100).toFixed(2)) : (c.ctr || 0);
      const w7Cpc = w7Clicks > 0 ? parseFloat((w7SpendGst / w7Clicks).toFixed(2)) : (c.cpc || 0);
      const w7Cm2 = estimateCampaignCm2(w7PurchaseVal, w7SpendGst, w7Purchases, cogsPct, rtoPct);

      // 3. Resolve 30-Day Horizon (Macro Stability & Evergreen Winner Validation)
      const w30Raw = live.w30 || c.w30Metrics || {};
      const w30Spend = typeof w30Raw.spend === "number" ? w30Raw.spend : (c.spend || w7Spend);
      const w30SpendGst = w30Raw.spendWithGst || Math.round(w30Spend * 1.18);
      const w30Purchases = w30Raw.purchases || c.purchases || w7Purchases;
      const w30PurchaseVal = w30Raw.purchaseValue || c.purchaseValue || w7PurchaseVal;
      const w30Impressions = w30Raw.impressions || c.impressions || w7Impressions;
      const w30Clicks = w30Raw.clicks || c.clicks || w7Clicks;
      const w30Reach = w30Raw.reach || c.reach || w7Reach;
      const w30Frequency = w30Raw.frequency || (w30Reach > 0 ? parseFloat((w30Impressions / w30Reach).toFixed(2)) : 1.5);
      const w30Cpa = w30Purchases > 0 ? Math.round(w30SpendGst / w30Purchases) : (w30SpendGst > 0 ? w30SpendGst : 0);
      const w30Roas = w30SpendGst > 0 ? parseFloat((w30PurchaseVal / w30SpendGst).toFixed(2)) : (c.roas || 0);
      const w30Ctr = w30Impressions > 0 ? parseFloat(((w30Clicks / w30Impressions) * 100).toFixed(2)) : (c.ctr || 0);
      const w30Cpc = w30Clicks > 0 ? parseFloat((w30SpendGst / w30Clicks).toFixed(2)) : (c.cpc || 0);
      const w30Cm2 = estimateCampaignCm2(w30PurchaseVal, w30SpendGst, w30Purchases, cogsPct, rtoPct);

      // Lifetime fallback benchmarks
      const lifetimeSpend = c.spend || 0;
      const lifetimeSpendGst = Math.round(lifetimeSpend * 1.18);
      const lifetimePurchases = c.purchases || 0;
      const lifetimePurchaseValue = c.purchaseValue || 0;
      const lifetimeCpa = lifetimePurchases > 0 ? Math.round(lifetimeSpendGst / lifetimePurchases) : 0;
      const lifetimeRoas = lifetimeSpendGst > 0 ? parseFloat((lifetimePurchaseValue / lifetimeSpendGst).toFixed(2)) : (c.roas || 0);
      const lifetimeCm2 = estimateCampaignCm2(lifetimePurchaseValue, lifetimeSpendGst, lifetimePurchases, cogsPct, rtoPct);

      // Build structured Tri-Horizon Object
      const triHorizon = {
        w3: {
          spend: w3Spend,
          spendWithGst: w3SpendGst,
          impressions: w3Impressions,
          clicks: w3Clicks,
          reach: w3Reach,
          frequency: w3Frequency,
          purchases: w3Purchases,
          purchaseValue: w3PurchaseVal,
          cpa: w3Cpa,
          roas: w3Roas,
          ctr: w3Ctr,
          cpc: w3Cpc,
          cm2: w3Cm2,
        },
        w7: {
          spend: w7Spend,
          spendWithGst: w7SpendGst,
          impressions: w7Impressions,
          clicks: w7Clicks,
          reach: w7Reach,
          frequency: w7Frequency,
          purchases: w7Purchases,
          purchaseValue: w7PurchaseVal,
          cpa: w7Cpa,
          roas: w7Roas,
          ctr: w7Ctr,
          cpc: w7Cpc,
          cm2: w7Cm2,
        },
        w30: {
          spend: w30Spend,
          spendWithGst: w30SpendGst,
          impressions: w30Impressions,
          clicks: w30Clicks,
          reach: w30Reach,
          frequency: w30Frequency,
          purchases: w30Purchases,
          purchaseValue: w30PurchaseVal,
          cpa: w30Cpa,
          roas: w30Roas,
          ctr: w30Ctr,
          cpc: w30Cpc,
          cm2: w30Cm2,
        },
      };

      // Select active primary timeframe metrics for the UI top view
      let activeSpendGst = w7SpendGst;
      let activePurchases = w7Purchases;
      let activeCpa = w7Cpa;
      let activeRoas = w7Roas;
      let activeCm2 = w7Cm2;
      let activeCtr = w7Ctr;
      let activeCpc = w7Cpc;
      let activeFrequency = w7Frequency;
      let timeframeLabel = "7-Day Standard";

      if (timeframe === "3d") {
        activeSpendGst = w3SpendGst;
        activePurchases = w3Purchases;
        activeCpa = w3Cpa;
        activeRoas = w3Roas;
        activeCm2 = w3Cm2;
        activeCtr = w3Ctr;
        activeCpc = w3Cpc;
        activeFrequency = w3Frequency;
        timeframeLabel = "3-Day Velocity";
      } else if (timeframe === "30d") {
        activeSpendGst = w30SpendGst;
        activePurchases = w30Purchases;
        activeCpa = w30Cpa;
        activeRoas = w30Roas;
        activeCm2 = w30Cm2;
        activeCtr = w30Ctr;
        activeCpc = w30Cpc;
        activeFrequency = w30Frequency;
        timeframeLabel = "30-Day Macro";
      }

      // Safe CPA & Optimistic CPA formulas
      const p = activePurchases;
      const s = activeSpendGst;
      const safeDenominator = p - z * Math.sqrt(p);
      const safeCpa: number | null = safeDenominator > 0 ? Math.round(s / safeDenominator) : null;
      const optimisticCpa: number = p > 0 ? Math.round(s / (p + z * Math.sqrt(p))) : s;

      // Cooldown evaluation
      let cooldownHoursRemaining = 0;
      if (c.lastBudgetChangeAt) {
        const diffMs = now.getTime() - new Date(c.lastBudgetChangeAt).getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours < cooldownHours) {
          cooldownHoursRemaining = Math.max(0, Math.round(cooldownHours - diffHours));
        }
      }

      // Tri-Horizon Diagnostics & Trend Signals
      const cpaTrendPct = w7Cpa > 0 && w3Cpa > 0 ? Math.round(((w3Cpa - w7Cpa) / w7Cpa) * 100) : 0;
      const roasTrendPct = w7Roas > 0 && w3Roas > 0 ? Math.round(((w3Roas - w7Roas) / w7Roas) * 100) : 0;
      const isFatigued = (w3Frequency >= 2.4 || w7Frequency >= 2.3) && (w3Ctr < 0.85 || w7Ctr < 0.85);

      let velocity: "ACCELERATING" | "FATIGUING" | "STABLE" | "LEARNING" = "STABLE";
      if (w3Purchases < 3 && w7Purchases < 8) {
        velocity = "LEARNING";
      } else if (isFatigued || cpaTrendPct > 25) {
        velocity = "FATIGUING";
      } else if (w3Roas >= 2.2 && (w3Cpa <= targetCpa || cpaTrendPct <= -10)) {
        velocity = "ACCELERATING";
      }

      // -----------------------------------------------------------------
      // META ADS EXPERT TRI-HORIZON DECISION MATRIX
      // -----------------------------------------------------------------
      let decision: "SCALE" | "HOLD" | "REDUCE" | "PAUSE" | "INVESTIGATE" | "INSUFFICIENT_EVIDENCE" = "HOLD";
      let badgeColor: "emerald" | "amber" | "rose" | "purple" | "slate" | "blue" = "amber";
      let confidence: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
      let primaryReason = "";
      let actionText = "";
      let recommendedDailyBudget = currentDailyBudget;
      const blockers: string[] = [];

      let changeCard: ChangeCard = {
        ruleId: "SOP-RULE-HOLD-01",
        action: "Maintain current budget",
        termMoved: "None (operating within acceptable profit corridor)",
        expectedEffect: "Spend flat, steady CM2 contribution",
        earliestReadDate: `${cooldownHours}h routine review`,
        rollbackValue: `₹${currentDailyBudget.toLocaleString("en-IN")}/day`,
      };

      // 1. EMERGENCY KILL 1: Severe Store Stockout
      if (isSevereStockOut) {
        decision = "PAUSE";
        badgeColor = "rose";
        confidence = "HIGH";
        primaryReason = "Store Inventory Warning: Over 70% of your products are sold out in Shopify. Pausing campaign so ad spend is not burned on unfulfillable orders.";
        actionText = "Stop Ad (Store Stock Warning)";
        recommendedDailyBudget = 0;
        blockers.push("Store inventory is depleted (>70% out of stock)");
        changeCard = {
          ruleId: "SOP-STOCKOUT-PAUSE",
          action: "Pause Campaign (₹0 budget)",
          termMoved: "Halt spend to prevent stockout cancellations",
          expectedEffect: "Eliminates wasted ad spend on unfulfillable inventory",
          earliestReadDate: "When stock replenished > 80%",
          rollbackValue: `₹${currentDailyBudget.toLocaleString("en-IN")}/day`,
        };
      }

      // 2. EMERGENCY KILL 2: Zero Sales Burn (Hard Stop-Loss)
      else if (
        (w7Purchases === 0 && w7SpendGst >= k * targetCpa) ||
        (activePurchases === 0 && activeSpendGst >= k * targetCpa)
      ) {
        decision = "PAUSE";
        badgeColor = "rose";
        confidence = "HIGH";
        const burnSpend = w7Purchases === 0 ? w7SpendGst : activeSpendGst;
        primaryReason = `Hard Stop-Loss: Spent ₹${burnSpend.toLocaleString("en-IN")} with 0 orders (exceeds ${k}× Target CPA of ₹${targetCpa.toLocaleString("en-IN")}). The creative/offer is non-converting in auction. Pausing immediately to cut losses.`;
        actionText = "Stop Ad (Zero Sales Burn)";
        recommendedDailyBudget = 0;
        blockers.push(`Spend ₹${burnSpend.toLocaleString("en-IN")} exceeded ${k}× Target CPA (₹${k * targetCpa}) with 0 sales`);
        changeCard = {
          ruleId: "SOP-KILL-ZERO-PURCHASE",
          action: "Pause Campaign (₹0 budget)",
          termMoved: "Spend halted on non-converting offer/creative",
          expectedEffect: `Saves ₹${currentDailyBudget.toLocaleString("en-IN")}/day from burning with 0 return`,
          earliestReadDate: "After creative and landing page overhaul",
          rollbackValue: `₹${currentDailyBudget.toLocaleString("en-IN")}/day`,
        };
      }

      // 3. EMERGENCY KILL 3: Severe Net Cash Loss (Structural Bleed across 7D & 3D)
      else if (
        w7Purchases >= 3 &&
        w7Cpa > 1.35 * breakEvenCpa &&
        w7Cm2 < -Math.max(600, 0.12 * w7SpendGst) &&
        (w3Purchases >= 2 ? w3Cpa > breakEvenCpa : true) &&
        w7Roas < 1.7
      ) {
        decision = "PAUSE";
        badgeColor = "rose";
        confidence = "HIGH";
        primaryReason = `Structural Margin Bleed: 7-Day CPA is ₹${w7Cpa.toLocaleString("en-IN")} (loss limit is ₹${breakEvenCpa.toLocaleString("en-IN")}). After factoring in product COGS, delivery freight, and customer returns (RTO), this campaign lost -₹${Math.abs(w7Cm2).toLocaleString("en-IN")} net. Pausing immediately to protect cash flow.`;
        actionText = "Stop Ad (Structural Loss)";
        recommendedDailyBudget = 0;
        blockers.push(`7D CPA ₹${w7Cpa.toLocaleString("en-IN")} > Break-Even ₹${breakEvenCpa.toLocaleString("en-IN")}`);
        changeCard = {
          ruleId: "SOP-PAUSE-STRUCTURAL-LOSS",
          action: "Pause Campaign to stop negative net margin drain",
          termMoved: "Spend halted on unprofitable unit economics",
          expectedEffect: `Stops net cash bleed of -₹${Math.abs(w7Cm2).toLocaleString("en-IN")}`,
          earliestReadDate: "Immediate",
          rollbackValue: `₹${currentDailyBudget.toLocaleString("en-IN")}/day`,
        };
      }

      // 4. CREATIVE FATIGUE / AUDIENCE SATURATION (Do NOT kill, Refresh Creative)
      // Historical winner (30-day ROAS >= 2.0x), but recent 3D/7D shows high frequency + low CTR + spiking CPA
      else if (
        w30Purchases >= 12 &&
        w30Roas >= 2.0 &&
        isFatigued &&
        (w3Cpa > 1.25 * w30Cpa || w7Cpa > 1.2 * targetCpa)
      ) {
        decision = "INVESTIGATE";
        badgeColor = "purple";
        confidence = "HIGH";
        primaryReason = `Creative Fatigue Alert: This campaign is a proven 30-day champion (${w30Purchases} orders, ${w30Roas.toFixed(2)}x ROAS), but recent ad frequency reached ${w3Frequency.toFixed(1)} and CTR dropped to ${w3Ctr.toFixed(2)}% (cost per click rose to ₹${Math.round(w3Cpc)}). The product and audience are proven winners, but the creative is exhausted. Do NOT pause the ad set; introduce 2-3 fresh video hooks or UGC angles to revive click-through rate.`;
        actionText = "Refresh Creative / Hook (Audience Fatigued)";
        recommendedDailyBudget = currentDailyBudget;
        blockers.push(`Frequency reached ${w3Frequency.toFixed(1)} with CTR ${w3Ctr.toFixed(2)}%`);
        changeCard = {
          ruleId: "SOP-CREATIVE-FATIGUE-REFRESH",
          action: "Introduce 2-3 fresh video hooks or new visual angle into existing ad set",
          termMoved: "Restore top-of-funnel outbound CTR and reduce auction CPM",
          expectedEffect: "CTR recovers towards >1.2%, CPA drops back to historical baseline",
          earliestReadDate: "3 to 4 days after adding new ad creatives",
          rollbackValue: `₹${currentDailyBudget.toLocaleString("en-IN")}/day`,
        };
      }

      // 5. SCALE RULE: Confirmed Tri-Horizon Winner (+15% to +20%)
      // 7D CPA <= Target CPA (or 7D ROAS >= target), 3D velocity healthy (3D CPA <= 1.15x target or ROAS >= 2.0x), 7D purchases >= 8, positive CM2
      else if (
        (w7Cpa <= targetCpa || (w7Roas >= targetRoas && w7Cm2 > 0)) &&
        (w3Purchases >= 3 ? (w3Cpa <= targetCpa * 1.15 || w3Roas >= 2.0) : true) &&
        w7Purchases >= Math.min(nMin, 8) &&
        w7Cm2 > 0 &&
        w7Frequency < 2.3
      ) {
        let rawStep = 0.15;
        if (w7Cpa > 0) {
          rawStep = 0.5 * ((targetCpa / w7Cpa) - 1);
        } else if (targetRoas > 0) {
          rawStep = 0.5 * ((w7Roas / targetRoas) - 1);
        }
        const dynamicStepPct = Math.min(tierCap, Math.max(0.10, Math.round(rawStep * 1000) / 1000));
        const stepDisplayPct = Math.round(dynamicStepPct * 100);

        if (cooldownHoursRemaining > 0) {
          decision = "HOLD";
          badgeColor = "amber";
          confidence = "HIGH";
          primaryReason = `High-Profit Scale Candidate (${tier} Tier)! Generating ${w7Roas.toFixed(2)}x ROAS with +₹${w7Cm2.toLocaleString("en-IN")} net profit across 7 days, and 3-day momentum remains strong (${w3Roas.toFixed(2)}x ROAS). Budget was adjusted recently; holding steady for ${cooldownHoursRemaining} more hours to let Meta's machine learning finish stabilizing before the next scale step.`;
          actionText = `Keep Current Budget (Meta Learning: ${cooldownHoursRemaining}h remaining)`;
          recommendedDailyBudget = currentDailyBudget;
          blockers.push(`Algorithm learning cooldown active: ${cooldownHoursRemaining} hours remaining`);
        } else {
          decision = "SCALE";
          badgeColor = "emerald";
          confidence = "HIGH";
          recommendedDailyBudget = Math.round(currentDailyBudget * (1 + dynamicStepPct));
          primaryReason = `Tri-Horizon Winner (${tier} Tier)! 7-Day CPA (₹${w7Cpa.toLocaleString("en-IN")}) and 3-Day CPA (₹${w3Cpa.toLocaleString("en-IN")}) are beating your ₹${targetCpa.toLocaleString("en-IN")} target with ${w7Purchases} weekly orders and +₹${w7Cm2.toLocaleString("en-IN")} net profit. Frequency is healthy at ${w7Frequency.toFixed(1)} and CTR is strong at ${w7Ctr.toFixed(2)}%. Safe to scale daily budget by +${stepDisplayPct}% to capture incremental profitable volume.`;
          actionText = `Scale Budget +${stepDisplayPct}% (₹${currentDailyBudget.toLocaleString("en-IN")} → ₹${recommendedDailyBudget.toLocaleString("en-IN")}/day)`;
          changeCard = {
            ruleId: "SOP-TRI-HORIZON-SCALE",
            action: `Increase Daily Budget +${stepDisplayPct}% (₹${currentDailyBudget.toLocaleString("en-IN")} → ₹${recommendedDailyBudget.toLocaleString("en-IN")}/day)`,
            termMoved: `Scale volume on proven creative (ROAS ${w7Roas.toFixed(2)}x ≥ ${targetRoas}x, Net CM2 +₹${w7Cm2.toLocaleString("en-IN")})`,
            expectedEffect: `Spend +${stepDisplayPct}%, Orders +${Math.round(stepDisplayPct * 0.75)}%, Net Profit expands`,
            earliestReadDate: `${cooldownHours}h post-scale review`,
            rollbackValue: `₹${currentDailyBudget.toLocaleString("en-IN")}/day`,
          };
        }
      }

      // 6. REDUCE RULE: Recent 72-Hour Fatigue / Deterioration (-20%)
      // 7D was marginally acceptable, but 3D CPA spiked > 1.3x target, purchases >= 5, net margin compressing
      else if (
        w3Purchases >= 3 &&
        w3Cpa > 1.25 * targetCpa &&
        w7Purchases >= 5 &&
        !(w7Cm2 > 1000 && w7Roas >= targetRoas)
      ) {
        decision = "REDUCE";
        badgeColor = "amber";
        confidence = "MEDIUM";
        recommendedDailyBudget = Math.max(100, Math.round(currentDailyBudget * 0.8));
        primaryReason = `Recent 72-Hour Fatigue: Over the last 3 days, CPA has spiked to ₹${w3Cpa.toLocaleString("en-IN")} (target is ₹${targetCpa.toLocaleString("en-IN")}), squeezing net profit margins. Cutting daily budget by -20% (₹${currentDailyBudget.toLocaleString("en-IN")} → ₹${recommendedDailyBudget.toLocaleString("en-IN")}/day) relieves auction bidding pressure and controls burn while preserving pixel history.`;
        actionText = `Reduce Budget by -20% (₹${currentDailyBudget.toLocaleString("en-IN")} → ₹${recommendedDailyBudget.toLocaleString("en-IN")}/day)`;
        blockers.push(`Recent 3-Day CPA ₹${w3Cpa.toLocaleString("en-IN")} exceeds target ₹${targetCpa.toLocaleString("en-IN")}`);
        changeCard = {
          ruleId: "SOP-RULE-BUDGET-REDUCE-20",
          action: `Cut Daily Budget by -20% (₹${currentDailyBudget.toLocaleString("en-IN")} → ₹${recommendedDailyBudget.toLocaleString("en-IN")}/day)`,
          termMoved: "Eases audience saturation, relieves auction bidding pressure",
          expectedEffect: `Spend -20%, CPA lowers towards Target ₹${targetCpa.toLocaleString("en-IN")}`,
          earliestReadDate: "72h after reduction",
          rollbackValue: `₹${currentDailyBudget.toLocaleString("en-IN")}/day`,
        };
      }

      // 7. EVERGREEN CHAMPION TEMPORARY VARIANCE (Hold - Don't Panic)
      // 30-Day winner (purchases >= 20, ROAS >= 2.2x), but 3-day has a minor 1-2 day dip
      else if (
        w30Purchases >= 20 &&
        w30Roas >= 2.2 &&
        w7Cm2 >= -200 &&
        w7Purchases >= 5
      ) {
        decision = "HOLD";
        badgeColor = "amber";
        confidence = "HIGH";
        primaryReason = `Long-Term Champion: Proven 30-day winner with ${w30Purchases} orders and ${w30Roas.toFixed(2)}x ROAS. Recent 3-day numbers reflect a normal weekly fluctuation. Media buying best practice is to avoid knee-jerk budget cuts on core winners during brief 48h variances. Maintaining steady budget.`;
        actionText = "Keep Current Budget (Evergreen Champion)";
        recommendedDailyBudget = currentDailyBudget;
      }

      // 8. INSUFFICIENT EVIDENCE (Early Machine Learning / Sample Accumulation)
      else if (activePurchases < 8 || activeSpendGst < 2 * targetCpa) {
        decision = "INSUFFICIENT_EVIDENCE";
        badgeColor = "slate";
        confidence = "LOW";
        primaryReason = `Early Machine Learning Phase: Campaign has only logged ${activePurchases} order(s) on ₹${activeSpendGst.toLocaleString("en-IN")} spend so far. Meta's delivery system requires at least 8 to ${nMin} conversions to optimize audience targeting. Maintain current budget while data accumulates.`;
        actionText = "Keep Running (Collecting Initial Conversions)";
        recommendedDailyBudget = currentDailyBudget;
        changeCard = {
          ruleId: "SOP-RULE-SAMPLE-ACCUMULATION",
          action: "Hold budget constant while collecting initial order sample",
          termMoved: "Observation window accumulation",
          expectedEffect: "Accumulates orders to reach Poisson statistical maturity",
          earliestReadDate: "When purchases reach 8+",
          rollbackValue: `₹${currentDailyBudget.toLocaleString("en-IN")}/day`,
        };
      }

      // 9. DEFAULT: HOLD (Stable baseline inside profit corridor)
      else {
        decision = "HOLD";
        badgeColor = "amber";
        confidence = "MEDIUM";
        if (activeCm2 > 0 && activeRoas >= targetRoas) {
          primaryReason = `Solid Profitable Performer: Generating ${activeRoas.toFixed(2)}x ROAS with +₹${activeCm2.toLocaleString("en-IN")} net profit. Performance is stable and well-calibrated. Holding budget steady.`;
          actionText = "Keep Current Budget (Profitable)";
        } else {
          primaryReason = `Running Steady: Operating at ₹${activeCpa.toLocaleString("en-IN")} CPA right in line with your ₹${targetCpa.toLocaleString("en-IN")} target. Net contribution margin is healthy (+₹${activeCm2.toLocaleString("en-IN")}). No budget intervention needed.`;
          actionText = "Keep Current Budget (Steady)";
        }
        recommendedDailyBudget = currentDailyBudget;
      }

      const budgetDeltaPct = currentDailyBudget > 0
        ? Math.round(((recommendedDailyBudget - currentDailyBudget) / currentDailyBudget) * 100)
        : 0;

      const card: CampaignDecisionCard = {
        campaignId: cId,
        externalId: extId,
        campaignName: c.name || "Campaign",
        brandId: bId,
        brandName: b.name,
        currency: "INR",
        status: c.status || "ACTIVE",
        currentDailyBudget,
        currentDailyBudgetGst,
        recommendedDailyBudget,
        recommendedDailyBudgetGst: Math.round(recommendedDailyBudget * 1.18),
        budgetDeltaPct,
        decision,
        badgeColor,
        confidence,
        primaryReason,
        actionText,
        metrics: {
          activeCpa,
          activePurchases,
          activeSpendGst,
          activeRoas,
          activeCm2,
          activeCtr,
          activeCpc,
          activeFrequency,
          timeframe,
          timeframeLabel,
          safeCpa,
          optimisticCpa,
          tier,
          nMin,
          w7Cpa,
          w3Cpa,
          w30Cpa,
          lifetimeCpa,
          targetCpa,
          breakEvenCpa,
          w7Purchases,
          w3Purchases,
          w30Purchases,
          lifetimePurchases,
          w7SpendGst,
          w3SpendGst,
          w30SpendGst,
          lifetimeSpendGst,
          w7Roas,
          w3Roas,
          w30Roas,
          lifetimeRoas,
          w7Frequency,
          w3Frequency,
          w30Frequency,
          w7Ctr,
          w3Ctr,
          w30Ctr,
          w7Cpc,
          w3Cpc,
          w30Cpc,
          ctr: activeCtr,
          cpc: activeCpc,
          estimatedCm2: activeCm2,
          w7Cm2,
          w3Cm2,
          w30Cm2,
          lifetimeCm2,
          triHorizon,
          trendAnalysis: {
            velocity,
            frequencyWarning: isFatigued,
            cpaTrendPct,
            roasTrendPct,
            explanation:
              velocity === "ACCELERATING"
                ? "Recent 3-day momentum is accelerating ahead of 7-day baseline"
                : velocity === "FATIGUING"
                ? "Ad frequency or 3-day CPA indicates creative saturation"
                : velocity === "LEARNING"
                ? "Awaiting conversion sample maturity"
                : "Performance is tracking baseline expectations",
          },
        },
        changeCard,
        blockers,
        cooldownHoursRemaining,
        evaluatedAt: now.toISOString(),
      };

      brandCards.push(card);
      allCards.push(card);

      // Persist fresh metrics and decision to MongoDB
      const updatePayload: any = {
        decision: {
          action: decision,
          badgeColor,
          reason: primaryReason,
          recommendedBudget: recommendedDailyBudget,
          confidence,
          blockers,
          evaluatedAt: now,
        },
      };

      if (live.w3) updatePayload.w3Metrics = live.w3;
      if (live.w7) updatePayload.w7Metrics = live.w7;
      if (live.w30) updatePayload.w30Metrics = live.w30;

      await Campaign.findByIdAndUpdate(c._id, updatePayload);
    }

    const scaleCount = brandCards.filter((c) => c.decision === "SCALE").length;
    const holdCount = brandCards.filter((c) => c.decision === "HOLD").length;
    const reduceCount = brandCards.filter((c) => c.decision === "REDUCE").length;
    const pauseCount = brandCards.filter((c) => c.decision === "PAUSE").length;
    const investigateCount = brandCards.filter((c) => c.decision === "INVESTIGATE").length;
    const insufficientEvidenceCount = brandCards.filter((c) => c.decision === "INSUFFICIENT_EVIDENCE").length;

    const totalDailyBudget = brandCards.reduce((acc, c) => acc + c.currentDailyBudget, 0);
    const recommendedNetBudgetChange = brandCards.reduce(
      (acc, c) => acc + (c.recommendedDailyBudget - c.currentDailyBudget),
      0
    );

    fleetSummaries.push({
      brandId: bId,
      brandName: b.name,
      currency: "INR",
      totalActiveCampaigns: brandCards.length,
      scaleCount,
      holdCount,
      reduceCount,
      pauseCount,
      investigateCount,
      insufficientEvidenceCount,
      totalDailyBudget,
      recommendedNetBudgetChange,
      decisions: brandCards,
    });
  }

  // Sort cards by urgency: PAUSE -> REDUCE -> SCALE -> INVESTIGATE -> HOLD -> INSUFFICIENT
  const urgencyWeight: Record<string, number> = {
    PAUSE: 1,
    REDUCE: 2,
    SCALE: 3,
    INVESTIGATE: 4,
    HOLD: 5,
    INSUFFICIENT_EVIDENCE: 6,
  };

  allCards.sort((a, b) => {
    const wA = urgencyWeight[a.decision] || 99;
    const wB = urgencyWeight[b.decision] || 99;
    if (wA !== wB) return wA - wB;
    return b.metrics.activeSpendGst - a.metrics.activeSpendGst;
  });

  return {
    success: true,
    timeframe,
    fleetSummary: fleetSummaries,
    allCards,
  };
}

/**
 * Applies a recommended budget decision to a campaign
 */
export async function applyCampaignBudgetDecision(
  campaignId: string,
  recommendedDailyBudget: number
): Promise<{ success: boolean; campaignId: string; newBudget: number; message: string }> {
  await dbConnect();

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new Error(`Campaign with ID ${campaignId} not found`);
  }

  const oldBudget = campaign.dailyBudget || 0;
  campaign.dailyBudget = recommendedDailyBudget;
  campaign.lastBudgetChangeAt = new Date();
  await campaign.save();

  return {
    success: true,
    campaignId: String(campaign._id),
    newBudget: recommendedDailyBudget,
    message: `Campaign "${campaign.name}" budget successfully updated from ₹${oldBudget.toLocaleString("en-IN")} to ₹${recommendedDailyBudget.toLocaleString("en-IN")}/day. 72-hour machine learning cooldown initiated.`,
  };
}
