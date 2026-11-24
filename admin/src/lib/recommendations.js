import { productRating, productSold } from "./products.js";

export const historyKey = "net_store_recently_viewed";
const validView = item => item && typeof item._id === "string" && typeof item.name === "string" && typeof item.category === "string" && Number.isFinite(item.price) && item.price > 0;
const bySales = (a, b) => productSold(b) - productSold(a) || productRating(b) - productRating(a);

export function readViewHistory(storage) {
  try {
    const history = JSON.parse(storage?.getItem(historyKey) || "[]");
    return Array.isArray(history) ? history.filter(validView).slice(0, 20) : [];
  } catch { return []; }
}

export function recordProductView(history, product) {
  if (!validView(product)) return history;
  const { _id, name, category, price } = product;
  return [{ _id, name, category, price }, ...history.filter(item => item._id !== _id)].slice(0, 20);
}

export function recommendProducts(products, { history = [], currentProduct, limit = 5 } = {}) {
  const anchor = validView(currentProduct) ? currentProduct : history.find(validView);
  const candidates = products.filter(product => product._id !== anchor?._id && product.stock !== 0);
  if (anchor) {
    const matching = candidates.filter(product => product.category === anchor.category && product.price >= anchor.price * .7 && product.price <= anchor.price * 1.3)
      .sort((a, b) => Math.abs(a.price - anchor.price) - Math.abs(b.price - anchor.price) || bySales(a, b));
    if (matching.length) return { products: matching.slice(0, limit), reason: `Vì bạn đã xem ${anchor.name}`, detail: "Cùng danh mục, mức giá chênh lệch không quá 30%." };
  }
  return { products: [...candidates].sort(bySales).slice(0, limit), reason: "Những sản phẩm bán chạy dành cho bạn", detail: anchor ? "Chưa có sản phẩm tương tự phù hợp, hãy khám phá thêm các lựa chọn này." : "Khám phá sản phẩm được quan tâm trong cửa hàng." };
}

export function complementaryProducts(products, cart, limit = 3) {
  const ids = new Set(cart.map(product => product._id));
  const categories = new Set(cart.map(product => product.category));
  return products.filter(product => !ids.has(product._id) && categories.has(product.category) && product.stock !== 0).sort(bySales).slice(0, limit);
}
