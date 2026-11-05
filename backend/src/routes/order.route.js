import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createOrder,
  createWebOrder,
  getUserOrders,
  getWebOrders,
  importWebOrders,
} from "../controllers/order.controller.js";
import { protectWebRoute } from "../middleware/web-auth.middleware.js";

const router = Router();
export const webOrderRoutes = Router();

webOrderRoutes.get("/", protectWebRoute, getWebOrders);
webOrderRoutes.post("/", protectWebRoute, createWebOrder);
webOrderRoutes.post("/import", protectWebRoute, importWebOrders);

router.post("/", protectRoute, createOrder);
router.get("/", protectRoute, getUserOrders);

export default router;
