import { shippingPolicy } from "./storeConfig.js";
import { couponDiscount } from "../../../shared/coupons.mjs";
export { couponDiscount } from "../../../shared/coupons.mjs";

export function shippingQuote(subtotal, policy = shippingPolicy) {
  const remaining = Math.max(0, policy.freeShippingThreshold - subtotal);
  const fee = remaining === 0 ? 0 : policy.baseFee;
  return { fee, remaining: fee === 0 ? 0 : remaining, progress: fee === 0 ? 100 : Math.min(100, Math.max(0, subtotal / policy.freeShippingThreshold * 100)) };
}
export function checkoutTotals(subtotal, coupon) {
  const shipping = shippingQuote(subtotal).fee;
  const discount = couponDiscount(subtotal, coupon);
  return { subtotal, shipping, discount, total: Math.max(0, subtotal + shipping - discount) };
}
