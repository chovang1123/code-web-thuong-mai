import { defineConfig, loadEnv } from "vite";
import process from "node:process";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolveCategory } from "../shared/catalog-taxonomy.mjs";
import { categoryPageMeta } from "../shared/category-seo.mjs";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiOrigin = new URL(env.VITE_API_URL || "http://localhost:3000/api").origin;
  const origin = env.PUBLIC_SITE_URL || "http://localhost:5173";
  const install = server => { server.middlewares.use((req, res, next) => {
    const url = new URL(req.url, origin);
    const match = url.pathname.match(/^\/danh-muc\/([^/]+)\/?$/);
    if (!match) return next();
    let slug;
    try { slug = decodeURIComponent(match[1]); } catch { res.statusCode = 400; return res.end("URL không hợp lệ"); }
    const c = resolveCategory(slug);
    if (!c) { res.statusCode = 404; return res.end("Không tìm thấy danh mục"); }
    if (match[1] !== c.slug || url.pathname.endsWith("/")) { res.statusCode = 301; res.setHeader("Location", `/danh-muc/${c.slug}${url.search}`); return res.end(); }
    next();
  }); };
  const proxy = { "/sitemap.xml": { target: apiOrigin, changeOrigin: true } };
  return {
    plugins: [react(), tailwindcss(), { name: "catalog-pages", configureServer: install, configurePreviewServer: install,
      transformIndexHtml(html, context) { const slug = (context.originalUrl || context.path).match(/^\/danh-muc\/([^/?]+)/)?.[1]; return slug ? categoryPageMeta(html, slug, origin) : html; },
    }],
    server: { proxy }, preview: { proxy },
  };
});
