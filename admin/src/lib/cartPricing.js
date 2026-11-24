import { shippingPolicy } from "./storeConfig.js";

export function shippingQuote(subtotal, policy = shippingPolicy) {
  const remaining = Math.max(0, policy.freeShippingThreshold - subtotal);
  const fee = remaining === 0 ? 0 : policy.baseFee;
  return { fee, remaining: fee === 0 ? 0 : remaining, progress: fee === 0 ? 100 : Math.min(100, Math.max(0, subtotal / policy.freeShippingThreshold * 100)) };
}
export function couponDiscount(subtotal, coupon) {
  return coupon ? Math.min(subtotal, Math.max(0, coupon.type === "percent" ? Math.round(subtotal * coupon.value / 100) : coupon.value)) : 0;
}
export function checkoutTotals(subtotal, coupon, method = "cod") {
  const shipping = shippingQuote(subtotal).fee;
  // Existing server supports coupons only for VNPay; COD must show the full amount.
  const discount = method === "vnpay" ? couponDiscount(subtotal, coupon) : 0;
  return { subtotal, shipping, discount, total: Math.max(0, subtotal + shipping - discount) };
}
