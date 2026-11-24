import { test } from "node:test";
import assert from "node:assert/strict";
import { getProductImage, imageCorrections } from "../src/lib/productImages.js";

test("known mismatches use a placeholder; replacement uploads keep their original URL", () => {
  for (const correction of imageCorrections) {
    assert.equal(getProductImage({ name: correction.name, images: [`https://images.unsplash.com/${correction.photo}?w=500`] }), "");
    assert.equal(getProductImage({ name: correction.name, images: ["https://cdn.example/new-photo.jpg"] }), "https://cdn.example/new-photo.jpg");
  }
  assert.equal(getProductImage({ name: "Chưa có ảnh", images: [] }), "");
});
