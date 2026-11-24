import mongoose from "mongoose";

export interface ICampaign {
  _id: string;
  brandId: mongoose.Types.ObjectId | string;
  metaAccountId?: string;
  externalId: string;
  name: string;
  status: string;
  objective: string;
  dailyBudget: number;
  lifetimeBudget: number;
  thumbnailUrl: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchaseValue: number;
  roas: number;
  purchases?: number;
  cpa?: number;
  cpc?: number;
  ctr?: number;
  cpm?: number;
  reach?: number;
  frequency?: number;
  addsToCart?: number;
  costPerAddToCart?: number;
  clickToCartRate?: number;
  cartToCheckoutRate?: number;
  checkouts?: number;
  costPerCheckout?: number;
  checkoutRate?: number;
  purchaseFromCheckoutRate?: number;
  targetCpa?: number;
  createdTime?: Date;
  updatedTime?: Date;
  startTime?: Date;
  stopTime?: Date;
  lastUpdateDetails?: string;
  lastBudgetChangeAt?: Date;
  todayMetrics?: {
    spend: number;
    spendWithGst: number;
    impressions: number;
    clicks: number;
    purchases: number;
    purchaseValue: number;
    reach: number;
    cpa: number;
    roas: number;
  };
  yesterdayMetrics?: {
    spend: number;
    spendWithGst: number;
    impressions: number;
    clicks: number;
    purchases: number;
    purchaseValue: number;
    reach: number;
    cpa: number;
    roas: number;
  };
  w7Metrics?: {
    spend: number;
    spendWithGst: number;
    impressions: number;
    clicks: number;
    reach?: number;
    frequency?: number;
    purchases: number;
    purchaseValue: number;
    cpa: number;
    roas: number;
    ctr?: number;
    cpc?: number;
  };
  w3Metrics?: {
    spend: number;
    spendWithGst: number;
    impressions: number;
    clicks: number;
    reach?: number;
    frequency?: number;
    purchases: number;
    purchaseValue: number;
    cpa: number;
    roas: number;
    ctr?: number;
    cpc?: number;
  };
  w30Metrics?: {
    spend: number;
    spendWithGst: number;
    impressions: number;
    clicks: number;
    reach?: number;
    frequency?: number;
    purchases: number;
    purchaseValue: number;
    cpa: number;
    roas: number;
    ctr?: number;
    cpc?: number;
  };
  decision?: {
    action: "SCALE" | "HOLD" | "REDUCE" | "PAUSE" | "INVESTIGATE" | "INSUFFICIENT_EVIDENCE";
    badgeColor: string;
    reason: string;
    recommendedBudget: number;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    blockers: string[];
    evaluatedAt: Date;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const CampaignSchema = new mongoose.Schema(
  {
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true, index: true },
    metaAccountId: { type: String, default: "", index: true },
    externalId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    status: { type: String, default: "ACTIVE" },
    objective: { type: String, default: "OUTCOME_SALES" },
    dailyBudget: { type: Number, default: 0 },
    lifetimeBudget: { type: Number, default: 0 },
    thumbnailUrl: { type: String, default: "" },
    spend: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    purchaseValue: { type: Number, default: 0 },
    roas: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    cpa: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    cpm: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    frequency: { type: Number, default: 0 },
    addsToCart: { type: Number, default: 0 },
    costPerAddToCart: { type: Number, default: 0 },
    clickToCartRate: { type: Number, default: 0 },
    cartToCheckoutRate: { type: Number, default: 0 },
    checkouts: { type: Number, default: 0 },
    costPerCheckout: { type: Number, default: 0 },
    checkoutRate: { type: Number, default: 0 },
    purchaseFromCheckoutRate: { type: Number, default: 0 },
    targetCpa: { type: Number, default: 250 },
    createdTime: { type: Date },
    updatedTime: { type: Date },
    startTime: { type: Date },
    stopTime: { type: Date },
    lastUpdateDetails: { type: String },
    lastBudgetChangeAt: { type: Date },
    todayMetrics: {
      spend: { type: Number, default: 0 },
      spendWithGst: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      purchases: { type: Number, default: 0 },
      purchaseValue: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      cpa: { type: Number, default: 0 },
      roas: { type: Number, default: 0 },
    },
    yesterdayMetrics: {
      spend: { type: Number, default: 0 },
      spendWithGst: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      purchases: { type: Number, default: 0 },
      purchaseValue: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      cpa: { type: Number, default: 0 },
      roas: { type: Number, default: 0 },
    },
    w7Metrics: {
      spend: { type: Number, default: 0 },
      spendWithGst: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      purchases: { type: Number, default: 0 },
      purchaseValue: { type: Number, default: 0 },
      cpa: { type: Number, default: 0 },
      roas: { type: Number, default: 0 },
    },
    w3Metrics: {
      spend: { type: Number, default: 0 },
      spendWithGst: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      frequency: { type: Number, default: 0 },
      purchases: { type: Number, default: 0 },
      purchaseValue: { type: Number, default: 0 },
      cpa: { type: Number, default: 0 },
      roas: { type: Number, default: 0 },
      ctr: { type: Number, default: 0 },
      cpc: { type: Number, default: 0 },
    },
    w30Metrics: {
      spend: { type: Number, default: 0 },
      spendWithGst: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      frequency: { type: Number, default: 0 },
      purchases: { type: Number, default: 0 },
      purchaseValue: { type: Number, default: 0 },
      cpa: { type: Number, default: 0 },
      roas: { type: Number, default: 0 },
      ctr: { type: Number, default: 0 },
      cpc: { type: Number, default: 0 },
    },
    decision: {
      action: {
        type: String,
        enum: ["SCALE", "HOLD", "REDUCE", "PAUSE", "INVESTIGATE", "INSUFFICIENT_EVIDENCE"],
        default: "HOLD",
      },
      badgeColor: { type: String, default: "amber" },
      reason: { type: String, default: "" },
      recommendedBudget: { type: Number, default: 0 },
      confidence: { type: String, default: "MEDIUM" },
      blockers: { type: [String], default: [] },
      evaluatedAt: { type: Date },
    },
  },
  { timestamps: true }
);

CampaignSchema.index({ brandId: 1, externalId: 1 }, { unique: true });

export default mongoose.models.Campaign || mongoose.model("Campaign", CampaignSchema);
