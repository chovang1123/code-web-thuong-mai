import dns from "node:dns";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import { EJSON } from "bson";
import { ENV } from "../config/env.js";
import { Product } from "../models/product.model.js";
import { categoryDefinitions, resolveCategory } from "../../../shared/catalog-taxonomy.mjs";

export async function readDemoSnapshot(file = new URL("./demo-catalog.ejson", import.meta.url)) {
  const snapshot = EJSON.parse(await readFile(file, "utf8"));
  if (snapshot.formatVersion !== 1 || snapshot.products?.length !== 1000 || snapshot.categories?.length !== 50) throw Error("Snapshot không đúng định dạng hoặc số lượng.");
  for (const key of ["_id", "seedKey"]) if (new Set(snapshot.products.map(p => String(p[key]))).size !== 1000) throw Error(`Snapshot trùng ${key}.`);
  if (new Set(snapshot.categories.map(c => c.slug)).size !== 50 || categoryDefinitions.some(c => !snapshot.categories.some(s => s.slug === c.slug && s.name === c.name))) throw Error("Danh mục trong snapshot không khớp cấu trúc chuẩn.");
  for (const p of snapshot.products) {
    if (!p.isDemo || !/^net-store-demo-v1:/.test(p.seedKey) || resolveCategory(p.categorySlug)?.name !== p.category || p.categories?.length !== 1 || p.categories[0] !== p.category || p.sellerId || p.passwordHash) throw Error("Snapshot chứa bản ghi ngoài dữ liệu mẫu hoặc danh mục không hợp lệ.");
    const error = new Product(p).validateSync();
    if (error) throw error;
  }
  return snapshot;
}

export async function importDemoSnapshot(db, snapshot) {
  const existing = await db.collection("categories").find().toArray();
  // Resolve IDs at the destination instead of copying foreign keys blindly.
  const ids = new Map(snapshot.categories.map(c => [c.slug, existing.find(old => old.slug === c.slug || old.name === c.name)?._id || c._id]));
  const categoryResult = await db.collection("categories").bulkWrite(categoryDefinitions.map(c => ({ updateOne: {
    filter: { _id: ids.get(c.slug) }, update: { $setOnInsert: { ...c, _id: ids.get(c.slug), parent_id: c.parentSlug ? ids.get(c.parentSlug) : null } }, upsert: true,
  } })));
  const productResult = await db.collection("products").bulkWrite(snapshot.products.map(p => ({ updateOne: {
    filter: { _id: p._id }, update: { $setOnInsert: { ...p, categoryId: ids.get(p.categorySlug) } }, upsert: true,
  } })));
  return { inserted: productResult.upsertedCount, preserved: productResult.matchedCount, categoriesInserted: categoryResult.upsertedCount };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const snapshot = await readDemoSnapshot();
    if (!process.argv.includes("--apply")) console.log(JSON.stringify({ dryRun: true, products: snapshot.products.length, categories: snapshot.categories.length }));
    else {
      if (ENV.MONGO_DNS_SERVERS) dns.setServers(ENV.MONGO_DNS_SERVERS.split(",").map(s => s.trim()).filter(Boolean));
      await mongoose.connect(ENV.DB_URL || process.env.MONGO_URI, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 15000 });
      console.log(JSON.stringify(await importDemoSnapshot(mongoose.connection.db, snapshot)));
    }
  } catch (error) { console.error(String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, "[redacted]")); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
}
