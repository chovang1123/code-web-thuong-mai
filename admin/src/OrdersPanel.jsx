import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Search, Star } from "lucide-react";

const tabs = [
  ["all", "Tất cả"],
  ["pending", "Chờ thanh toán"],
  ["shipping", "Vận chuyển"],
  ["delivering", "Chờ giao hàng"],
  ["completed", "Hoàn thành"],
  ["cancelled", "Đã hủy"],
  ["returning", "Trả hàng/Hoàn tiền"],
];

const statusText = {
  pending: "Chờ thanh toán",
  shipped: "Đang vận chuyển",
  shipping: "Đang vận chuyển",
  delivering: "Chờ giao hàng",
  delivered: "Hoàn thành",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  returning: "Trả hàng/Hoàn tiền",
};

const formatPrice = (price) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);

function readSavedOrders(storageKey) {
  try {
    const savedOrders = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(savedOrders) ? savedOrders : [];
  } catch (error) {
    console.error("Unable to read saved orders:", error);
    return [];
  }
}

function toDisplayOrder(order) {
  const orderId = order.sourceOrderId || order._id;
  const status =
    order.status === "delivered"
      ? "completed"
      : order.status === "shipped"
        ? "shipping"
        : order.status;
  return {
    id: orderId,
    databaseId: order._id,
    status,
    createdAt: order.createdAt,
    total: order.totalPrice,
    reviewedProductIds: order.reviewedProductIds || [],
    items: (order.orderItems || []).map((item) => ({
      _id: item.product?._id || item.product || item._id,
      reviewable: Boolean(item.product?._id),
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      images: [
        item.image ||
          item.product?.images?.[0] ||
          "",
      ],
    })),
  };
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Máy chủ trả về phản hồi không hợp lệ.");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Không thể đồng bộ đơn hàng.");
  }
  return data;
}

