import mongoose from "mongoose";

export interface IProduct {
  _id: string;
  brandId: mongoose.Types.ObjectId | string;
  externalId: string;
  title: string;
  sku: string;
  price: number;
  inventoryQuantity: number;
  status: "active" | "draft" | "archived";
  imageUrl: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProductSchema = new mongoose.Schema(
  {
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true, index: true },
    externalId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    sku: { type: String, default: "" },
    price: { type: Number, default: 0 },
    inventoryQuantity: { type: Number, default: 0 },
    status: { type: String, default: "active", enum: ["active", "draft", "archived"] },
    imageUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

ProductSchema.index({ brandId: 1, externalId: 1 }, { unique: true });

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);
