import ProductCard from "./ProductCard";
import { recommendProducts } from "../lib/recommendations";

export default function Recommendations({ products, history, currentProduct, onView, onAdd }) {
  const result = recommendProducts(products, { history, currentProduct });
  if (!result.products.length) return null;
  return <section className="recommendations" aria-labelledby="recommendation-title"><div className="recommendations-heading"><h2 id="recommendation-title">Gợi ý cho bạn</h2><a href="#shop">Xem tất cả <span aria-hidden="true">→</span></a></div><p className="recommendation-reason">{result.reason}<span> · {result.detail}</span></p><div className="recommendation-grid">{result.products.map(product => <ProductCard key={product._id} product={product} compact onView={onView} onAdd={onAdd} />)}</div></section>;
}
