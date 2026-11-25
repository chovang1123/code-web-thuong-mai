import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import mongoose from "mongoose";
import { EJSON } from "bson";
import { buildMigrationPlan, runMigration, rollbackMigration, metadataFields } from "../src/migrations/catalog-v2.js";
import { categoryDefinitions, canonicalProductFields, resolveCategory } from "../../shared/catalog-taxonomy.mjs";
import express from "express";
import { categoryPageRoutes, categoryPageMeta } from "../src/routes/category-pages.route.js";
import { getCategoryCatalog } from "../src/services/catalog.js";
import { readDemoSnapshot, importDemoSnapshot } from "../src/seeds/import-demo.js";

const categories = ["Điện thoại iPhone", "Phấn mắt", "Phấn phủ", "Thức ăn thú cưng", "Thú cưng"].map((name, index) => ({ _id: new mongoose.Types.ObjectId(), name, slug: `old-${index}`, parentSlug: null }));
const products = categories.slice(0, 4).map((c, index) => ({ _id: new mongoose.Types.ObjectId(), name: index === 0 ? "iPhone 15" : c.name, category: c.name, categories: [c.name, index === 0 ? "Công nghệ" : "Làm đẹp"], brand: "Net Select", price: 50000, stock: 9, sold: 21, createdAt: new Date("2026-01-01") }));
test("mapping has 50 unique nodes, two levels, distinct eye/face slugs and conservative attributes", () => {
  assert.equal(categoryDefinitions.length, 50);
  assert.equal(new Set(categoryDefinitions.map(c => c.slug)).size, 50);
  assert.notEqual(resolveCategory("Trang điểm mắt").slug, resolveCategory("Trang điểm mặt").slug);
  for (const c of categoryDefinitions) {
    const children = categoryDefinitions.filter(child => child.parentSlug === c.slug);
    assert.notEqual(children.length, 1);
    if (c.parentSlug) assert.equal(resolveCategory(c.parentSlug).parentSlug, null);
  }
  const fields = canonicalProductFields(products[0]);
  assert.equal(fields.brand, "Apple"); assert.equal(fields.os, "ios");
  assert.deepEqual(fields.categories, ["Điện thoại"]);
  assert.equal(canonicalProductFields({ category: "Trang sức", name: "Bông tai bạc" }).gender, "");
  assert.equal(canonicalProductFields({ category: "Túi xách & ba lô", name: "Túi nữ màu đen" }).gender, "nu");
  assert.throws(() => buildMigrationPlan(categories, [{ category: "Không có mapping" }]), /mapping/);
});

