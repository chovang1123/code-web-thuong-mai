import mongoose from "mongoose";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Review } from "../models/review.model.js";
import { Cart } from "../models/cart.model.js";

function isTransactionUnsupported(error) {
  return (
    error.code === 20 ||
    error.codeName === "IllegalOperation" ||
    /transaction numbers are only allowed|does not support transactions|replica set/i.test(
      error.message || "",
    )
  );
}

async function createWebOrderWithoutTransactions(user, shippingAddress) {
  const cart = await Cart.findOne({ user: user._id });
  if (!cart?.items.length) {
    const error = new Error("Giỏ hàng đang trống.");
    error.statusCode = 400;
    throw error;
  }

  const orderItems = [];
  let totalPrice = 0;
  const decrementedProducts = [];
  let order;

  try {
    for (const item of cart.items) {
      const product = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true },
      );
      if (!product) {
        const error = new Error("Sản phẩm đã hết hàng hoặc không đủ số lượng.");
        error.statusCode = 400;
        throw error;
      }

      decrementedProducts.push({ productId: product._id, quantity: item.quantity });
      totalPrice += product.price * item.quantity;
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.images?.[0] || "",
        sellerId: product.sellerId,
      });
    }

    order = await Order.create({
      user: user._id,
      clerkId: user.clerkId,
      orderItems,
      shippingAddress: {
        fullName: shippingAddress.fullName.trim(),
        streetAddress: shippingAddress.streetAddress.trim(),
        city: shippingAddress.city.trim(),
        state: shippingAddress.city.trim(),
        zipCode: shippingAddress.zipCode?.trim() || "",
        phoneNumber: shippingAddress.phoneNumber.trim(),
      },
      paymentResult: { status: "unpaid" },
      totalPrice,
    });

    cart.items = [];
    await cart.save();
    return order;
  } catch (error) {
    if (order) {
      try {
        await Order.deleteOne({ _id: order._id });
      } catch (rollbackError) {
        console.error("Unable to remove incomplete order:", rollbackError);
      }
    }

    for (const item of decrementedProducts) {
      try {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { stock: item.quantity } },
        );
      } catch (rollbackError) {
        console.error("Unable to restore product stock after failed order:", rollbackError);
      }
    }
    throw error;
  }
}

