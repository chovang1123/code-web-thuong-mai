import mongoose from "mongoose";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Review } from "../models/review.model.js";

export async function createWebReview(req, res) {
  try {
    const { productId, orderId, rating, text } = req.body;
    const numericRating = Number(rating);
    if (
      !mongoose.isValidObjectId(productId) ||
      !mongoose.isValidObjectId(orderId) ||
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5 ||
      typeof text !== "string" ||
      !text.trim()
    ) {
      return res.status(400).json({ message: "Vui lòng chọn số sao và nhập nội dung đánh giá." });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    }
    if (!["completed", "delivered"].includes(order.status)) {
      return res.status(400).json({ message: "Chỉ có thể đánh giá đơn hàng đã hoàn thành." });
    }

    const orderedItem = order.orderItems.find(
      (item) => item.product.toString() === productId,
    );
    if (!orderedItem) {
      return res.status(400).json({ message: "Sản phẩm không có trong đơn hàng này." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm để đánh giá." });
    }

    const review = await Review.findOneAndUpdate(
      { productId, userId: req.user._id },
      {
        productId,
        userId: req.user._id,
        orderId,
        rating: numericRating,
        text: text.trim(),
      },
      { new: true, upsert: true, runValidators: true },
    );
    const ratings = await Review.find({ productId }).select("rating");
    product.averageRating =
      ratings.reduce((sum, entry) => sum + entry.rating, 0) / ratings.length;
    product.totalReviews = ratings.length;
    await product.save();

    res.status(201).json({
      message: "Đánh giá đã được lưu.",
      review: {
        ...review.toObject(),
        name: req.user.name,
      },
    });
  } catch (error) {
    console.error("Error in createWebReview controller:", error);
    res.status(500).json({ message: "Không thể lưu đánh giá." });
  }
}

export async function createReview(req, res) {
  try {
    const { productId, orderId, rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const user = req.user;

    // verify order exists and is delivered
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.clerkId !== user.clerkId) {
      return res.status(403).json({ error: "Not authorized to review this order" });
    }

    if (order.status !== "delivered") {
      return res.status(400).json({ error: "Can only review delivered orders" });
    }

    // verify product is in the order
    const productInOrder = order.orderItems.find(
      (item) => item.product.toString() === productId.toString()
    );
    if (!productInOrder) {
      return res.status(400).json({ error: "Product not found in this order" });
    }

    // atomic update or create
    const review = await Review.findOneAndUpdate(
      { productId, userId: user._id },
      { rating, orderId, productId, userId: user._id },
      { new: true, upsert: true, runValidators: true }
    );

    // update the product rating with atomic aggregation
    const reviews = await Review.find({ productId });
    const totalRating = reviews.reduce((sum, rev) => sum + rev.rating, 0);
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        averageRating: totalRating / reviews.length,
        totalReviews: reviews.length,
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      await Review.findByIdAndDelete(review._id);
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(201).json({ message: "Review submitted successfully", review });
  } catch (error) {
    console.error("Error in createReview controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteReview(req, res) {
  try {
    const { reviewId } = req.params;

    const user = req.user;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    if (review.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this review" });
    }

    const productId = review.productId;
    await Review.findByIdAndDelete(reviewId);

    const reviews = await Review.find({ productId });
    const totalRating = reviews.reduce((sum, rev) => sum + rev.rating, 0);
    await Product.findByIdAndUpdate(productId, {
      averageRating: reviews.length > 0 ? totalRating / reviews.length : 0,
      totalReviews: reviews.length,
    });

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error in deleteReview controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
