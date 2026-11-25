import { categoryDefinitions, resolveCategory, categoryPath } from "../../../shared/catalog-taxonomy.mjs";
export { categoryDefinitions, resolveCategory, categoryPath, filterFields } from "../../../shared/catalog-taxonomy.mjs";

// Membership comes only from the primary category. Tags never expand it.
export function productCategories(product) {
  const path = categoryPath(product.categorySlug || product.category);
  return path.length ? path.map(c => c.name) : [product.category].filter(Boolean);
}
export function inCategory(product, category) {
  const target = resolveCategory(category);
  return target ? categoryPath(product.categorySlug || product.category).some(c => c.slug === target.slug) : product.category === category;
}
export function categoryTree(products, catalog = []) {
  const definitions = catalog.length ? catalog : categoryDefinitions;
  const counts = new Map();
  for (const product of products) for (const c of categoryPath(product.categorySlug || product.category)) counts.set(c.slug, (counts.get(c.slug) || 0) + 1);
  const nodes = definitions.map(c => ({ ...c, productCount: counts.get(c.slug) || 0 }))
    .filter(c => c.isVisible !== false && !c.isArchived && c.productCount > 0);
  return nodes.filter(c => !c.parentSlug).map(c => ({ ...c, children: nodes.filter(child => child.parentSlug === c.slug) }));
}
export const catalogCategories = products => categoryTree(products).map(c => c.name);
export const sharesCategory = (first, second) => {
  const firstPath = categoryPath(first.categorySlug || first.category);
  const secondPath = categoryPath(second.categorySlug || second.category);
  return firstPath.length && secondPath.length ? firstPath[0].slug === secondPath[0].slug : first.category === second.category;
};
