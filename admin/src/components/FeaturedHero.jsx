import ProductImage from "./ProductImage";
import { formatPrice, productDiscount } from "../lib/products";

export default function FeaturedHero({ products, onView, onBuy }) {
  const product = products[0];
  if (!product) return null;
  const discount = productDiscount(product);
  return <section className="featured-section" aria-labelledby="featured-heading">
    <h2 id="featured-heading">Nổi bật hôm nay</h2>
    <div className="featured-banner">
      <div className="featured-copy">
        <p className="featured-label">Ưu đãi hôm nay</p>
        <h3 title={product.name}>{product.name}</h3>
        <div className="featured-price"><strong>{formatPrice(product.price)}</strong>{discount > 0 && <><del>{formatPrice(product.originalPrice)}</del><span className="discount-badge">−{discount}%</span></>}</div>
        <button type="button" className="primary-button featured-buy" disabled={product.stock === 0} onClick={() => onBuy(product)}>Mua ngay</button>
      </div>
      <button type="button" className="featured-media" onClick={() => onView(product)} aria-label={`Xem chi tiết ${product.name}`}><ProductImage product={product} priority /></button>
    </div>
  </section>;
}
