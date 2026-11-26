import { useState } from "react";
import { getProductImage } from "../lib/productImages";

export default function ProductImage({ product, className = "", priority = false }) {
  const source = getProductImage(product);
  const [failedSource, setFailedSource] = useState(null);
  return source && source !== failedSource
    ? <img className={`catalog-image ${className}`} src={source} alt={product.name} width="400" height="400" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" onError={() => setFailedSource(source)} />
    : <span className={`product-placeholder ${className}`} role="img" aria-label={`Ảnh minh họa ${product?.name || "sản phẩm"}`}><span>Ảnh {product?.name || "sản phẩm"}</span></span>;
}
