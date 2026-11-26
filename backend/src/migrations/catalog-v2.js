import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dns from "node:dns";
import mongoose from "mongoose";
import { EJSON } from "bson";
import { ENV } from "../config/env.js";
import { categoryDefinitions, canonicalProductFields, resolveCategory, categoryPath, filterFields } from "../../../shared/catalog-taxonomy.mjs";

export const metadataFields = ["category", "categoryId", "categorySlug", "categories", "tags", "brand", "gender", "os"];
const pick = (doc, keys) => Object.fromEntries(keys.filter(key => doc[key] !== undefined).map(key => [key, doc[key]]));
const sorted = value => Array.isArray(value) ? value.map(sorted) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
const same = (a, b) => JSON.stringify(sorted(EJSON.serialize(a))) === JSON.stringify(sorted(EJSON.serialize(b)));
export function buildMigrationPlan(categories, products) {
  if (new Set(categoryDefinitions.map(c => c.slug)).size !== categoryDefinitions.length) throw Error("Trùng slug danh mục đích.");
  const ids = new Map(categoryDefinitions.map(c => [c.slug, categories.find(old => old.slug === c.slug || old.name === c.name)?._id || new mongoose.Types.ObjectId(createHash("sha256").update(`catalog-v2:${c.slug}`).digest("hex").slice(0, 24))]));
  const targets = categoryDefinitions.map(c => ({ ...c, _id: ids.get(c.slug), parent_id: c.parentSlug ? ids.get(c.parentSlug) : null }));
  const patches = products.map(p => {
    const fields = canonicalProductFields(p);
    return { _id: p._id, fields: { ...fields, categoryId: ids.get(fields.categorySlug) } };
  });
  const targetIds = new Set([...ids.values()].map(String));
  const archived = categories.filter(c => !targetIds.has(String(c._id)));
  const primaryCount = slug => patches.filter(p => p.fields.categorySlug === slug).length;
  const totalCount = slug => patches.filter(p => categoryPath(p.fields.categorySlug).some(c => c.slug === slug)).length;
  const review = patches.flatMap((patch, index) => {
    const f = filterFields(patch.fields.categorySlug);
    const missing = Object.keys(f).filter(key => f[key] && !patch.fields[key]);
    return missing.length ? [{ id: String(patch._id), name: products[index].name, category: patch.fields.category, missing }] : [];
  });
  const classificationReview = patches.flatMap((patch, index) => categoryDefinitions.some(c => c.parentSlug === patch.fields.categorySlug) ? [{ id: String(patch._id), name: products[index].name, category: patch.fields.category }] : []);
  const oldSlugMap = Object.fromEntries(categories.map(c => [c.slug, resolveCategory(c.name)?.slug || null]));
  if (Object.values(oldSlugMap).some(slug => !slug)) throw new Error("Có danh mục cũ chưa được mapping.");
  const productChanges = patches.filter((patch, index) => !same(pick(products[index], metadataFields), pick(patch.fields, metadataFields)));
  const categoryChanges = targets.filter(target => { const old = categories.find(c => String(c._id) === String(target._id)); return !old || !same(pick(old, Object.keys(target)), target); });
  const archiveChanges = archived.filter(c => c.isArchived !== true || c.isVisible !== false || c.parent_id || c.parentSlug);
  return { targets, patches, productChanges, categoryChanges, archiveChanges, report: {
    version: "catalog-v2", beforeProducts: products.length, afterProducts: patches.length,
    activeCategories: targets.length, productChanges: productChanges.length, categoryChanges: categoryChanges.length + archiveChanges.length,
    oldSlugMap,
    beforeCounts: categories.map(c => ({ name: c.name, slug: c.slug, primary: products.filter(p => p.category === c.name).length })),
    afterCounts: targets.map(c => ({ name: c.name, slug: c.slug, parentSlug: c.parentSlug, primary: primaryCount(c.slug), total: totalCount(c.slug) })),
    hiddenCategories: targets.filter(c => totalCount(c.slug) === 0).map(c => c.name), archivedCategories: archived.map(c => c.name),
    missingAttributes: review, classificationReview,
  } };
}

