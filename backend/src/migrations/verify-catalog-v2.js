import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dns from "node:dns";
import mongoose from "mongoose";
import { EJSON } from "bson";
import { ENV } from "../config/env.js";
import { buildMigrationPlan, metadataFields } from "./catalog-v2.js";
import { categoryDefinitions, categoryPath, resolveCategory } from "../../../shared/catalog-taxonomy.mjs";

const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const hash = value => createHash("sha256").update(JSON.stringify(stable(EJSON.serialize(value)))).digest("hex");
const business = products => products.map(p => Object.fromEntries(Object.entries(p).filter(([key]) => !metadataFields.includes(key)))).sort((a, b) => String(a._id).localeCompare(String(b._id)));

export async function verifyCatalogMigration(db, backupPath, reportDirectory) {
  const backup = EJSON.parse(await readFile(backupPath, "utf8"));
  if (backup.database !== db.databaseName) throw Error("Backup thuộc database khác.");
  const [products, categories, originalReport] = await Promise.all([
    db.collection("products").find().toArray(), db.collection("categories").find().toArray(), readFile(`${backupPath}.report.json`, "utf8").then(JSON.parse),
  ]);
  const active = categories.filter(c => !c.isArchived);
  const ids = new Map(active.map(c => [String(c._id), c]));
  const plan = buildMigrationPlan(categories, products);
  const checks = {
    productCountPreserved: products.length === backup.products.length,
    businessFieldsPreserved: hash(business(products)) === hash(business(backup.products)),
    exactlyOnePrimary: products.every(p => p.categories?.length === 1 && p.categories[0] === p.category),
    noOrphans: products.every(p => ids.get(String(p.categoryId))?.slug === p.categorySlug && resolveCategory(p.categorySlug)?.name === p.category),
    correctParents: active.every(c => c.parentSlug ? ids.get(String(c.parent_id))?.slug === c.parentSlug : !c.parent_id),
    noSingleChildParents: active.every(c => active.filter(child => child.parentSlug === c.slug).length !== 1),
    idempotent: plan.productChanges.length === 0 && plan.categoryChanges.length === 0 && plan.archiveChanges.length === 0,
    everyOldSlugResolves: Object.entries(originalReport.oldSlugMap).every(([old, target]) => resolveCategory(old)?.slug === target),
  };
  if (Object.values(checks).some(value => !value)) throw Error(`Đối soát thất bại: ${JSON.stringify(checks)}`);
  const rootComparison = categoryDefinitions.filter(c => !c.parentSlug).map(root => ({ name: root.name,
    beforeMemberships: backup.products.filter(p => [...new Set([p.category, ...(p.categories || [])])].some(name => categoryPath(name).some(c => c.slug === root.slug))).length,
    afterProducts: plan.report.afterCounts.find(c => c.slug === root.slug).total,
  }));
  const report = { ...originalReport, applied: true, verifiedAt: new Date().toISOString(), checks, rootComparison,
    databaseCategoryRecords: categories.length, backupFile: path.basename(backupPath) };
  if (reportDirectory) {
    await mkdir(reportDirectory, { recursive: true });
    await writeFile(path.join(reportDirectory, "catalog-v2-report.json"), JSON.stringify(report, null, 2) + "\n");
  }
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (ENV.MONGO_DNS_SERVERS) dns.setServers(ENV.MONGO_DNS_SERVERS.split(",").map(s => s.trim()).filter(Boolean));
    await mongoose.connect(ENV.DB_URL || process.env.MONGO_URI, { autoCreate: false, autoIndex: false });
    const report = await verifyCatalogMigration(mongoose.connection.db, process.argv[2], process.argv[3]);
    console.log(JSON.stringify({ checks: report.checks, rootComparison: report.rootComparison, missingAttributes: report.missingAttributes.length, classificationReview: report.classificationReview.length, hidden: report.hiddenCategories }, null, 2));
  } catch (error) { console.error(String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/g, "[redacted]")); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
}