function OrdersPanel({ email, authToken }) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const storageKey = `net_store_orders_${email}`;
  const [orders, setOrders] = useState(() => readSavedOrders(storageKey));
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

  useEffect(() => {
    let isMounted = true;
    const headers = { Authorization: `Bearer ${authToken}` };

    const syncOrders = async () => {
      const savedOrders = readSavedOrders(storageKey);
      setOrders(savedOrders);
      setSyncMessage("");

      try {
        if (savedOrders.length > 0) {
          await requestJson(`${apiUrl}/orders/web/import`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ orders: savedOrders }),
          });
        }

        const data = await requestJson(`${apiUrl}/orders/web`, { headers });
        if (!isMounted) return;

        setOrders((data.orders || []).map(toDisplayOrder));
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.error("Unable to synchronize orders with MongoDB:", error);
        if (isMounted) setSyncMessage(error.message);
      }
    };

    if (authToken && email) syncOrders();
    return () => {
      isMounted = false;
    };
  }, [apiUrl, authToken, email, storageKey]);

  useEffect(() => {
    if (!authToken || !email) return undefined;

    let isMounted = true;
    const refreshOrders = async () => {
      try {
        const data = await requestJson(`${apiUrl}/orders/web`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (isMounted) {
          setOrders((data.orders || []).map(toDisplayOrder));
        }
      } catch (error) {
        console.error("Unable to refresh order statuses:", error);
        if (isMounted) setSyncMessage(error.message);
      }
    };

    const intervalId = window.setInterval(refreshOrders, 5_000);
    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [apiUrl, authToken, email]);

  const submitOrderReview = async (event) => {
    event.preventDefault();
    if (!reviewTarget || !reviewText.trim()) return;

    setReviewSubmitting(true);
    setReviewMessage("");
    try {
      await requestJson(`${apiUrl}/reviews/web`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: reviewTarget.orderId,
          productId: reviewTarget.productId,
          rating: reviewRating,
          text: reviewText.trim(),
        }),
      });
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.databaseId === reviewTarget.orderId
            ? {
                ...order,
                reviewedProductIds: [
                  ...new Set([
                    ...order.reviewedProductIds,
                    reviewTarget.productId,
                  ]),
                ],
              }
            : order,
        ),
      );
      setReviewTarget(null);
      setReviewText("");
      setReviewRating(5);
    } catch (error) {
      setReviewMessage(error.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesTab =
          activeTab === "all" ||
          order.status === activeTab ||
          (activeTab === "shipping" && order.status === "shipped") ||
          (activeTab === "completed" && order.status === "delivered");
        const query = search.trim().toLowerCase();
        return (
          matchesTab &&
          (!query ||
            order.id?.toLowerCase().includes(query) ||
            order.items?.some((item) =>
              item.name?.toLowerCase().includes(query),
            ))
        );
      }),
    [activeTab, orders, search],
  );

  return (
    <>
      <div className="orders-heading">
        <div>
          <p className="eyebrow">LỊCH SỬ MUA SẮM</p>
          <h2>Đơn mua</h2>
          <p className="profile-subtitle">
            Theo dõi và quản lý các đơn hàng của bạn.
          </p>
        </div>
      </div>
      <div className="profile-divider" />
      <div className="order-tabs">
        {tabs.map(([id, label]) => (
          <button
            className={activeTab === id ? "active" : ""}
            key={id}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="order-search">
        <Search size={17} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Bạn có thể tìm kiếm theo mã đơn hoặc tên sản phẩm"
        />
      </label>
      {syncMessage && (
        <p className="coupon-error" role="alert">
          Chưa đồng bộ được đơn mua với máy chủ: {syncMessage}
        </p>
      )}
      {visibleOrders.length === 0 ? (
        <div className="order-empty">
          <ClipboardList size={42} />
          <h3>Chưa có đơn hàng</h3>
          <p>Đơn hàng của bạn sẽ xuất hiện tại đây sau khi đặt hàng.</p>
        </div>
      ) : (
        <div className="order-list">
          {visibleOrders.map((order) => (
            <article className="order-card" key={order.id}>
              <header>
                <span>#{order.id.slice(-8).toUpperCase()}</span>
                <b>{statusText[order.status] || order.status}</b>
              </header>
              <div className="order-items">
                {order.items.map((item) => (
                  <div
                    className="order-item"
                    key={`${order.id}-${item._id}`}
                  >
                    <img src={item.images?.[0]} alt="" />
                    <div>
                      <strong>{item.name}</strong>
                      <small>x{item.quantity}</small>
                    </div>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                    {order.status === "completed" &&
                      item.reviewable &&
                      (order.reviewedProductIds.includes(item._id) ? (
                        <span className="order-reviewed">Đã đánh giá</span>
                      ) : (
                        <button
                          className="order-review-button"
                          onClick={() => {
                            setReviewTarget({
                              orderId: order.databaseId,
                              productId: item._id,
                              name: item.name,
                            });
                            setReviewMessage("");
                          }}
                        >
                          Đánh giá
                        </button>
                      ))}
                  </div>
                ))}
                {reviewTarget?.orderId === order.databaseId && (
                  <form className="order-review-form" onSubmit={submitOrderReview}>
                    <strong>Đánh giá {reviewTarget.name}</strong>
                    <div className="star-picker">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          type="button"
                          className={rating <= reviewRating ? "star active" : "star"}
                          key={rating}
                          aria-label={`${rating} sao`}
                          onClick={() => setReviewRating(rating)}
                        >
                          <Star size={18} fill={rating <= reviewRating ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reviewText}
                      onChange={(event) => setReviewText(event.target.value)}
                      placeholder="Chia sẻ cảm nhận của bạn về sản phẩm"
                      rows={3}
                      required
                    />
                    {reviewMessage && (
                      <p className="review-message" role="alert">{reviewMessage}</p>
                    )}
                    <div className="order-review-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setReviewTarget(null);
                          setReviewMessage("");
                        }}
                      >
                        Hủy
                      </button>
                      <button type="submit" disabled={reviewSubmitting}>
                        {reviewSubmitting ? "Đang gửi..." : "Gửi đánh giá"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
              <footer>
                <small>{new Date(order.createdAt).toLocaleDateString("vi-VN")}</small>
                <strong>Tổng tiền: {formatPrice(order.total)}</strong>
                <button className="order-detail-button">Xem chi tiết</button>
              </footer>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export default OrdersPanel;
