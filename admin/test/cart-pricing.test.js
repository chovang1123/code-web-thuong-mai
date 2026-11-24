import { test } from "node:test";
import assert from "node:assert/strict";
import { checkoutTotals, couponDiscount, shippingQuote } from "../src/lib/cartPricing.js";
import { coupons } from "../src/lib/storeConfig.js";
test("shipping progress and threshold use configurable values", () => {
  assert.deepEqual(shippingQuote(480000, { freeShippingThreshold: 600000, baseFee: 30000 }), { fee: 30000, remaining: 120000, progress: 80 });
  assert.equal(shippingQuote(600000, { freeShippingThreshold: 600000, baseFee: 30000 }).fee, 0);
  assert.equal(shippingQuote(100000).fee, 0);
});
test("coupons cap at subtotal; COD and VNPay totals match current server rules", () => {
  assert.equal(couponDiscount(10000, coupons.WELCOME50), 10000);
  assert.equal(couponDiscount(123456, coupons.NET10), 12346);
  assert.equal(checkoutTotals(480000, coupons.NET10, "cod").total, 480000);
  assert.equal(checkoutTotals(480000, coupons.NET10, "vnpay").total, 432000);
});
