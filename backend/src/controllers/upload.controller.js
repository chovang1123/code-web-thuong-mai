import { uploadProductImage } from "../services/product-images.js";

export async function uploadSellerProductImage(req, res) {
  if (!req.file) return res.status(400).json({ message: "Vui lòng chọn ảnh sản phẩm từ máy." });
  try {
    const image = await uploadProductImage(req.file);
    res.status(201).json(image);
  } catch (error) {
    res.status(error.status || 502).json({ message: error.publicMessage || "Không thể tải ảnh lên. Vui lòng thử lại." });
  }
}
