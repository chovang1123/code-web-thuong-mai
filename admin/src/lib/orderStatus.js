const SHIPPING_START_DELAY_MS = 60_000;

export function advancePendingOrders(orders, now = Date.now()) {
  return orders.map((order) => {
    const createdAt = Date.parse(order.createdAt);
    if (
      order.status !== "pending" ||
      !Number.isFinite(createdAt) ||
      now - createdAt < SHIPPING_START_DELAY_MS
    ) {
      return order;
    }

    return {
      ...order,
      status: "shipping",
      shippedAt: new Date(now).toISOString(),
    };
  });
}
