import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { protectWebRoute } from "../middleware/web-auth.middleware.js";
import {
  createReview,
  createWebReview,
  deleteReview,
} from "../controllers/review.controller.js";

const router = Router();
export const webOrderReviewRoutes = Router();

webOrderReviewRoutes.post("/", protectWebRoute, createWebReview);
router.post("/", protectRoute, createReview);
// we did not implement this function in the mobile app - in the frontend
// but jic if you'd like to see the backend code here it is - i provided
router.delete("/:reviewId", protectRoute, deleteReview);

export default router;
