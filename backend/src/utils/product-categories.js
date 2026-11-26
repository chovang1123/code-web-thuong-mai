import { Category } from "../models/category.model.js";
import { canonicalProductFields } from "../../../shared/catalog-taxonomy.mjs";

// Accept JSON arrays (multipart forms) and comma-separated input, as well as JSON bodies.
export function normalizeCategories(value, primary = "") {
  let items = value;
  if (typeof items === "string") {
    try { items = JSON.parse(items); } catch { items = items.split(","); }
  }
  if (!Array.isArray(items)) items = [];
  return [...new Set([primary, ...items].filter(item => typeof item === "string").map(item => item.trim()).filter(Boolean))];
}

export function categoryFields(data, existing = {}) {
  const base = existing.toObject ? existing.toObject() : existing;
  const primary = data.categorySlug || data.category || base.categorySlug || base.category;
  return canonicalProductFields({ ...base, ...data, categorySlug: "", category: primary,
    categories: normalizeCategories(data.categories ?? base.categories),
    tags: data.tags === undefined ? base.tags || [] : normalizeCategories(data.tags) });
}
export async function resolveProductCategory(data, existing = {}) {
  const fields = categoryFields(data, existing);
  const category = await Category.findOne({ slug: fields.categorySlug, isArchived: { $ne: true } });
  if (!category) { const error = new Error("Danh mục chưa được thiết lập."); error.status = 400; throw error; }
  return { ...fields, categoryId: category._id };
}
