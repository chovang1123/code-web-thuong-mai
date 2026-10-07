import { Router } from "express";
import { Product } from "../models/product.model.js";
import { webAdminOnly } from "../middleware/web-admin.middleware.js";

const router = Router();
router.use(webAdminOnly);

router.get("/products", async (_, res) => res.json(await Product.find().sort({ createdAt: -1 })));
router.post("/products/seed", async (req, res) => {
  const products = Array.isArray(req.body) ? req.body : [];
  const existingNames = new Set((await Product.find().select("name")).map((product) => product.name));
  const missingProducts = products.filter((product) => product.name && !existingNames.has(product.name)).map((product) => ({
    name: product.name,
    description: product.description || "Sản phẩm chất lượng cho cuộc sống hằng ngày.",
    price: Number(product.price) || 0,
    stock: Number(product.stock) || 20,
    category: product.category || "Nhà cửa",
    brand: product.brand || "Net Select",
    sellerName: product.sellerName || "Net Market",
    sellerLocation: product.sellerLocation || "Việt Nam",
    images: product.images?.length ? product.images : ["https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=900&q=80"],
  }));
  if (missingProducts.length) await Product.insertMany(missingProducts);
  res.status(201).json({ inserted: missingProducts.length });
});
router.post("/products", async (req, res) => {
  const { name, description, price, stock, category, brand, sellerName, sellerLocation, image } = req.body;
  if (!name || !description || !price || !category || !image) return res.status(400).json({ message: "Vui lòng nhập đủ thông tin sản phẩm" });
  const product = await Product.create({ name, description, price: Number(price), stock: Number(stock) || 0, category, brand: brand || "Net Select", sellerName: sellerName || "Net Market", sellerLocation: sellerLocation || "Việt Nam", images: [image] });
  res.status(201).json(product);
});
router.put("/products/:id", async (req, res) => {
  const { name, description, price, stock, category, brand, sellerName, sellerLocation, image } = req.body;
  const product = await Product.findByIdAndUpdate(req.params.id, { name, description, price: Number(price), stock: Number(stock) || 0, category, brand: brand || "Net Select", sellerName: sellerName || "Net Market", sellerLocation: sellerLocation || "Việt Nam", ...(image ? { images: [image] } : {}) }, { new: true, runValidators: true });
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  res.json(product);
});
router.delete("/products/:id", async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  res.json({ message: "Đã xóa sản phẩm" });
});

export default router;
