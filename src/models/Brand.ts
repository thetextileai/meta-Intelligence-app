import mongoose from "mongoose";

export interface IBrand {
  _id: string;
  name: string;
  currency: string;
  status: "active" | "inactive";
  totalSpend: number;
  totalSpendWithGst?: number;
  totalSales: number;
  totalOrders: number;
  activeCampaigns: number;
  shopifyStoreUrl: string;
  customDomain?: string;
  shopifyDomains?: string[];
  shopifyAccessToken: string;
  shopifyApiSecret: string;
  metaAccountId: string;
  metaAccessToken: string;
  previousMetaAccountIds?: string[];
  webhookRegistered: boolean;
  shopifyStatus?: "connected" | "failed" | "not_connected";
  shopifyError?: string;
  metaStatus?: "connected" | "failed" | "not_connected";
  metaError?: string;
  webhookStatus?: "live" | "failed" | "not_configured";
  webhookError?: string;
  targetCpa?: number; // Target CPA in INR (₹)
  breakEvenCpa?: number; // Break-even CPA in INR (₹)
  targetRoas?: number;
  cogsPercentage?: number; // COGS % of sales (e.g. 30%)
  rtoRate?: number; // Estimated RTO rate % (e.g. 20%)
  averageOrderValue?: number; // Average Order Value / Product Price in INR (₹)
  planName?: string; // "starter" | "pro" | "trial"
  planPrice?: number;
  planStatus?: "active" | "cancelled" | "expired" | "trial";
  shopifyChargeId?: string;
  trialEndsAt?: Date;
  lastSyncAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const BrandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, default: "active", enum: ["active", "inactive"] },
    totalSpend: { type: Number, default: 0 },
    totalSpendWithGst: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    activeCampaigns: { type: Number, default: 0 },

    // Indian D2C Fashion Economics (in INR ₹)
    targetCpa: { type: Number, default: 250 }, // Target CPA in INR (₹250)
    breakEvenCpa: { type: Number, default: 450 }, // Break-even CPA in INR (₹450)
    targetRoas: { type: Number, default: 3.0 },
    cogsPercentage: { type: Number, default: 30 }, // 30% COGS
    rtoRate: { type: Number, default: 20 }, // 20% RTO Rate
    averageOrderValue: { type: Number, default: 999 }, // Product Selling Price / AOV (₹)

    // Subscription & Shopify Billing API
    planName: { type: String, default: "trial" },
    planPrice: { type: Number, default: 0 },
    planStatus: {
      type: String,
      enum: ["active", "cancelled", "expired", "trial"],
      default: "trial",
    },
    shopifyChargeId: { type: String, default: "" },
    trialEndsAt: { type: Date },

    // Integrations
    shopifyStoreUrl: { type: String, default: "" },
    customDomain: { type: String, default: "" },
    shopifyDomains: { type: [String], default: [] },
    shopifyAccessToken: { type: String, default: "" },
    shopifyApiSecret: { type: String, default: "" },
    shopifyStatus: {
      type: String,
      enum: ["connected", "failed", "not_connected"],
      default: "not_connected",
    },
    shopifyError: { type: String, default: "" },
    metaAccountId: { type: String, default: "" },
    metaAccessToken: { type: String, default: "" },
    previousMetaAccountIds: { type: [String], default: [] },
    metaStatus: {
      type: String,
      enum: ["connected", "failed", "not_connected"],
      default: "not_connected",
    },
    metaError: { type: String, default: "" },
    webhookRegistered: { type: Boolean, default: false },
    webhookStatus: {
      type: String,
      enum: ["live", "failed", "not_configured"],
      default: "not_configured",
    },
    webhookError: { type: String, default: "" },
    lastSyncAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Brand || mongoose.model("Brand", BrandSchema);
