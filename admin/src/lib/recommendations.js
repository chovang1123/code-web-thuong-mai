import { productRating, productSold } from "./products.js";

export const historyKey = "net_store_recently_viewed";
const validView = item => item && typeof item._id === "string" && typeof item.name === "string" && typeof item.category === "string" && Number.isFinite(item.price) && item.price >= 0;
const bySales = (a, b) => productSold(b) - productSold(a) || productRating(b) - productRating(a);

export function readViewHistory(storage) {
  try {
    const history = JSON.parse(storage?.getItem(historyKey) || "[]");
    return Array.isArray(history) ? history.filter(validView).slice(0, 10) : [];
  } catch { return []; }
}

export function recordProductView(history, product) {
  if (!validView(product)) return history;
  const { _id, name, category, price } = product;
  return [{ _id, name, category, price }, ...history.filter(item => item._id !== _id)].slice(0, 10);
}

export function getRecommendations(recentlyViewed, allProducts, { cart = [], limit = 12 } = {}) {
  const recent = recentlyViewed.filter(validView).slice(0, 10);
  // Resolve the anchor from the latest API catalog; deleted/stale records cannot
  // introduce products, names or prices that are no longer in the database.
  const anchor = allProducts.find(product => product._id === recent[0]?._id);
  if (!anchor) return [];
  const excluded = new Set([...recent.map(product => product._id), ...cart.map(product => product._id)]);
  return allProducts.filter(product => !excluded.has(product._id) && product.stock !== 0 && product.category === anchor.category && product.price >= anchor.price * .7 && product.price <= anchor.price * 1.3)
    .sort((a, b) => productRating(b) - productRating(a) || bySales(a, b) || Math.abs(a.price - anchor.price) - Math.abs(b.price - anchor.price)).slice(0, limit);
}

export function recommendProducts(products, { history = [], currentProduct, cart = [], limit = 12 } = {}) {
  const recent = validView(currentProduct) ? recordProductView(history, currentProduct) : history;
  const anchor = products.find(product => product._id === recent[0]?._id);
  return { products: getRecommendations(recent, products, { cart, limit }), reason: anchor ? `Vì bạn đã xem ${anchor.name}` : "", detail: "Cùng danh mục, mức giá chênh lệch không quá 30%." };
}

export function complementaryProducts(products, cart, limit = 3) {
  const ids = new Set(cart.map(product => product._id));
  const categories = new Set(cart.map(product => product.category));
  return products.filter(product => !ids.has(product._id) && categories.has(product.category) && product.stock !== 0).sort(bySales).slice(0, limit);
}
