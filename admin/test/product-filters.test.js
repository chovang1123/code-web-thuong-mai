import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultFilters, filterProducts } from "../src/lib/productFilters.js";
const products = [
  { _id: "a", name: "Sổ kế hoạch", category: "Văn phòng phẩm", price: 100000, originalPrice: 150000, averageRating: 4.5, sold: 50, createdAt: "2026-11-01", freeShipping: true },
  { _id: "b", name: "Kem dưỡng", category: "Làm đẹp", price: 200000, averageRating: 3.5, sold: 10, createdAt: "2026-11-20", freeShipping: false },
  { _id: "c", name: "Serum", category: "Làm đẹp", price: 300000, originalPrice: 400000, averageRating: 4.8, sold: 90, createdAt: "2026-11-10", freeShipping: true },
];
const ids = options => filterProducts(products, options).map(product => product._id);
test("category, price, rating and shipping compose without changing the original catalog", () => {
  assert.deepEqual(ids({ category: "Làm đẹp", filters: { ...defaultFilters, minPrice: "250000", maxPrice: "350000", rating: 4, freeShipping: true } }), ["c"]);
  assert.deepEqual(ids({ search: "so ke hoach" }), ["a"]);
  assert.deepEqual(ids({ filters: { ...defaultFilters, minPrice: "400000", maxPrice: "100000" } }), []);
  assert.deepEqual(products.map(product => product._id), ["a", "b", "c"]);
});
test("tabs and sort use real price, date, sale and sales metadata", () => {
  assert.deepEqual(ids({ tab: "sale", sort: "price-asc" }), ["a", "c"]);
  assert.deepEqual(ids({ tab: "new" }), ["b", "c", "a"]);
  assert.deepEqual(ids({ tab: "bestselling" }), ["c", "a", "b"]);
  assert.deepEqual(ids({ sort: "price-desc" }), ["c", "b", "a"]);
});
