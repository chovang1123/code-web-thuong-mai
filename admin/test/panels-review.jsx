// Visual QA only. Read product data once; all component requests stay in memory.
import { createRoot } from "react-dom/client";
import CheckoutPanel from "../src/CheckoutPanel";
import { CartPage } from "../src/components/CartDrawer";
import AdminPanel from "../src/AdminPanel";
import SellerDashboard from "../src/pages/SellerDashboard";
import "../src/index.css";
import "../src/styles/tokens.css";
import "../src/styles/storefront.css";
import "../src/styles/homepage.css";

const response = await fetch((import.meta.env.VITE_API_URL || "http://localhost:3000/api") + "/products");
if (!response.ok) throw Error("Start the read-only product API before visual QA.");
const products = await response.json();
const sample = products.filter(product => product.stock > 0).slice(0, 8);
const addresses = [{ _id: "preview-address", fullName: "Khách xem thử", phoneNumber: "0901234567", streetAddress: "Địa chỉ mẫu", city: "Quận 1", state: "TP. Hồ Chí Minh", isDefault: true }];
window.fetch = async (url, options = {}) => {
  if (options.method && options.method !== "GET") throw Error("Visual QA does not write data.");
  if (url.endsWith("/payments/methods")) return Response.json({ cod: true, vnpay: true });
  if (url.endsWith("/auth/addresses")) return Response.json({ addresses });
  if (url.endsWith("/web-admin/products")) return Response.json(sample);
  if (url.endsWith("/seller/dashboard")) return Response.json({
    shop: { name: "Gian hàng xem thử", location: "TP. Hồ Chí Minh" },
    stats: { revenue: 22500000, orders: 45, products: sample.length, lowStock: 2 },
    products: sample, orders: [], chart: [8, 12, 9, 16, 14, 22].map((value, index) => ({ label: `Tháng ${index + 1}`, revenue: value * 1000000 })),
  });
  return Response.json({});
};
const noop = () => {};
const view = new URLSearchParams(location.search).get("view") || "checkout";
const props = { cart: sample.slice(0, 2).map(product => ({ ...product, quantity: 1 })), products: sample, couponInput: "", couponMessage: "", onCouponInput: noop, onApplyCoupon: noop, onBack: noop, onComplete: noop, onClose: noop, onQuantity: noop, onRemove: noop, onAdd: noop, onView: noop, onCheckout: noop, onSubmitOrder: async () => { throw Error("Visual QA does not create orders."); } };
createRoot(document.getElementById("root")).render(
  view === "seller" ? <SellerDashboard name="Xem thử" email="preview@example.test" token="preview" onLogout={noop} /> :
  view === "admin" ? <AdminPanel adminName="Xem thử" email="preview@example.test" onLogout={noop} /> :
  view === "cart" ? <CartPage {...props} /> : <CheckoutPanel {...props} authToken="preview" authEmail="preview@example.test" />
);
