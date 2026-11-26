import { categoryDefinitions, categoryPath, filterFields, resolveCategory } from '../../../shared/catalog-taxonomy.mjs';
import type { Product } from '../types';
export { categoryDefinitions, categoryPath, filterFields, resolveCategory };

export const PAGE_SIZE = 12;
export const normalize = (value: string) => value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
export const inCategory = (product: Product, category: string) => !category || categoryPath(product.categorySlug || product.category).some(node => node.slug === category || node.name === category) || product.category === category;
export const discount = (product: Product) => product.originalPrice && product.originalPrice > product.price ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
export function categoryTree(products: Product[]) {
  return categoryDefinitions.filter(node => !node.parentSlug).map(root => ({ ...root,
    count: products.filter(product => inCategory(product, root.slug)).length,
    children: categoryDefinitions.filter(child => child.parentSlug === root.slug && products.some(product => inCategory(product, child.slug))),
  })).filter(root => root.count > 0);
}
export interface CatalogFilters { category: string; collection: string; query: string; min: string; max: string; sort: string; stock: boolean; brand: string; gender: string; os: string }
export const emptyFilters: CatalogFilters = { category: '', collection: '', query: '', min: '', max: '', sort: 'newest', stock: false, brand: '', gender: '', os: '' };
export function filterCatalog(products: Product[], filters: CatalogFilters) {
  const query = normalize(filters.query.trim());
  const facets = filterFields(filters.category);
  const result = products.filter(product => inCategory(product, filters.category) &&
    (filters.collection !== 'weekly' || (product.salesLast7Days || 0) > 0) && (filters.collection !== 'discounts' || discount(product) >= 15) &&
    (!query || normalize(`${product.name} ${product.category} ${product.brand || ''} ${product.sellerName || ''}`).includes(query)) &&
    (!filters.min || product.price >= Number(filters.min)) && (!filters.max || product.price <= Number(filters.max)) &&
    (!filters.stock || product.stock > 0) && (!facets.brand || !filters.brand || product.brand === filters.brand) &&
    (!facets.gender || !filters.gender || product.gender === filters.gender) && (!facets.os || !filters.os || product.os === filters.os));
  return result.sort((a, b) => filters.collection === 'weekly' ? (b.salesLast7Days || 0) - (a.salesLast7Days || 0) : filters.collection === 'discounts' ? discount(b) - discount(a) : filters.sort === 'price-asc' ? a.price - b.price : filters.sort === 'price-desc' ? b.price - a.price :
    filters.sort === 'popular' ? (b.sold || 0) - (a.sold || 0) : (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0));
}
export function homeShelves(products: Product[]) {
  const shelves: { id: string; title: string; products: Product[]; category?: string }[] = [];
  const add = (id: string, title: string, items: Product[], category?: string) => {
    if (items.length) shelves.push({ id, title, products: items.slice(0, 6), category });
  };
  add('weekly', 'Bán chạy tuần này', products.filter(product => (product.salesLast7Days || 0) > 0).sort((a, b) => (b.salesLast7Days || 0) - (a.salesLast7Days || 0)));
  add('discounts', 'Đang giảm giá', products.filter(product => discount(product) >= 15).sort((a, b) => discount(b) - discount(a)));
  for (const root of categoryTree(products).slice(0, 4)) add(root.slug, root.name, filterCatalog(products, { ...emptyFilters, category: root.slug }), root.slug);
  if (!shelves.length) add('discover', 'Khám phá sản phẩm', filterCatalog(products, emptyFilters));
  return shelves.slice(0, 6);
}
export function paginate<T>(items: T[], requested: number, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.max(1, Math.min(requested, pages));
  return { items: items.slice((page - 1) * size, page * size), page, pages, total: items.length };
}
