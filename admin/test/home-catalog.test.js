import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHomeShelves, featuredProducts } from "../src/lib/homeCatalog.js";
const products = Array.from({ length: 110 }, (_, index) => ({ _id: String(index), name: `Sản phẩm ${index}`, category: "Nhà cửa", price: 100000, createdAt: "2026-11-25" }));
test("100 extra products cannot grow shelf count or render more than 12 cards per shelf", () => {
  const small = buildHomeShelves(products.slice(0, 10));
  const large = buildHomeShelves(products);
  assert.equal(small.length, large.length);
  assert.ok(large.every(shelf => shelf.products.length <= 12));
  assert.ok(!large.some(shelf => shelf.kind === "weekly" || shelf.kind === "discounts"));
  assert.deepEqual(buildHomeShelves(products.slice(0, 2)), []);
});
test("weekly and discount shelves require actual metadata and respect thresholds", () => {
  const actual = products.slice(0, 4).map((product, index) => ({ ...product, salesLast7Days: index + 1, originalPrice: index === 0 ? 110000 : 150000 }));
  const shelves = buildHomeShelves(actual);
  assert.equal(shelves[0].kind, "weekly");
  assert.equal(shelves[0].products[0].salesLast7Days, 4);
  assert.equal(shelves.find(shelf => shelf.kind === "discounts").products.length, 3);
  assert.equal(featuredProducts(actual).length, 4);
});
test("search retains exact matches even below the three-product merchandising threshold", () => {
  assert.equal(buildHomeShelves(products.slice(0, 1), { search: "Sản phẩm 0" })[0].minItems, 1);
});
