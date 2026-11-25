import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { setTimeout as wait } from "node:timers/promises";
import { categoryDefinitions } from "../../shared/catalog-taxonomy.mjs";
const require = createRequire(import.meta.url);
const { JSDOM, VirtualConsole } = require(require.resolve("jsdom", { paths: [path.resolve("../mobile")] }));
async function until(predicate) {
  for (let i = 0; i < 200; i++) { const value = predicate(); if (value) return value; await wait(10); }
  throw Error("UI did not reach expected state");
}
test("root overflow, child routes, facets, breadcrumbs and pagination work together", async t => {
  const products = [...categoryDefinitions.filter(c => !categoryDefinitions.some(child => child.parentSlug === c.slug)), ...Array.from({ length: 80 }, () => categoryDefinitions.find(c => c.slug === "dien-thoai"))]
    .map((c, index) => ({ _id: `product-${index}`, name: `${c.name} ${index}`, category: c.name, categorySlug: c.slug, categories: [c.name], price: 100000, stock: 9, images: [], brand: index % 2 ? "Apple" : "Samsung", os: index % 2 ? "ios" : "android", gender: index % 2 ? "nam" : "nu" }));
  const dom = new JSDOM('<div id="root"></div>', { url: "https://store.test", runScripts: "outside-only", virtualConsole: new VirtualConsole() });
  t.after(() => dom.window.close());
  const w = dom.window, d = w.document;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  for (const [key, value] of Object.entries({ user: "UI test", email: "ui@test.local", role: "customer", token: "fixture" })) w.localStorage.setItem(`net_store_${key}`, value);
  w.fetch = async url => Response.json(url.endsWith("/products") ? products : url.endsWith("/categories") ? categoryDefinitions : url.endsWith("/cart/web") ? { cart: { items: [] } } : []);
  const dist = path.resolve("dist");
  const asset = fs.readFileSync(path.join(dist, "index.html"), "utf8").match(/src="\/([^"]+\.js)"/)[1];
  w.eval(fs.readFileSync(path.join(dist, asset), "utf8"));
  await until(() => d.querySelectorAll('.category-chips[aria-label="Chọn danh mục"] button').length === 10);
  const button = (selector, text) => [...d.querySelectorAll(selector)].find(e => e.textContent === text);
  button('.category-chips button', 'Xem thêm').click();
  await until(() => d.querySelector('.category-more-dialog'));
  button('.category-more-dialog nav button', 'Văn phòng phẩm').click();
  await until(() => w.location.pathname === '/danh-muc/van-phong-pham');
  assert.equal(d.querySelector('.category-more-dialog'), null);
  button('.category-chips button', 'Công nghệ').click();
  await until(() => d.querySelectorAll('.child-category-chips button').length === 9);
  button('.child-category-chips button', 'Điện thoại').click();
  await until(() => w.location.pathname === '/danh-muc/dien-thoai');
  assert.match(d.querySelector('.category-breadcrumb').textContent, /Trang chủ\/Công nghệ\/Điện thoại/);
  assert.equal(d.querySelectorAll('.category-product-grid .product-card').length, 36);
  d.querySelector('.category-load-more').click();
  await until(() => d.querySelectorAll('.category-product-grid .product-card').length === 72);
  d.querySelector('.advanced-filter-button').click();
  await until(() => d.querySelector('select[aria-label="Hãng"]'));
  assert.equal(d.querySelector('select[aria-label="Giới tính"]'), null);
  const brand = d.querySelector('select[aria-label="Hãng"]'); brand.value = 'Apple'; brand.dispatchEvent(new w.Event('change', { bubbles: true }));
  await until(() => /Xem 40 sản phẩm/.test(d.querySelector('.filter-show-results').textContent));
  d.querySelector('[aria-label="Đóng bộ lọc"]').click();
  w.history.back();
  await until(() => w.location.pathname === '/danh-muc/cong-nghe' && /Công nghệ/.test(d.title));
  assert.equal(d.querySelectorAll('.category-product-grid .product-card').length, 36);
});
