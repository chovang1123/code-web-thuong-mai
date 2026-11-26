import { useEffect, useState } from "react";
import { categoryPath, resolveCategory } from "./categories.js";

const fromLocation = () => {
  const match = window.location.pathname.match(/^\/danh-muc\/([^/]+)\/?$/);
  return match ? resolveCategory(decodeURIComponent(match[1]))?.name || "Tất cả" : "Tất cả";
};
export default function useCategoryLocation() {
  const [category, setCategory] = useState(fromLocation);
  useEffect(() => {
    const sync = () => setCategory(fromLocation());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  useEffect(() => {
    const node = resolveCategory(category);
    document.title = node ? `${categoryPath(node.slug).map(c => c.name).join(" — ")} | NET STORE` : "NET STORE — Mua sắm mỗi ngày";
    for (const [selector, tag, attribute, value] of [
      ['meta[name="description"]', "meta", "content", node ? `Khám phá sản phẩm ${node.name} tại NET STORE` : "Khám phá sản phẩm tại NET STORE"],
      ['link[rel="canonical"]', "link", "href", `${location.origin}${node ? `/danh-muc/${node.slug}` : "/"}`],
    ]) {
      let element = document.querySelector(selector);
      if (!element) { element = document.createElement(tag); element.setAttribute(tag === "meta" ? "name" : "rel", tag === "meta" ? "description" : "canonical"); document.head.append(element); }
      element.setAttribute(attribute, value);
    }
  }, [category]);
  const choose = value => {
    const node = resolveCategory(value);
    const path = node ? `/danh-muc/${node.slug}` : "/";
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setCategory(node?.name || "Tất cả");
  };
  return [category, choose];
}