export async function createOrder(req, res) {
  try {
    const user = req.user;
    const { orderItems, shippingAddress, totalPrice } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ error: "No order items" });
    }

    // validate products and stock
    for (const item of orderItems) {
      const product = await Product.findById(item.product._id);
      if (!product) {
        return res.status(404).json({ error: `Product ${item.name} not found` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }
    }

    const order = await Order.create({
      user: user._id,
      clerkId: user.clerkId,
      orderItems,
      shippingAddress,
      paymentResult: { status: "unpaid" },
      totalPrice,
    });

    // update product stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity },
      });
    }

    res.status(201).json({ message: "Order created successfully", order });
  } catch (error) {
    console.error("Error in createOrder controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createWebOrder(req, res) {
  const session = await Order.startSession();
  try {
    const { shippingAddress } = req.body;
    const requiredAddressFields = [
      "fullName",
      "streetAddress",
      "city",
      "phoneNumber",
    ];
    if (
      !shippingAddress ||
      !requiredAddressFields.every(
        (field) =>
          typeof shippingAddress[field] === "string" &&
          shippingAddress[field].trim(),
      )
    ) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin giao hàng." });
    }

    let createdOrder;
    try {
      await session.withTransaction(async () => {
        const cart = await Cart.findOne({ user: req.user._id }).session(session);
        if (!cart?.items.length) {
          const error = new Error("Giỏ hàng đang trống.");
          error.statusCode = 400;
          throw error;
        }

        const orderItems = [];
        let totalPrice = 0;
        for (const item of cart.items) {
          const product = await Product.findOneAndUpdate(
            { _id: item.product, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { new: true, session },
          );
          if (!product) {
            const error = new Error("Sản phẩm đã hết hàng hoặc không đủ số lượng.");
            error.statusCode = 400;
            throw error;
          }

          totalPrice += product.price * item.quantity;
          orderItems.push({
            product: product._id,
            name: product.name,
            price: product.price,
            quantity: item.quantity,
            image: product.images?.[0] || "",
            sellerId: product.sellerId,
          });
        }

        const [order] = await Order.create(
          [
            {
              user: req.user._id,
              clerkId: req.user.clerkId,
              orderItems,
              shippingAddress: {
                fullName: shippingAddress.fullName.trim(),
                streetAddress: shippingAddress.streetAddress.trim(),
                city: shippingAddress.city.trim(),
                state: shippingAddress.city.trim(),
                zipCode: shippingAddress.zipCode?.trim() || "",
                phoneNumber: shippingAddress.phoneNumber.trim(),
              },
              paymentResult: { status: "unpaid" },
              totalPrice,
            },
          ],
          { session },
        );

        cart.items = [];
        await cart.save({ session });
        createdOrder = order;
      });
    } catch (error) {
      if (!isTransactionUnsupported(error)) throw error;
      createdOrder = await createWebOrderWithoutTransactions(
        req.user,
        shippingAddress,
      );
    }

    res.status(201).json({ message: "Đặt hàng thành công.", order: createdOrder });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("Error in createWebOrder controller:", error);
    res.status(500).json({ message: "Không thể tạo đơn hàng. Vui lòng thử lại sau." });
  } finally {
    await session.endSession();
  }
}

export async function importWebOrders(req, res) {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders) || orders.length > 100) {
      return res.status(400).json({ message: "Danh sách đơn hàng không hợp lệ." });
    }

    const statuses = [
      "pending",
      "shipped",
      "delivered",
      "shipping",
      "delivering",
      "completed",
      "cancelled",
      "returning",
    ];
    const validatedOrders = [];

    for (const order of orders) {
      if (
        typeof order?.id !== "string" ||
        !order.id.trim() ||
        !Array.isArray(order.items) ||
        order.items.length === 0 ||
        (order.status && !statuses.includes(order.status))
      ) {
        return res.status(400).json({ message: "Thông tin đơn hàng cũ không hợp lệ." });
      }

      const items = [];
      for (const item of order.items) {
        if (
          !item ||
          typeof item.name !== "string" ||
          !item.name.trim() ||
          !Number.isFinite(Number(item.price)) ||
          Number(item.price) < 0 ||
          !Number.isInteger(Number(item.quantity)) ||
          Number(item.quantity) < 1
        ) {
          return res.status(400).json({ message: "Sản phẩm trong đơn hàng cũ không hợp lệ." });
        }

        items.push({
          product: mongoose.isValidObjectId(item._id)
            ? item._id
            : new mongoose.Types.ObjectId(),
          name: item.name.trim(),
          price: Number(item.price),
          quantity: Number(item.quantity),
          image:
            typeof item.images?.[0] === "string"
              ? item.images[0]
              : typeof item.image === "string"
                ? item.image
                : "",
        });
      }

      const address = order.shippingAddress || {};
      const city =
        typeof address.city === "string" && address.city.trim()
          ? address.city.trim()
          : "Chưa cung cấp";
      const createdAt = new Date(order.createdAt);

      validatedOrders.push({
        sourceOrderId: order.id.trim(),
        items,
        status: order.status || "pending",
        totalPrice:
          Number.isFinite(Number(order.total)) && Number(order.total) >= 0
            ? Number(order.total)
            : items.reduce((total, item) => total + item.price * item.quantity, 0),
        shippingAddress: {
          fullName:
            typeof address.fullName === "string" && address.fullName.trim()
              ? address.fullName.trim()
              : "Chưa cung cấp",
          streetAddress:
            typeof address.streetAddress === "string" && address.streetAddress.trim()
              ? address.streetAddress.trim()
              : typeof address.address === "string" && address.address.trim()
                ? address.address.trim()
                : "Chưa cung cấp",
          city,
          state:
            typeof address.state === "string" && address.state.trim()
              ? address.state.trim()
              : city,
          zipCode: typeof address.zipCode === "string" ? address.zipCode.trim() : "",
          phoneNumber:
            typeof address.phoneNumber === "string" && address.phoneNumber.trim()
              ? address.phoneNumber.trim()
              : typeof address.phone === "string" && address.phone.trim()
                ? address.phone.trim()
                : "Chưa cung cấp",
        },
        createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
      });
    }

    let importedCount = 0;
    for (const order of validatedOrders) {
      const existingOrder = await Order.findOne({
        user: req.user._id,
        sourceOrderId: order.sourceOrderId,
      }).select("_id");
      if (existingOrder) continue;

      try {
        await Order.create({
          user: req.user._id,
          clerkId: req.user.clerkId,
          sourceOrderId: order.sourceOrderId,
          orderItems: order.items,
          shippingAddress: order.shippingAddress,
          paymentResult: { status: "unpaid" },
          totalPrice: order.totalPrice,
          status: order.status,
          createdAt: order.createdAt,
        });
        importedCount += 1;
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }

    res.status(200).json({ importedCount });
  } catch (error) {
    console.error("Error importing existing web orders:", error);
    res.status(500).json({ message: "Không thể nhập các đơn hàng cũ." });
  }
}

