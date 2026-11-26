// Coupon amounts are independent of payment method. Keep web and API in sync.
export const coupons = {
  NET10: { type: "percent", value: 10, label: "Giảm 10%" },
  WELCOME50: { type: "fixed", value: 50000, label: "Giảm 50.000đ" },
  FREESHIP: { type: "fixed", value: 30000, label: "Giảm 30.000đ" },
};

export function couponDiscount(subtotal, coupon) {
  return coupon ? Math.min(subtotal, Math.max(0, coupon.type === "percent" ? Math.round(subtotal * coupon.value / 100) : coupon.value)) : 0;
}
