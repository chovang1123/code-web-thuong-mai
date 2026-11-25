import { useEffect, useState } from "react";
import ProductImage from "./ProductImage";
import { formatPrice, productDiscount } from "../lib/products";
import useReducedMotion from "../lib/useReducedMotion";

export default function FeaturedHero({ products, onView, onBuy }) {
  const [activeId, setActiveId] = useState(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useReducedMotion();
  const active = products.find(product => product._id === activeId) || products[0];
  useEffect(() => {
    if (reducedMotion || hovered || focused || products.length < 2) return;
    const timer = setInterval(() => setActiveId(current => products[(Math.max(0, products.findIndex(product => product._id === current)) + 1) % products.length]._id), 6000);
    return () => clearInterval(timer);
  }, [products, reducedMotion, hovered, focused]);
  if (!active) return null;
  const discount = productDiscount(active);
  return <section className="featured-section" aria-labelledby="featured-heading" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <h2 id="featured-heading">Nổi bật và gợi ý</h2>
    <div className="featured-layout"><div className="featured-banner"><div className="featured-copy"><p className="featured-eyebrow">{discount > 0 ? "ƯU ĐÃI HÔM NAY" : "KHÁM PHÁ HÔM NAY"}</p><h3>{active.name}</h3><p className="featured-description">{discount > 0 ? `Tiết kiệm ${formatPrice(active.originalPrice - active.price)}` : active.description}</p><div className="steam-price">{discount > 0 && <span className="discount-badge">−{discount}%</span>}<div>{discount > 0 && <del>{formatPrice(active.originalPrice)}</del>}<strong>{formatPrice(active.price)}</strong></div></div><button type="button" className="primary-button featured-buy" disabled={active.stock === 0} onClick={() => onBuy(active)}>Mua ngay</button></div><button type="button" className="featured-media" onClick={() => onView(active)} aria-label={`Xem chi tiết ${active.name}`}><ProductImage product={active} /></button></div>
      <div className="featured-list" aria-label="Chọn sản phẩm nổi bật">{products.map(product => <button type="button" className="featured-option" key={product._id} aria-pressed={product._id === active._id} onMouseEnter={() => setActiveId(product._id)} onFocus={() => setActiveId(product._id)} onClick={() => setActiveId(product._id)}><ProductImage product={product} /><span><strong>{product.name}</strong><small>{formatPrice(product.price)}</small></span></button>)}</div>
    </div>
  </section>;
}
