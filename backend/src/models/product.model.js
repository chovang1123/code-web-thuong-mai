import mongoose from "mongoose";
import { normalizeCategories } from "../utils/product-categories.js";
import { resolveCategory } from "../../../shared/catalog-taxonomy.mjs";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    category: {
      type: String,
      required: true,
    },
    categories: { type: [String], default: [], index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", index: true },
    categorySlug: { type: String, index: true },
    tags: { type: [String], default: [] },
    gender: { type: String, enum: ["", "nam", "nu", "unisex"], default: "" },
    os: { type: String, enum: ["", "ios", "android"], default: "" },
    sold: { type: Number, min: 0, default: 0 },
    salesLast7Days: { type: Number, min: 0, default: 0 },
    originalPrice: { type: Number, min: 0 },
    isPinned: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
    seedKey: { type: String, unique: true, sparse: true },
    brand: {
      type: String,
      trim: true,
    },
    sellerName: {
      type: String,
      trim: true,
    },
    sellerLocation: {
      type: String,
      trim: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    images: [
      {
        type: String,
        required: true,
      },
    ],
    imagePublicIds: { type: [String], default: [] },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

productSchema.pre("validate", function () {
  if (this.categorySlug) {
    const canonical = resolveCategory(this.categorySlug);
    if (!canonical || canonical.slug !== this.categorySlug || canonical.name !== this.category) this.invalidate("categorySlug", "Danh mục không hợp lệ");
  }
  this.categories = this.categorySlug ? [this.category] : normalizeCategories(this.categories, this.category);
  if (!this.category) this.category = this.categories[0];
});

export const Product = mongoose.model("Product", productSchema);
