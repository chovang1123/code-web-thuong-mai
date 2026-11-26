import { coupons, couponDiscount } from "../../../shared/coupons.mjs";
import { validVnpayAmount } from "./payment-gateways.js";

export function priceWebOrder(subtotal, { couponCode, expectedTotal, paymentMethod = "cod" } = {}) {
  if (couponCode != null && typeof couponCode !== "string") {
    throw Object.assign(new Error("Mã giảm giá không hợp lệ."), { statusCode: 400 });
  }
  const code = couponCode?.trim().toUpperCase() || "";
  if (code && !Object.hasOwn(coupons, code)) {
    throw Object.assign(new Error("Mã giảm giá không hợp lệ."), { statusCode: 400 });
  }
  const discountAmount = couponDiscount(subtotal, code ? coupons[code] : undefined);
  const totalPrice = subtotal - discountAmount;
  if (!Number.isSafeInteger(subtotal) || subtotal < 0 || !Number.isSafeInteger(totalPrice) || totalPrice < 0 ||
      (paymentMethod === "vnpay" && !validVnpayAmount(totalPrice)) ||
      (expectedTotal !== undefined && expectedTotal !== totalPrice)) {
    throw Object.assign(new Error("Tổng tiền đã thay đổi hoặc nằm ngoài hạn mức. Vui lòng kiểm tra lại giỏ hàng."), { statusCode: 400 });
  }
  return { subtotal, discountAmount, totalPrice, ...(code ? { couponCode: code } : {}) };
}
