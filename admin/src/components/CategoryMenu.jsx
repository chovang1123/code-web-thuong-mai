import { categoryTree } from "../lib/categories.js";

export default function CategoryMenu({ products, catalog, category, onCategory }) {
  const roots = categoryTree(products, catalog);
  const link = (node, label = node.name) => <a href={`/danh-muc/${node.slug}`} aria-current={category === node.name ? "page" : undefined} onClick={event => { event.preventDefault(); onCategory(node.name); }}><span>{label}</span><small>{node.productCount}</small></a>;
  const children = root => root.children.map(child => <div key={child.slug}>{link(child)}</div>);
  return <nav className="category-dropdown category-mega" aria-label="Danh mục sản phẩm">
    <button type="button" className="category-menu-all" onClick={() => onCategory("Tất cả")}>Tất cả sản phẩm</button>
    {roots.map(root => <section key={root.slug} className="category-group-desktop"><h2>{link(root)}</h2><div className="category-group-links">{children(root)}</div></section>)}
    {roots.map(root => <details key={root.slug} name="mobile-categories" className="category-group-mobile"><summary><span>{root.name}</span><small>{root.productCount}</small></summary><div className="category-group-links">{link(root, `Tất cả ${root.name}`)}{children(root)}</div></details>)}
  </nav>;
}
