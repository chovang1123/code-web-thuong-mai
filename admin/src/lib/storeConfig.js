export const storeCategories = ["Văn phòng phẩm", "Phụ kiện", "Làm đẹp", "Nhà cửa", "Công nghệ", "Thời trang"];

// The current order API charges no delivery fee. Keep the UI consistent with it.
// Enable a nonzero baseFee only after the server supports the same shipping policy.
export const shippingPolicy = { freeShippingThreshold: 600000, baseFee: 0 };
export const coupons = {
  NET10: { type: "percent", value: 10, label: "Giảm 10%" },
  WELCOME50: { type: "fixed", value: 50000, label: "Giảm 50.000đ" },
  FREESHIP: { type: "fixed", value: 30000, label: "Giảm 30.000đ" },
};
