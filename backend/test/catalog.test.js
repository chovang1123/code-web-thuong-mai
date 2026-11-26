import test from "node:test";
import assert from "node:assert/strict";
import { buildCatalog, summarizeCatalog } from "../src/seeds/catalog.js";
import { Product } from "../src/models/product.model.js";
import { categoryFields } from "../src/utils/product-categories.js";
import { productFamilies } from "../src/seeds/source-families.js";
import { readDemoSnapshot } from "../src/seeds/import-demo.js";

const catalog = buildCatalog({ now: new Date("2026-11-25T00:00:00Z") });

test("the exported snapshot contains exactly the same 1000 demo product IDs", async () => {
  const snapshot = await readDemoSnapshot();
  assert.equal(snapshot.products.length, 1000);
  assert.equal(snapshot.categories.length, 50);
  assert.deepEqual(snapshot.products.map(p => String(p._id)).sort(), catalog.products.map(p => p._id).sort());
  assert.ok(snapshot.products.every(p => p.createdAt instanceof Date));
});

test("1000 unique offers retain v1 identities across the canonical taxonomy", () => {
  assert.equal(catalog.products.length, 1000);
  assert.equal(new Set(catalog.products.map(product => product._id)).size, 1000);
  assert.equal(new Set(catalog.products.map(product => product.name)).size, 1000);
  assert.equal(new Set(catalog.products.map(product => product.seedKey)).size, 1000);
  const summary = summarizeCatalog(catalog);
  assert.equal(summary.categories, 50);
  assert.equal(summary.leafCategories, 40);
  for (const family of productFamilies) {
    const count = catalog.products.filter(p => p.seedKey.startsWith(`net-store-demo-v1:${family.slug}:`)).length;
    assert.ok(count >= 10 && count <= 30);
  }
  assert.deepEqual(buildCatalog({ now: new Date("2026-11-25T00:00:00Z") }), catalog);
});

test("sample metadata is valid, consistent and explicitly marked as demo data", () => {
  const names = new Set(catalog.categories.map(category => category.name));
  const slugs = new Set(catalog.categories.map(category => category.slug));
  for (const category of catalog.categories) {
    if (category.parentSlug) assert.ok(slugs.has(category.parentSlug));
  }
  for (const product of catalog.products) {
    assert.equal(new Product(product).validateSync(), undefined);
    assert.equal(product.isDemo, true);
    assert.equal(product.categories.length, 1);
    assert.ok(product.categorySlug);
    assert.ok(product.categories.every(name => names.has(name)));
    assert.ok(product.categories.includes(product.category));
    assert.ok(product.images.length > 0 && product.images.every(url => new URL(url).protocol === "https:"));
    assert.ok(Number.isInteger(product.price) && product.price > 0);
    assert.ok(product.averageRating >= 1 && product.averageRating <= 5);
    assert.ok(product.totalReviews > 0 && product.totalReviews <= product.sold);
    assert.ok(product.salesLast7Days > 0 && product.salesLast7Days <= product.sold);
    if (product.originalPrice) assert.ok(product.originalPrice > product.price);
  }
});

test("legacy cross placements become tags; new writes keep exactly one primary", async () => {
  const existing = { category: "Tai nghe", categories: ["Tai nghe", "Công nghệ", "Phụ kiện"] };
  const expected = { category: "Tai nghe & loa", categorySlug: "tai-nghe-loa", categories: ["Tai nghe & loa"], tags: ["phu-kien"], brand: "", gender: "", os: "" };
  assert.deepEqual(categoryFields({}, existing), expected);
  for (const categories of [["Công nghệ", "Phụ kiện", "Phụ kiện"], '["Công nghệ","Phụ kiện"]', " Công nghệ, Phụ kiện, "]) {
    assert.deepEqual(categoryFields({ category: "Tai nghe", categories }), expected);
  }
  assert.deepEqual(categoryFields({ tags: "Gọn nhẹ, Du lịch" }, existing).tags, ["Gọn nhẹ", "Du lịch", "phu-kien"]);
  const oldProduct = new Product({ name: "Old", description: "Legacy", category: "Nhà cửa", price: 1000 });
  await oldProduct.validate();
  assert.deepEqual([...oldProduct.categories], ["Nhà cửa"]);
});
