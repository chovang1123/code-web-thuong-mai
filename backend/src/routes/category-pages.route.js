import { Router } from "express";
import { categoryAliases, resolveCategory } from "../../../shared/catalog-taxonomy.mjs";
import { escapeMarkup as escape } from "../../../shared/category-seo.mjs";
export { categoryPageMeta } from "../../../shared/category-seo.mjs";
import { getCategoryCatalog } from "../services/catalog.js";

export const categoryPageRoutes = Router();
categoryPageRoutes.get("/danh-muc/:slug", (req, res, next) => {
  const c = resolveCategory(req.params.slug);
  if (!c) return res.status(404).send("Không tìm thấy danh mục");
  if (req.params.slug !== c.slug) return res.redirect(301, `/danh-muc/${c.slug}${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`);
  next();
});
categoryPageRoutes.get("/sitemap.xml", async (req, res) => {
  const configured = process.env.PUBLIC_SITE_URL || process.env.CLIENT_URL || "http://localhost:5173";
  const origin = new URL(configured).origin;
  const categories = await getCategoryCatalog();
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", ...categories.map(c => `/danh-muc/${c.slug}`)].map(url => `<url><loc>${escape(origin + url)}</loc></url>`).join("")}</urlset>`);
});
export const oldCategorySlugs = categoryAliases;
