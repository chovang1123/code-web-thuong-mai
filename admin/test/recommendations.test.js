import { test } from "node:test";
import assert from "node:assert/strict";
import { complementaryProducts, getRecommendations, readViewHistory, recordProductView, recommendProducts } from "../src/lib/recommendations.js";
const products = [
  { _id: "viewed", name: "Sổ kế hoạch", category: "Văn phòng phẩm", price: 100000, sold: 1 },
  { _id: "cheap", name: "Sổ nhỏ", category: "Văn phòng phẩm", price: 70000, sold: 3 },
  { _id: "high", name: "Sổ lớn", category: "Văn phòng phẩm", price: 130000, sold: 2 },
  { _id: "outside", name: "Sổ cao cấp", category: "Văn phòng phẩm", price: 131000, sold: 10 },
  { _id: "other", name: "Kem dưỡng", category: "Làm đẹp", price: 100000, sold: 200 },
];
test("recommendations respect category, inclusive ±30% boundaries, and exclude viewed product", () => {
  const result = recommendProducts(products, { history: [products[0]] });
  assert.deepEqual(result.products.map(item => item._id), ["cheap", "high"]);
  assert.match(result.reason, /Sổ kế hoạch/);
  assert.equal(recommendProducts(products, { history: [products[0]], limit: 1 }).products.length, 1);
});
test("without current API history recommendations are hidden; stale stored prices do not override DB", () => {
  assert.deepEqual(recommendProducts(products).products, []);
  assert.deepEqual(getRecommendations([{ ...products[0], _id: "deleted" }], products), []);
  assert.deepEqual(getRecommendations([{ ...products[0], price: 999999 }], products).map(item => item._id), ["cheap", "high"]);
  assert.deepEqual(getRecommendations([products[0], products[1]], products, { cart: [products[2]] }), []);
});
test("history is bounded, deduplicated and tolerates invalid/unavailable storage", () => {
  const history = Array.from({ length: 25 }, (_, index) => ({ ...products[0], _id: String(index) }));
  const recorded = recordProductView(history, { ...products[0], _id: "5" });
  assert.equal(recorded.length, 10);
  assert.equal(recorded.filter(item => item._id === "5").length, 1);
  for (const value of ["null", "{}", "broken", '[{"_id":1}]']) assert.deepEqual(readViewHistory({ getItem: () => value }), []);
  assert.deepEqual(readViewHistory({ getItem: () => { throw Error("blocked"); } }), []);
});
test("cart suggestions share a category and exclude every cart item", () => {
  assert.deepEqual(complementaryProducts(products, [products[0], products[1]]).map(item => item._id), ["outside", "high"]);
});
