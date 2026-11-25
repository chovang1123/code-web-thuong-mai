import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true },
  parentSlug: { type: String, default: null, index: true },
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null, index: true },
  isVisible: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false, index: true },
  description: { type: String, default: "" },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

export const Category = mongoose.model("Category", categorySchema);
