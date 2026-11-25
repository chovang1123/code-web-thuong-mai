import { withSellerDetails } from "./marketplace.js";

export const formatPrice = value => `${Math.max(0, Number(value) || 0).toLocaleString("vi-VN")}đ`;
export const productRating = product => Number(product.averageRating ?? product.rating ?? 0);
export const productSold = product => Number(product.sold ?? product.totalSold ?? 0);
export const formatSales = value => value >= 1000000 ? `${(value / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr` : value >= 1000 ? `${(value / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}k` : value.toLocaleString("vi-VN");
export function isNewProduct(product, now = Date.now()) {
  const age = now - Date.parse(product.createdAt);
  return (Number.isFinite(age) && age >= 0 && age <= 14 * 86400000) || (!(product.totalReviews > 0 || productRating(product) > 0) && productSold(product) === 0);
}
export const productDiscount = product => product.originalPrice > product.price
  ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
export const isFreeShipping = product => product.freeShipping !== false;

export function decorateProduct(product, index = 0) {
  return { ...withSellerDetails(product, index), originalPrice: product.originalPrice || product.price,
    discountPercent: productDiscount(product), sold: productSold(product) };
}
