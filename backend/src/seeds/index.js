import dns from "node:dns";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { ENV } from "../config/env.js";
import { Product } from "../models/product.model.js";
import { Category } from "../models/category.model.js";
import { buildCatalog, summarizeCatalog } from "./catalog.js";

const catalog = buildCatalog();
// Validate the entire batch before opening a connection or writing anything.
for (const data of catalog.products) {
  const error = new Product(data).validateSync();
  if (error) throw error;
}
console.log(JSON.stringify(summarizeCatalog(catalog), null, 2));

if (!process.argv.includes("--dry-run")) {
  try {
    const uri = ENV.DB_URL || process.env.MONGO_URI;
    if (!uri) throw new Error("Set DB_URL or MONGO_URI before seeding.");
    if (uri.startsWith("mongodb+srv://") && ENV.MONGO_DNS_SERVERS?.trim()) {
      dns.setServers(ENV.MONGO_DNS_SERVERS.split(",").map(value => value.trim()).filter(Boolean));
    }
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000, autoCreate: false, autoIndex: false });
    const before = await Product.countDocuments();
    const existing = await Category.find().lean();
    const ids = new Map(catalog.categories.map(c => [c.slug, existing.find(old => old.slug === c.slug || old.name === c.name)?._id || new mongoose.Types.ObjectId(createHash("sha256").update(`catalog-v2:${c.slug}`).digest("hex").slice(0, 24))]));
    const categories = await Category.bulkWrite(catalog.categories.map(c => ({ updateOne: {
      filter: { _id: ids.get(c.slug) }, update: { $setOnInsert: { ...c, parent_id: c.parentSlug ? ids.get(c.parentSlug) : null } }, upsert: true,
    } })));
    const result = await Product.bulkWrite(catalog.products.map(product => ({ updateOne: {
      filter: { _id: product._id }, update: { $setOnInsert: { ...product, categoryId: ids.get(product.categorySlug) } }, upsert: true, timestamps: false,
    } })));
    const count = await Product.countDocuments({ seedKey: /^net-store-demo-v1:/ });
    if (count !== 1000) throw new Error(`Expected 1000 demo products, found ${count}.`);
    console.log(JSON.stringify({ database: mongoose.connection.name, before, inserted: result.upsertedCount,
      existingDemoProducts: result.matchedCount, demoProducts: count, total: await Product.countDocuments(),
      categoriesInserted: categories.upsertedCount, totalCategories: await Category.countDocuments() }, null, 2));
  } catch (error) {
    console.error("Seed failed:", error.code || error.name, String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, "[redacted]"));
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
