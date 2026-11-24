import mongoose from "mongoose";

export interface IOrder {
  _id: string;
  brandId: mongoose.Types.ObjectId | string;
  externalId: string;
  orderNumber: string;
  orderDate: Date;
  customerName: string;
  customerEmail: string;
  customerId: string;
  total: number;
  subtotal: number;
  currency: string;
  financialStatus: string;
  fulfillmentStatus: string;
  itemCount: number;
  cancelledAt?: Date | null;
  cancelReason?: string;
  sourceType?: "paid" | "organic";
  utmSource?: string;
  utmCampaign?: string;
  utmMedium?: string;
  lineItems: Array<{
    title: string;
    quantity: number;
    price: number;
    sku: string;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

const OrderSchema = new mongoose.Schema(
  {
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true, index: true },
    externalId: { type: String, required: true, index: true },
    orderNumber: { type: String, required: true },
    orderDate: { type: Date, default: Date.now, index: true },
    customerName: { type: String, default: "Guest Customer" },
    customerEmail: { type: String, default: "" },
    customerId: { type: String, default: "" },
    total: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    financialStatus: { type: String, default: "paid" },
    fulfillmentStatus: { type: String, default: "unfulfilled" },
    itemCount: { type: Number, default: 1 },
    cancelledAt: { type: Date, default: null, index: true },
    cancelReason: { type: String, default: "" },
    sourceType: { type: String, enum: ["paid", "organic"], default: "organic", index: true },
    utmSource: { type: String, default: "" },
    utmCampaign: { type: String, default: "" },
    utmMedium: { type: String, default: "" },
    lineItems: [
      {
        title: { type: String, default: "" },
        quantity: { type: Number, default: 1 },
        price: { type: Number, default: 0 },
        sku: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

OrderSchema.index({ brandId: 1, externalId: 1 }, { unique: true });
OrderSchema.index({ brandId: 1, cancelledAt: 1, orderDate: -1 });
OrderSchema.index({ cancelledAt: 1, orderDate: -1 });

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
