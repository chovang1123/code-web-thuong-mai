import { Category } from "../models/category.model.js";
import { Product } from "../models/product.model.js";
import { categoryPath, resolveCategory } from "../../../shared/catalog-taxonomy.mjs";

export async function getCategoryCatalog({ includeEmpty = false } = {}) {
  const [categories, products] = await Promise.all([
    Category.find({ isArchived: { $ne: true } }).sort({ sortOrder: 1 }).lean(),
    Product.find().select("category categorySlug").lean(),
  ]);
  const direct = new Map(), totals = new Map();
  for (const p of products) {
    const c = resolveCategory(p.categorySlug || p.category);
    if (!c) continue;
    direct.set(c.slug, (direct.get(c.slug) || 0) + 1);
    for (const node of categoryPath(c.slug)) totals.set(node.slug, (totals.get(node.slug) || 0) + 1);
  }
  return categories.map(c => ({ ...c, id: String(c._id), directProductCount: direct.get(c.slug) || 0, productCount: totals.get(c.slug) || 0,
    isVisible: c.isVisible !== false && (totals.get(c.slug) || 0) > 0 && !categories.some(parent => parent.slug === c.parentSlug && parent.isVisible === false) }))
    .filter(c => includeEmpty || c.isVisible);
}
