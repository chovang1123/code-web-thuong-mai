import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { decorateProduct } from "../src/lib/products.js";

test("normalization preserves API names and never fabricates a shop or brand", () => {
  const product = { _id: "db-id", name: "Nét nguyên bản", category: "Nhà cửa", price: 123000, images: [] };
  const result = decorateProduct(product);
  assert.equal(result.name, product.name);
  assert.equal(result.sellerName, undefined);
  assert.equal(result.brand, undefined);
  assert.equal(result.sellerLocation, undefined);
  assert.equal(result.price, product.price);
});
test("loading the admin panel cannot automatically seed products", () => {
  const source = fs.readFileSync(new URL("../src/AdminPanel.jsx", import.meta.url), "utf8");
  assert.ok(!source.includes("/products/seed"));
  const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.ok(!app.includes("fallbackProducts"));
});
