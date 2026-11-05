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

const router = Router();

router.use(protectWebSeller);
router.get("/dashboard", getSellerDashboard);
router.put("/profile", updateSellerProfile);
router.post("/products", createSellerProduct);
router.put("/products/:productId", updateSellerProduct);
router.delete("/products/:productId", deleteSellerProduct);
router.patch("/orders/:orderId/status", updateSellerOrderStatus);

export default router;
