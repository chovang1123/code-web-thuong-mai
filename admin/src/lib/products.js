import { withSellerDetails } from "./marketplace.js";

export const formatPrice = value => `${Math.max(0, Number(value) || 0).toLocaleString("vi-VN")}đ`;
export const productRating = product => Number(product.averageRating ?? product.rating ?? 0);
export const productSold = product => Number(product.sold ?? product.totalSold ?? 0);
export const productDiscount = product => product.originalPrice > product.price
  ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
export const isFreeShipping = product => product.freeShipping !== false;

export function decorateProduct(product, index = 0) {
  return { ...withSellerDetails(product, index), originalPrice: product.originalPrice || product.price,
    discountPercent: productDiscount(product), sold: productSold(product) };
}