export async function advanceOrderStatuses(orders) {
  const activeOrders =
    orders ||
    (await Order.find({
      status: { $in: ["pending", "shipped", "shipping", "delivering"] },
    }));
  const now = Date.now();
  const statusRank = {
    pending: 0,
    shipped: 1,
    shipping: 1,
    delivering: 2,
    completed: 3,
  };

  for (const order of activeOrders) {
    if (!["pending", "shipped", "shipping", "delivering"].includes(order.status)) {
      continue;
    }

    const elapsed = now - order.createdAt.getTime();
    const nextStatus =
      elapsed >= 180_000
        ? "completed"
        : elapsed >= 120_000
          ? "delivering"
          : elapsed >= 60_000
            ? "shipping"
            : "pending";

    if (statusRank[nextStatus] <= statusRank[order.status]) continue;
    order.status = nextStatus;
    if (!order.shippedAt && statusRank[nextStatus] >= 1) {
      order.shippedAt = new Date(order.createdAt.getTime() + 60_000);
    }
    if (nextStatus === "completed") {
      order.deliveredAt = new Date(order.createdAt.getTime() + 180_000);
    }
    await order.save();
  }
  return activeOrders;
}

export async function getWebOrders(req, res) {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    await advanceOrderStatuses(orders);

    const orderIds = orders.map((order) => order._id);
    const reviews = await Review.find({ orderId: { $in: orderIds } }).select(
      "orderId productId",
    );
    const reviewedProductsByOrder = new Map();
    for (const review of reviews) {
      const orderId = review.orderId.toString();
      const productIds = reviewedProductsByOrder.get(orderId) || [];
      productIds.push(review.productId.toString());
      reviewedProductsByOrder.set(orderId, productIds);
    }

    const populatedOrders = await Order.populate(orders, "orderItems.product");
    res.status(200).json({
      orders: populatedOrders.map((order) => ({
        ...order.toObject(),
        reviewedProductIds:
          reviewedProductsByOrder.get(order._id.toString()) || [],
      })),
    });
  } catch (error) {
    console.error("Error fetching web orders:", error);
    res.status(500).json({ message: "Không thể tải danh sách đơn hàng." });
  }
}

export async function getUserOrders(req, res) {
  try {
    const orders = await Order.find({ clerkId: req.user.clerkId })
      .populate("orderItems.product")
      .sort({ createdAt: -1 });

    // check if each order has been reviewed

    const orderIds = orders.map((order) => order._id);
    const reviews = await Review.find({ orderId: { $in: orderIds } });
    const reviewedOrderIds = new Set(reviews.map((review) => review.orderId.toString()));

    const ordersWithReviewStatus = await Promise.all(
      orders.map(async (order) => {
        return {
          ...order.toObject(),
          hasReviewed: reviewedOrderIds.has(order._id.toString()),
        };
      })
    );

    res.status(200).json({ orders: ordersWithReviewStatus });
  } catch (error) {
    console.error("Error in getUserOrders controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
