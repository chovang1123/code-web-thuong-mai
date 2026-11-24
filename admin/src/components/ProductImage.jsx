import { useState } from "react";
import { getProductImage } from "../lib/productImages";

export default function ProductImage({ product, className = "" }) {
  const source = getProductImage(product);
  const [failedSource, setFailedSource] = useState(null);
  return source && source !== failedSource
    ? <img className={`catalog-image ${className}`} src={source} alt={product.name} loading="lazy" onError={() => setFailedSource(source)} />
    : <span className={`product-placeholder ${className}`} role="img" aria-label={`Ảnh minh họa ${product?.name || "sản phẩm"}`}><span>Ảnh {product?.name || "sản phẩm"}</span></span>;
}
