import { isFreeShipping, productDiscount, productRating, productSold } from "./products.js";
import { inCategory, productCategories, filterFields } from "./categories.js";

export const defaultFilters = { minPrice: "", maxPrice: "", rating: 0, freeShipping: false, onSale: false, gender: "", brand: "", os: "" };
export const normalizeText = value => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

export function filterProducts(products, { category = "Tất cả", search = "", filters = defaultFilters, tab = "featured", sort = "relevant" } = {}) {
  const query = normalizeText(search.trim());
  const facets = filterFields(category);
  const result = products.filter(product =>
    (category === "Tất cả" || inCategory(product, category)) &&
    normalizeText(`${product.name} ${product.description || ""} ${productCategories(product).join(" ")} ${(product.tags || []).join(" ").replaceAll("-", " ")} ${product.brand || ""} ${product.sellerName || ""}`).includes(query) &&
    Object.keys(facets).every(key => !facets[key] || !filters[key] || product[key] === filters[key]) &&
    (filters.minPrice === "" || product.price >= Number(filters.minPrice)) &&
    (filters.maxPrice === "" || product.price <= Number(filters.maxPrice)) &&
    productRating(product) >= Number(filters.rating || 0) &&
    (!filters.freeShipping || isFreeShipping(product)) &&
    (!(filters.onSale || tab === "sale") || productDiscount(product) > 0));
  const byFeatured = (a, b) => productRating(b) - productRating(a) || productSold(b) - productSold(a);
  const sorters = {
    relevant: tab === "bestselling" ? (a, b) => productSold(b) - productSold(a) : tab === "new" ? (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0) : tab === "sale" ? (a, b) => productDiscount(b) - productDiscount(a) : byFeatured,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    rating: (a, b) => productRating(b) - productRating(a),
    bestselling: (a, b) => productSold(b) - productSold(a),
    newest: (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0),
  };
  return result.sort(sorters[sort] || byFeatured);
}
