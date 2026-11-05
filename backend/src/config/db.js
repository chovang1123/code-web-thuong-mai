import mongoose from "mongoose";
import { ENV } from "./env.js";
import { Cart } from "../models/cart.model.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Review } from "../models/review.model.js";
import { User } from "../models/user.model.js";
import { WebReview } from "../models/web-review.model.js";

export const connectDB = async () => {
  try {
    const mongoUri = ENV.DB_URL || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("Set DB_URL (or MONGO_URI) to connect to MongoDB.");
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ Connected to MONGODB: ${conn.connection.host}`);

    const models = [User, Product, Cart, Order, Review, WebReview];
    const existingCollections = new Set(
      (await conn.connection.db.listCollections({}, { nameOnly: true }).toArray())
        .map((collection) => collection.name),
    );
    const createdCollections = [];

    for (const model of models) {
      const collectionName = model.collection.collectionName;
      if (!existingCollections.has(collectionName)) {
        await model.createCollection();
        createdCollections.push(collectionName);
      }
    }

    if (createdCollections.length > 0) {
      console.log(`✅ Created MongoDB collections: ${createdCollections.join(", ")}`);
    }
  } catch (error) {
    console.error("💥 MONGODB connection error:", error);
    process.exit(1); // exit code 1 means failure, 0 means success
  }
};
