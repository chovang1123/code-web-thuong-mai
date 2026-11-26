import { Router } from "express";
import {
  createSellerProduct,
  deleteSellerProduct,
  getSellerDashboard,
  updateSellerOrderStatus,
  updateSellerProduct,
  updateSellerProfile,
} from "../controllers/seller.controller.js";
import { protectWebSeller } from "../middleware/web-seller.middleware.js";
import { uploadSellerImage } from "../middleware/seller-image.middleware.js";
import { uploadSellerProductImage } from "../controllers/upload.controller.js";

const router = Router();

router.use(protectWebSeller);
router.post("/uploads", uploadSellerImage, uploadSellerProductImage);
router.get("/dashboard", getSellerDashboard);
router.put("/profile", updateSellerProfile);
router.post("/products", uploadSellerImage, createSellerProduct);
router.put("/products/:productId", uploadSellerImage, updateSellerProduct);
router.delete("/products/:productId", deleteSellerProduct);
router.patch("/orders/:orderId/status", updateSellerOrderStatus);

export default router;
