import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";
import useReducedMotion from "../lib/useReducedMotion";

export default function ProductShelf({ title, subtitle, products, onView, onAdd, onShop, kind, minItems = 3 }) {
  const id = useId();
  const track = useRef(null);
  const reducedMotion = useReducedMotion();
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () => setEdges({ start: element.scrollLeft <= 1, end: element.scrollWidth - element.clientWidth - element.scrollLeft <= 1 });
    const initial = setTimeout(update, 0);
    element.addEventListener("scroll", update, { passive: true });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    resize?.observe(element);
    return () => { clearTimeout(initial); element.removeEventListener("scroll", update); resize?.disconnect(); };
  }, [products.length]);
  if (products.length < minItems) return null;
  const move = direction => {
    const element = track.current;
    const card = element?.firstElementChild;
    if (!element || !card) return;
    const distance = (card.getBoundingClientRect().width + 16) * 3;
    element.scrollBy?.({ left: direction * distance, behavior: reducedMotion ? "auto" : "smooth" });
  };
  return <section className="product-shelf" data-kind={kind} aria-labelledby={id}>
    <div className="shelf-heading"><div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><div className="shelf-controls"><button type="button" disabled={edges.start} onClick={() => move(-1)} aria-label={`Cuộn ${title} sang trái`}><ChevronLeft size={18} /></button><button type="button" disabled={edges.end} onClick={() => move(1)} aria-label={`Cuộn ${title} sang phải`}><ChevronRight size={18} /></button></div></div>
    <div ref={track} className="shelf-track" tabIndex="0" role="region" aria-label={`Kệ ${title}, dùng phím mũi tên để cuộn`} onKeyDown={event => { if (event.target === event.currentTarget && ["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); } }}>{products.slice(0, 12).map(product => <ProductCard key={product._id} product={product} onView={onView} onAdd={onAdd} onShop={onShop} />)}</div>
  </section>;
}
