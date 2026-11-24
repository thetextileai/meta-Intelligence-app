import mongoose from "mongoose";

export interface IDailyMetric {
  _id: string;
  brandId: mongoose.Types.ObjectId | string;
  date: string; // YYYY-MM-DD
  spend: number;
  sales: number;
  orders: number;
  paidSales?: number;
  paidOrders?: number;
  organicSales?: number;
  organicOrders?: number;
  metaPurchaseValue?: number;
  reach?: number;
  clicks: number;
  impressions: number;
  roas: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const DailyMetricSchema = new mongoose.Schema(
  {
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true, index: true },
    date: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
    spend: { type: Number, default: 0 },
    sales: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    paidSales: { type: Number, default: 0 },
    paidOrders: { type: Number, default: 0 },
    organicSales: { type: Number, default: 0 },
    organicOrders: { type: Number, default: 0 },
    metaPurchaseValue: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    roas: { type: Number, default: 0 },
  },
  { timestamps: true }
);

DailyMetricSchema.index({ brandId: 1, date: 1 }, { unique: true });

export default mongoose.models.DailyMetric || mongoose.model("DailyMetric", DailyMetricSchema);
