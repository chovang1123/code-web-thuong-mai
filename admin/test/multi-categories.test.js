import test from "node:test";
import assert from "node:assert/strict";
import { filterProducts } from "../src/lib/productFilters.js";
import { catalogCategories, categoryTree, inCategory } from "../src/lib/categories.js";
import { buildHomeShelves } from "../src/lib/homeCatalog.js";
import { getRecommendations, complementaryProducts } from "../src/lib/recommendations.js";

const products = [
  { _id: "headphones", name: "Tai nghe", category: "Tai nghe & loa", categorySlug: "tai-nghe-loa", tags: ["Phụ kiện"], brand: "Apple", price: 100000, stock: 10, sold: 400, averageRating: 4.2 },
  { _id: "charger", name: "Sạc", category: "Sạc & pin dự phòng", categorySlug: "sac-pin-du-phong", price: 90000, stock: 10, sold: 200, averageRating: 4.5 },
  { _id: "case", name: "Ốp", category: "Ốp & phụ kiện điện thoại", categorySlug: "op-phu-kien-dien-thoai", tags: ["Phụ kiện"], price: 80000, stock: 10, sold: 100, averageRating: 4.1 },
  { _id: "legacy", name: "Sổ", category: "Văn phòng phẩm", price: 100000 },
];

test("parents include descendants, exact leaves exclude tags, empty nodes are hidden", () => {
  assert.equal(filterProducts(products, { category: "Công nghệ" }).length, 3);
  assert.equal(filterProducts(products, { category: "Phụ kiện" }).length, 0);
  assert.equal(filterProducts(products, { search: "phu kien" }).length, 2);
  assert.equal(filterProducts(products, { search: "cong nghe" }).length, 3);
  assert.equal(filterProducts(products, { category: "Văn phòng phẩm" })[0]._id, "legacy");
  assert.equal(catalogCategories(products).filter(name => name === "Công nghệ").length, 1);
  assert.equal(buildHomeShelves(products).find(shelf => shelf.title === "Công nghệ").products.length, 3);
  assert.equal(categoryTree(products)[0].children.length, 3);
  assert.equal(inCategory(products[0], "tai-nghe-loa"), true);
  assert.equal(inCategory(products[0], "sac-pin-du-phong"), false);
});

test("facets apply only to relevant leaves and combine with existing filters", () => {
  assert.equal(filterProducts(products, { category: "Tai nghe & loa", filters: { brand: "Apple", minPrice: "", maxPrice: "" } }).length, 1);
  assert.equal(filterProducts(products, { category: "Tai nghe & loa", filters: { brand: "Samsung", minPrice: "", maxPrice: "" } }).length, 0);
  assert.equal(filterProducts(products, { category: "Công nghệ", filters: { gender: "nu", brand: "Samsung", minPrice: "", maxPrice: "" } }).length, 3);
});

test("recommendations and cart complements share any category, retaining exclusions and price limits", () => {
  assert.deepEqual(getRecommendations([products[0]], products).map(product => product._id), ["charger", "case"]);
  assert.deepEqual(complementaryProducts(products, [products[0]]).map(product => product._id), ["charger", "case"]);
});