test("migration and rollback preserve IDs/business fields on an isolated replica set", async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "net-catalog-test-"));
  const probe = net.createServer().listen(0, "127.0.0.1"); await once(probe, "listening");
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const binary = process.env.MONGOD_BIN || "mongod";
  const processDB = spawn(binary, ["--dbpath", directory, "--port", String(port), "--bind_ip", "127.0.0.1", "--replSet", "catalog", "--oplogSize", "128"], { windowsHide: true, stdio: "ignore" });
  let launchError; processDB.on("error", error => { launchError = error; });
  t.after(async () => { await mongoose.disconnect(); const stopped = once(processDB, "exit"); processDB.kill(); await stopped.catch(() => {}); await rm(directory, { recursive: true, force: true }); });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (launchError) throw launchError;
    try { await mongoose.connect(`mongodb://127.0.0.1:${port}/catalog_test?directConnection=true`, { serverSelectionTimeoutMS: 200 }); break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  const db = mongoose.connection.db;
  assert.ok(db, "MongoDB tạm không kết nối được; kiểm tra quyền mở localhost.");
  await db.admin().command({ replSetInitiate: { _id: "catalog", members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
  for (let attempt = 0; attempt < 100; attempt++) { if ((await db.admin().command({ hello: 1 })).isWritablePrimary) break; await new Promise(resolve => setTimeout(resolve, 100)); }
  await db.collection("categories").insertMany(categories);
  await db.collection("products").insertMany(products);
  await db.collection("orders").insertOne({ status: "pending", amount: 250000 });
  const originalOrders = EJSON.stringify(await db.collection("orders").find().toArray());
  const dry = await runMigration(db, path.join(directory, "backups"));
  assert.equal(dry.applied, false);
  assert.equal((await db.collection("categories").countDocuments()), categories.length);
  const result = await runMigration(db, path.join(directory, "backups"), true);
  assert.equal(result.applied, true);
  assert.equal(EJSON.parse(await readFile(result.backupPath, "utf8")).products.length, 4);
  const migrated = await db.collection("products").find().toArray();
  for (const p of migrated) {
    const before = products.find(old => String(old._id) === String(p._id));
    for (const key of Object.keys(before).filter(key => !metadataFields.includes(key))) assert.deepEqual(p[key], before[key]);
    assert.equal(p.categories.length, 1); assert.ok(p.categoryId);
  }
  const repeat = await runMigration(db, path.join(directory, "backups"), true);
  assert.equal(repeat.applied, false); assert.equal(repeat.productChanges, 0); assert.equal(repeat.categoryChanges, 0);
  const visible = await getCategoryCatalog();
  assert.equal(visible.find(c => c.slug === "cong-nghe").productCount, 1);
  assert.ok(!visible.some(c => c.slug === "van-phong-pham"));
  const app = express(); app.use(categoryPageRoutes); app.get("/danh-muc/:slug", (req, res) => res.send(categoryPageMeta("<head><title>Store</title></head>", req.params.slug, "https://store.test")));
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening"); t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const redirect = await fetch(origin + "/danh-muc/iphone?q=abc", { redirect: "manual" });
  assert.equal(redirect.status, 301); assert.equal(redirect.headers.get("location"), "/danh-muc/dien-thoai?q=abc");
  assert.equal((await fetch(origin + "/danh-muc/unknown")).status, 404);
  assert.match(await (await fetch(origin + "/danh-muc/dien-thoai")).text(), /Công nghệ — Điện thoại/);
  const sitemap = await (await fetch(origin + "/sitemap.xml")).text();
  assert.match(sitemap, /danh-muc\/dien-thoai/); assert.doesNotMatch(sitemap, /danh-muc\/iphone</); assert.doesNotMatch(sitemap, /van-phong-pham/);
  await db.collection("products").updateOne({ _id: products[0]._id }, { $set: { stock: 7 } });
  await rollbackMigration(db, result.backupPath);
  const restored = await db.collection("products").findOne({ _id: products[0]._id });
  assert.equal(restored.stock, 7); assert.equal(restored.category, products[0].category); assert.equal(restored.categorySlug, undefined);
  assert.equal(await db.collection("categories").countDocuments(), categories.length);
  assert.equal(EJSON.stringify(await db.collection("orders").find().toArray()), originalOrders);
  const snapshot = await readDemoSnapshot();
  const firstImport = await importDemoSnapshot(db, snapshot);
  assert.equal(firstImport.inserted, 1000);
  assert.equal(await db.collection("products").countDocuments(), products.length + 1000);
  const sample = snapshot.products[0];
  const imported = await db.collection("products").findOne({ _id: sample._id });
  assert.equal(imported.price, sample.price);
  assert.equal(imported.createdAt.getTime(), sample.createdAt.getTime());
  assert.equal(String(imported.categoryId), String((await db.collection("categories").findOne({ slug: sample.categorySlug }))._id));
  await db.collection("products").updateOne({ _id: sample._id }, { $set: { stock: 99 } });
  assert.equal((await importDemoSnapshot(db, snapshot)).inserted, 0);
  assert.equal((await db.collection("products").findOne({ _id: sample._id })).stock, 99);
  assert.equal((await db.collection("products").findOne({ _id: products[0]._id })).stock, 7);
  assert.equal(EJSON.stringify(await db.collection("orders").find().toArray()), originalOrders);
});
