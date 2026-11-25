// The current order API charges no delivery fee. Keep the UI consistent with it.
// Enable a nonzero baseFee only after the server supports the same shipping policy.
export const shippingPolicy = { freeShippingThreshold: 600000, baseFee: 0 };
export { coupons } from "../../../shared/coupons.mjs";
