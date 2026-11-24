export function addressErrors(value = {}) {
  const errors = {};
  if (!value.fullName?.trim() || value.fullName.trim().length < 2) errors.fullName = "Nhập họ tên từ 2 ký tự.";
  if (!/^(?:0\d{9,10}|\+84\d{9,10})$/.test((value.phoneNumber || "").replace(/[\s.-]/g, ""))) errors.phoneNumber = "Nhập số điện thoại hợp lệ, ví dụ 0912345678.";
  if (!value.state?.trim()) errors.state = "Nhập tỉnh hoặc thành phố.";
  if (!value.city?.trim()) errors.city = "Nhập quận hoặc huyện.";
  if (!value.streetAddress?.trim() || value.streetAddress.trim().length < 5) errors.streetAddress = "Nhập số nhà, tên đường từ 5 ký tự.";
  return errors;
}
export const isValidAddress = value => value && Object.keys(addressErrors(value)).length === 0;

export function estimatedDelivery(now = new Date()) {
  const format = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
  const offset = days => new Date(now.getTime() + days * 86400000);
  const dateLabel = date => {
    const parts = format.formatToParts(date);
    return `${parts.find(part => part.type === "day").value}/${parts.find(part => part.type === "month").value}`;
  };
  return `${dateLabel(offset(2))} – ${dateLabel(offset(4))}`;
}
