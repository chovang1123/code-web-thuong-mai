import test from "node:test";
import assert from "node:assert/strict";
import { priceWebOrder } from "../src/services/order-pricing.js";

test("voucher totals are identical across payment methods and never negative", () => {
  for (const paymentMethod of ["cod", "vnpay"]) {
    for (const [couponCode, discountAmount, totalPrice] of [["NET10", 142500, 1282500], ["WELCOME50", 50000, 1375000], ["FREESHIP", 30000, 1395000]]) {
      assert.deepEqual(priceWebOrder(1425000, { paymentMethod, couponCode, expectedTotal: totalPrice }), { subtotal: 1425000, couponCode, discountAmount, totalPrice });
    }
  }
  assert.equal(priceWebOrder(4000, { couponCode: "WELCOME50" }).totalPrice, 0);
  assert.equal(priceWebOrder(10000, { couponCode: " net10 " }).couponCode, "NET10");
  assert.equal(priceWebOrder(10000).totalPrice, 10000);
});

test("invalid coupons, stale totals and invalid online amounts are rejected", () => {
  for (const paymentMethod of ["cod", "vnpay"]) {
    for (const couponCode of ["MISSING", {}, ["NET10"], 10]) assert.throws(() => priceWebOrder(10000, { couponCode, paymentMethod }), { statusCode: 400 });
    assert.throws(() => priceWebOrder(10000, { couponCode: "NET10", paymentMethod, expectedTotal: 1 }), { statusCode: 400 });
    assert.throws(() => priceWebOrder(10000, { paymentMethod, expectedTotal: "10000" }), { statusCode: 400 });
  }
  assert.throws(() => priceWebOrder(4000, { couponCode: "WELCOME50", paymentMethod: "vnpay" }), { statusCode: 400 });
  assert.throws(() => priceWebOrder(9999999999, { paymentMethod: "vnpay" }), { statusCode: 400 });
  assert.throws(() => priceWebOrder(6000, { paymentMethod: "vnpay" }), { statusCode: 400 });
  assert.equal(priceWebOrder(10000, { paymentMethod: "vnpay" }).totalPrice, 10000);
});
