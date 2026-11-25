import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  sellerStatus: {
    type: String,
    enum: ["pending", "shipped", "delivered"],
    default: "pending",
  },
  image: {
    type: String,
    default: "",
  },
});

const shippingAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  streetAddress: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  zipCode: {
    type: String,
    default: "",
  },
  phoneNumber: {
    type: String,
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clerkId: {
      type: String,
      required: true,
    },
    orderItems: [orderItemSchema],
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    paymentMethod: { type: String, enum: ["cod", "vnpay"], default: "cod" },
    paymentChannel: String,
    vnpTxnRef: { type: String, index: true, unique: true, sparse: true },
    expiresAt: Date,
    orderStatus: { type: String, enum: ["pending", "confirmed", "shipping", "delivered", "cancelled"] },
    paymentStatus: { type: String, enum: ["unpaid", "paid", "failed", "refunded"] },
    paymentExpiresAt: Date, // hạn của đơn cũ
    checkoutReference: String,

    paidAt: Date,
    paymentResult: {
      id: String,
      status: String,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: { type: Number, min: 0 },
    couponCode: { type: String, trim: true },
    discountAmount: { type: Number, min: 0 },
    status: {
      type: String,
      enum: [
        "pending",
        "shipped",
        "delivered",
        "shipping",
        "delivering",
        "completed",
        "cancelled",
        "returning",
      ],
      default: "pending",
    },
    sourceOrderId: {
      type: String,
    },
    deliveredAt: {
      type: Date,
    },
    shippedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

orderSchema.index({ paymentMethod: 1, orderStatus: 1, expiresAt: 1 });
orderSchema.pre("validate", function () {
  // Đồng bộ các luồng giao hàng cũ vẫn ghi status.
  if (!this.orderStatus || this.isModified("status")) {
    const stages = { shipped: "shipping", shipping: "shipping", delivering: "shipping",
      delivered: "delivered", completed: "delivered", cancelled: "cancelled", returning: "delivered" };
    this.orderStatus = stages[this.status] || (this.paymentMethod === "cod" || this.paymentStatus === "paid" ? "confirmed" : "pending");
  }
  this.paymentStatus ??= "unpaid";
  if (this.paymentMethod === "cod" && this.orderStatus === "delivered" && this.paymentStatus !== "refunded") {
    this.paymentStatus = "paid";
    this.paymentResult.status = "paid";
    this.paidAt ??= new Date();
  }
});
orderSchema.index({ user: 1, checkoutReference: 1 }, {
  unique: true, partialFilterExpression: { checkoutReference: { $type: "string" } },
});

orderSchema.index(
  { user: 1, sourceOrderId: 1 },
  {
    unique: true,
    partialFilterExpression: { sourceOrderId: { $type: "string" } },
  },
);

export const Order = mongoose.model("Order", orderSchema);
