import { Router } from "express";
import mongoose from "mongoose";
import { WebReview } from "../models/web-review.model.js";

const router = Router();

router.get("/:productId", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.productId)) return res.json([]);
  const reviews = await WebReview.find({ productId: req.params.productId }).sort({ createdAt: -1 });
  res.json(reviews);
});

router.post("/", async (req, res) => {
  const { productId, name, rating, text } = req.body;
  if (!mongoose.isValidObjectId(productId) || !name?.trim() || !text?.trim() || Number(rating) < 1 || Number(rating) > 5) {
    return res.status(400).json({ message: "Thông tin đánh giá không hợp lệ" });
  }
  const review = await WebReview.create({ productId, name: name.trim(), rating: Number(rating), text: text.trim() });
  res.status(201).json(review);
});

export default router;
