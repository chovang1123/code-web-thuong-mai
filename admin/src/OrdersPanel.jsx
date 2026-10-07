import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Package, Search, Truck, XCircle } from "lucide-react";
import { advancePendingOrders } from "./lib/orderStatus";

const tabs = [
  ["all", "Tất cả"],
  ["pending", "Chờ thanh toán"],
  ["shipping", "Vận chuyển"],
  ["delivering", "Chờ giao hàng"],
  ["completed", "Hoàn thành"],
  ["cancelled", "Đã hủy"],
  ["returning", "Trả hàng/Hoàn tiền"],
];

const statusText = { pending: "Chờ thanh toán", shipping: "Đang vận chuyển", delivering: "Chờ giao hàng", completed: "Hoàn thành", cancelled: "Đã hủy", returning: "Trả hàng/Hoàn tiền" };

function OrdersPanel({ email }) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const storageKey = `net_store_orders_${email}`;
  const [orders, setOrders] = useState(() =>
    JSON.parse(localStorage.getItem(storageKey) || "[]"),
  );

  useEffect(() => {
    const refreshOrders = () => {
      const savedOrders = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const updatedOrders = advancePendingOrders(savedOrders);
      if (updatedOrders.some((order, index) => order !== savedOrders[index])) {
        localStorage.setItem(storageKey, JSON.stringify(updatedOrders));
      }
      setOrders(updatedOrders);
    };
    const handleStorageChange = (event) => {
      if (event.key === storageKey) refreshOrders();
    };

    refreshOrders();
    const refreshInterval = window.setInterval(refreshOrders, 1000);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [storageKey]);

  const visibleOrders = useMemo(() => orders.filter((order) => {
    const matchesTab = activeTab === "all" || order.status === activeTab;
    const query = search.trim().toLowerCase();
    return matchesTab && (!query || order.id.toLowerCase().includes(query) || order.items.some((item) => item.name.toLowerCase().includes(query)));
  }), [activeTab, orders, search]);

  return <><div className="orders-heading"><div><p className="eyebrow">LỊCH SỬ MUA SẮM</p><h2>Đơn mua</h2><p className="profile-subtitle">Theo dõi và quản lý các đơn hàng của bạn.</p></div></div><div className="profile-divider" /><div className="order-tabs">{tabs.map(([id, label]) => <button className={activeTab === id ? "active" : ""} key={id} onClick={() => setActiveTab(id)}>{label}</button>)}</div><label className="order-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Bạn có thể tìm kiếm theo mã đơn hoặc tên sản phẩm" /></label>{visibleOrders.length === 0 ? <div className="order-empty"><ClipboardList size={42} /><h3>Chưa có đơn hàng</h3><p>Đơn hàng của bạn sẽ xuất hiện tại đây sau khi đặt hàng.</p></div> : <div className="order-list">{visibleOrders.map((order) => <article className="order-card" key={order.id}><header><span>#{order.id.slice(-8).toUpperCase()}</span><b>{statusText[order.status] || order.status}</b></header><div className="order-items">{order.items.map((item) => <div className="order-item" key={`${order.id}-${item._id}`}><img src={item.images?.[0]} alt="" /><div><strong>{item.name}</strong><small>x{item.quantity}</small></div><span>{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(item.price * item.quantity)}</span></div>)}</div><footer><small>{new Date(order.createdAt).toLocaleDateString("vi-VN")}</small><strong>Tổng tiền: {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(order.total)}</strong><button className="order-detail-button">Xem chi tiết</button></footer></article>)}</div>}</>;
}

export default OrdersPanel;
