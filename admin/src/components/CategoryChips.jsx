import { SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { categoryTree, resolveCategory } from "../lib/categories.js";
import Dialog from "./Dialog";

export default function CategoryChips({ products, catalog, category, onCategory, onFilters, activeCount }) {
  const roots = categoryTree(products, catalog);
  const selected = resolveCategory(category);
  const parent = roots.find(c => c.slug === (selected?.parentSlug || selected?.slug));
  const navigation = useRef(null);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => {
    for (const row of navigation.current?.querySelectorAll(".category-chips") || []) {
      const active = row.querySelector(".is-selected");
      if (!active) continue;
      const item = active.getBoundingClientRect(), bounds = row.getBoundingClientRect();
      if (item.left < bounds.left || item.right > bounds.right) row.scrollLeft += item.left - bounds.left - (bounds.width - item.width) / 2;
    }
  }, [category, parent?.slug]);
  const choose = name => { onCategory(name); setMoreOpen(false); };
  const chip = (item, child = false) => <button type="button" key={item.slug} className={(child ? selected?.slug === item.slug : parent?.slug === item.slug) ? "is-selected" : ""} aria-pressed={child ? selected?.slug === item.slug : parent?.slug === item.slug} onClick={() => choose(item.name)}>{item.name}</button>;
  return <div className="category-navigation" ref={navigation}>
    <div className="home-category-row"><nav className="category-chips" aria-label="Chọn danh mục"><button type="button" className={category === "Tất cả" ? "is-selected" : ""} aria-pressed={category === "Tất cả"} onClick={() => onCategory("Tất cả")}>Tất cả</button>{roots.slice(0, 8).map(item => chip(item))}
      {roots.length > 8 && <button type="button" aria-haspopup="dialog" className={roots.slice(8).some(c => c.slug === parent?.slug) ? "is-selected" : ""} onClick={() => setMoreOpen(true)}>Xem thêm</button>}</nav>
      <button type="button" className="advanced-filter-button" onClick={onFilters} aria-haspopup="dialog"><SlidersHorizontal size={16} aria-hidden="true" />Bộ lọc{activeCount ? ` (${activeCount})` : ""}</button>
    </div>
    {parent?.children.length > 0 && <nav className="category-chips child-category-chips" aria-label={`Danh mục con ${parent.name}`}><button type="button" className={selected?.slug === parent.slug ? "is-selected" : ""} aria-pressed={selected?.slug === parent.slug} onClick={() => onCategory(parent.name)}>Tất cả</button>{parent.children.map(item => chip(item, true))}</nav>}
    {moreOpen && <Dialog label="Danh mục khác" className="category-more-dialog" onClose={() => setMoreOpen(false)}><h2>Danh mục khác</h2><nav>{roots.slice(8).map(item => chip(item))}</nav><button type="button" className="secondary-button" onClick={() => setMoreOpen(false)}>Đóng</button></Dialog>}
  </div>;
}
