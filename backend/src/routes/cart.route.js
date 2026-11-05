import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { protectWebRoute } from "../middleware/web-auth.middleware.js";
import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  syncWebCart,
  updateCartItem,
} from "../controllers/cart.controller.js";

const router = Router();
export const webCartRoutes = Router();

webCartRoutes.get("/", protectWebRoute, getCart);
webCartRoutes.put("/", protectWebRoute, syncWebCart);

router.use(protectRoute);

router.get("/", getCart);
router.post("/", addToCart);
router.put("/:productId", updateCartItem);
router.delete("/:productId", removeFromCart);
router.delete("/", clearCart);

export default router;
