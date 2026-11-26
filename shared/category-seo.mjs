import { resolveCategory, categoryPath } from "./catalog-taxonomy.mjs";
export const escapeMarkup = value => String(value).replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));
export function categoryPageMeta(html, slug, origin) {
  const c = resolveCategory(slug);
  if (!c) return html;
  const title = `${categoryPath(c.slug).map(node => node.name).join(" — ")} | NET STORE`;
  return html.replace(/<title>.*?<\/title>/, `<title>${escapeMarkup(title)}</title>`)
    .replace(/<meta\s+name="description"[^>]*>/gi, "").replace(/<link\s+rel="canonical"[^>]*>/gi, "")
    .replace("</head>", `<meta name="description" content="${escapeMarkup(`Khám phá sản phẩm ${c.name} tại NET STORE`)}"><link rel="canonical" href="${escapeMarkup(origin + "/danh-muc/" + c.slug)}"></head>`);
}
