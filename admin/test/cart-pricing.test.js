import { test } from "node:test";
import assert from "node:assert/strict";
import { checkoutTotals, couponDiscount, shippingQuote } from "../src/lib/cartPricing.js";
import { coupons } from "../src/lib/storeConfig.js";
test("shipping progress and threshold use configurable values", () => {
  assert.deepEqual(shippingQuote(480000, { freeShippingThreshold: 600000, baseFee: 30000 }), { fee: 30000, remaining: 120000, progress: 80 });
  assert.equal(shippingQuote(600000, { freeShippingThreshold: 600000, baseFee: 30000 }).fee, 0);
  assert.equal(shippingQuote(100000).fee, 0);
});
test("coupons cap at subtotal and apply equally to COD and VNPay", () => {
  assert.equal(couponDiscount(10000, coupons.WELCOME50), 10000);
  assert.equal(couponDiscount(123456, coupons.NET10), 12346);
  assert.equal(checkoutTotals(480000, coupons.NET10, "cod").total, 432000);
  assert.equal(checkoutTotals(480000, coupons.NET10, "vnpay").total, 432000);
  assert.equal(checkoutTotals(1425000, coupons.NET10).total, 1282500);
  assert.equal(checkoutTotals(480000, coupons.WELCOME50).total, 430000);
  assert.equal(checkoutTotals(480000, coupons.FREESHIP).total, 450000);
  assert.equal(checkoutTotals(10000, coupons.WELCOME50).total, 0);
});
