import express from "express";
import path from "path";
import { clerkMiddleware } from "@clerk/express";
import { serve } from "inngest/express";
import cors from "cors";

import { functions, inngest } from "./config/inngest.js";

import { ENV } from "./config/env.js";
import { connectDB } from "./config/db.js";

import adminRoutes from "./routes/admin.route.js";
import userRoutes from "./routes/user.route.js";
import orderRoutes from "./routes/order.route.js";
import reviewRoutes from "./routes/review.route.js";
import productRoutes from "./routes/product.route.js";
import cartRoutes from "./routes/cart.route.js";
import authRoutes from "./routes/auth.route.js";
import webAdminRoutes from "./routes/web-admin.route.js";
import webReviewRoutes from "./routes/web-review.route.js";
import { ensureAdmin } from "./controllers/auth.controller.js";

const app = express();

const __dirname = path.resolve();

app.use(express.json());
const allowedOrigins = [
  ENV.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8082",
].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true,
}));

app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "Success" });
});

app.get("/", (req, res) => {
  res.status(200).json({
    name: "Net Store API",
    status: "running",
    web: "http://localhost:5173",
    health: "/api/health",
  });
});

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/web-reviews", webReviewRoutes);
app.use("/api/web-admin", webAdminRoutes);

app.use(clerkMiddleware()); // adds auth object under the req => req.auth

app.use("/api/inngest", serve({ client: inngest, functions }));

app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/cart", cartRoutes);

// make our app ready for deployment
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../admin/dist")));

  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(__dirname, "../admin", "dist", "index.html"));
  });
}

const startServer = async () => {
  await connectDB();
  await ensureAdmin();
  app.listen(ENV.PORT, () => {
    console.log("Server is up and running");
  });
};

startServer();