export async function runMigration(db, directory, apply = false, startSession = () => mongoose.connection.getClient().startSession()) {
  const categories = await db.collection("categories").find().toArray();
  const products = await db.collection("products").find().toArray();
  const plan = buildMigrationPlan(categories, products);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "catalog-v2-report.json"), JSON.stringify(plan.report, null, 2) + "\n");
  if (!apply || (!plan.productChanges.length && !plan.categoryChanges.length && !plan.archiveChanges.length)) return { ...plan.report, applied: false };
  const backupPath = path.join(directory, `catalog-v2-${new Date().toISOString().replace(/[:.]/g, "-")}.ejson`);
  // Complete, round-trippable BSON backup before the first mutation.
  const backup = { database: db.databaseName, createdAt: new Date(), categories, products,
    newCategoryIds: plan.targets.filter(c => !categories.some(old => String(old._id) === String(c._id))).map(c => c._id), postMetadata: plan.patches,
    postCategories: [...plan.targets.map(c => ({ ...categories.find(old => String(old._id) === String(c._id)), ...c })), ...categories.filter(c => !plan.targets.some(target => String(target._id) === String(c._id))).map(c => ({ ...c, isArchived: true, isVisible: false, parent_id: null, parentSlug: null }))] };
  await writeFile(backupPath, EJSON.stringify(backup, null, 2), { flag: "wx" });
  await writeFile(`${backupPath}.report.json`, JSON.stringify(plan.report, null, 2) + "\n", { flag: "wx" });
  const session = startSession();
  try {
    await session.withTransaction(async () => {
      const currentCategories = await db.collection("categories").find({}, { session }).toArray();
      if (!same(currentCategories.sort((a, b) => String(a._id).localeCompare(String(b._id))), [...categories].sort((a, b) => String(a._id).localeCompare(String(b._id))))) throw Error("Danh mục thay đổi trong lúc lập kế hoạch; hãy chạy lại migration.");
      const currentBefore = await db.collection("products").find({}, { session }).toArray();
      if (currentBefore.length !== products.length || currentBefore.some(p => { const old = products.find(item => String(item._id) === String(p._id)); return !old || !same(pick(p, metadataFields), pick(old, metadataFields)); })) throw Error("Dữ liệu danh mục thay đổi trong lúc lập kế hoạch; hãy chạy lại migration.");
      await db.collection("categories").bulkWrite(plan.targets.map(c => ({ updateOne: { filter: { _id: c._id }, update: { $set: c }, upsert: true } })), { session });
      if (plan.archiveChanges.length) await db.collection("categories").updateMany({ _id: { $in: plan.archiveChanges.map(c => c._id) } }, { $set: { isArchived: true, isVisible: false, parent_id: null, parentSlug: null } }, { session });
      if (plan.productChanges.length) await db.collection("products").bulkWrite(plan.productChanges.map(p => ({ updateOne: { filter: { _id: p._id }, update: { $set: p.fields } } })), { session });
      const current = await db.collection("products").find({}, { session }).toArray();
      if (current.length !== products.length || current.some(p => !p.categoryId || !plan.targets.some(c => String(c._id) === String(p.categoryId)) || p.categories.length !== 1)) throw Error("Kiểm tra toàn vẹn sản phẩm không đạt; transaction đã hủy.");
      if (plan.targets.some(c => plan.targets.filter(child => child.parentSlug === c.slug).length === 1)) throw Error("Cây mới có cha chỉ có một con.");
    });
  } finally { await session.endSession(); }
  return { ...plan.report, applied: true, backupPath };
}

export async function rollbackMigration(db, backupPath, startSession = () => mongoose.connection.getClient().startSession()) {
  const backup = EJSON.parse(await readFile(backupPath, "utf8"));
  if (backup.database !== db.databaseName) throw Error("Backup thuộc database khác.");
  const now = await db.collection("products").find().toArray();
  // Never overwrite category edits or new products made after this migration.
  if (now.length !== backup.products.length || now.some(p => { const post = backup.postMetadata.find(item => String(item._id) === String(p._id)); return !post || !same(pick(p, metadataFields), pick(post.fields, metadataFields)); })) throw Error("Danh mục/sản phẩm đã thay đổi sau migration; cần đối soát trước rollback.");
  const session = startSession();
  try {
    await session.withTransaction(async () => {
      const latest = await db.collection("products").find({}, { session }).toArray();
      if (latest.length !== backup.products.length || latest.some(p => { const post = backup.postMetadata.find(item => String(item._id) === String(p._id)); return !post || !same(pick(p, metadataFields), pick(post.fields, metadataFields)); })) throw Error("Danh mục đã thay đổi; hủy rollback.");
      const currentCategories = await db.collection("categories").find({}, { session }).toArray();
      if (!same(currentCategories.sort((a, b) => String(a._id).localeCompare(String(b._id))), backup.postCategories.sort((a, b) => String(a._id).localeCompare(String(b._id))))) throw Error("Cây danh mục đã thay đổi; hủy rollback.");
      await db.collection("products").bulkWrite(backup.products.map(p => {
        const unset = Object.fromEntries(metadataFields.filter(key => p[key] === undefined).map(key => [key, ""]));
        return { updateOne: { filter: { _id: p._id }, update: { $set: pick(p, metadataFields), ...(Object.keys(unset).length ? { $unset: unset } : {}) } } };
      }), { session });
      await db.collection("categories").bulkWrite(backup.categories.map(c => ({ replaceOne: { filter: { _id: c._id }, replacement: c, upsert: true } })), { session });
      await db.collection("categories").deleteMany({ _id: { $in: backup.newCategoryIds } }, { session });
    });
  } finally { await session.endSession(); }
  return { rolledBack: true, products: backup.products.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (ENV.MONGO_DNS_SERVERS) dns.setServers(ENV.MONGO_DNS_SERVERS.split(",").map(s => s.trim()).filter(Boolean));
    await mongoose.connect(ENV.DB_URL || process.env.MONGO_URI, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 15000 });
    const directory = fileURLToPath(new URL("../../.backups/", import.meta.url));
    const rollbackIndex = process.argv.indexOf("--rollback");
    const result = rollbackIndex >= 0 ? await rollbackMigration(mongoose.connection.db, process.argv[rollbackIndex + 1]) : await runMigration(mongoose.connection.db, directory, process.argv.includes("--apply"));
    console.log(JSON.stringify({ ...result, missingAttributes: result.missingAttributes?.length, classificationReview: result.classificationReview?.length }, null, 2));
  } catch (e) { console.error(e.code || e.name, String(e.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, "[redacted]")); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
}
