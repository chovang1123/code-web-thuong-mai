import { categoryPath } from "../lib/categories.js";

export default function CategoryBreadcrumb({ category, onCategory }) {
  const path = categoryPath(category);
  if (!path.length) return null;
  return <nav className="category-breadcrumb" aria-label="Đường dẫn danh mục"><a href="/" onClick={event => { event.preventDefault(); onCategory("Tất cả"); }}>Trang chủ</a>{path.map((node, index) => <span key={node.slug}><span aria-hidden="true">/</span><a href={`/danh-muc/${node.slug}`} aria-current={index === path.length - 1 ? "page" : undefined} onClick={event => { event.preventDefault(); onCategory(node.name); }}>{node.name}</a></span>)}</nav>;
}
