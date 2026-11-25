// Read-only visual review. Uses GET /products, never writes to the server.
import { useEffect, useMemo, useState } from "react";
import StoreHeader from "../src/components/StoreHeader";
import StoreFooter from "../src/components/StoreFooter";
import HomePage from "../src/components/HomePage";
import Dialog from "../src/components/Dialog";
import ProductImage from "../src/components/ProductImage";
import { decorateProduct, formatPrice } from "../src/lib/products";
import { historyKey, readViewHistory, recordProductView } from "../src/lib/recommendations";
import "../src/index.css";
import "../src/styles/tokens.css";
import "../src/styles/storefront.css";
import "../src/styles/homepage.css";
import useCategoryLocation from "../src/lib/useCategoryLocation";

export default function Review() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [category, setCategory] = useCategoryLocation();
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState(() => { try { return readViewHistory(localStorage); } catch { return []; } });
  const [cart, setCart] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch((import.meta.env.VITE_API_URL || "http://localhost:3000/api") + "/products", { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw Error("Không thể tải sản phẩm từ API.");
      if (!controller.signal.aborted) { setProducts(data.map(decorateProduct)); setError(""); }
    }).catch(() => { if (!controller.signal.aborted) setError("Không thể tải sản phẩm từ API."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  useEffect(() => { try { localStorage.setItem(historyKey, JSON.stringify(history)); } catch { /* Optional browser history. */ } }, [history]);
  const suggestions = useMemo(() => products.filter(product => product.name.toLocaleLowerCase("vi-VN").includes(search.toLocaleLowerCase("vi-VN"))).slice(0, 8), [products, search]);
  const view = product => { setSelected(product); setHistory(current => recordProductView(current, product)); };
  const add = product => setCart(current => [...current, product]);
  const idle = () => {};
  return <div className="storefront"><StoreHeader products={products} search={search} onSearch={setSearch} searchFocused={focused} onSearchFocus={setFocused} suggestions={suggestions} category={category} onCategory={setCategory} cartCount={cart.length} onCart={idle} onProfile={idle} onOrders={idle} onLogout={idle} /><main id="top"><HomePage products={products} history={history} cart={cart} category={category} onCategory={setCategory} search={search} onSearch={setSearch} onView={view} onAdd={add} onBuy={view} loading={loading} error={error} onRetry={() => { setLoading(true); setReload(current => current + 1); }} /></main><StoreFooter />{selected && <Dialog label="Chi tiết sản phẩm" className="review-detail" onClose={() => setSelected(null)}><button type="button" className="secondary-button" onClick={() => setSelected(null)}>Đóng</button><ProductImage product={selected} /><h2>{selected.name}</h2><p>{selected.description}</p><strong>{formatPrice(selected.price)}</strong></Dialog>}</div>;
}
