import { test } from "node:test";
import assert from "node:assert/strict";
import { formatSales, isNewProduct, productDiscount } from "../src/lib/products.js";
const now = Date.parse("2026-11-25T00:00:00Z");
test("new badge respects 14-day age and real reviews/sales metadata", () => {
  assert.equal(isNewProduct({ createdAt: "2026-11-12", averageRating: 4.8, sold: 30 }, now), true);
  assert.equal(isNewProduct({ createdAt: "2026-10-01", averageRating: 4.8, sold: 30 }, now), false);
  assert.equal(isNewProduct({ createdAt: "2026-10-01", totalReviews: 0, sold: 0 }, now), true);
  assert.equal(isNewProduct({ createdAt: "2026-12-01", averageRating: 4.8 }, now), false);
});
test("price badges require actual original price; sales formatting preserves magnitude", () => {
  assert.equal(productDiscount({ price: 480000 }), 0);
  assert.equal(productDiscount({ price: 480000, originalPrice: 600000 }), 20);
  assert.equal(formatSales(1200), "1,2k");
  assert.equal(formatSales(25), "25");
});
