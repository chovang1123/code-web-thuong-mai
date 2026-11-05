import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";

function serializeProduct(product) {
  return product.toObject ? product.toObject() : product;
}

function validateProduct(data) {
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const category = typeof data.category === "string" ? data.category.trim() : "";
  const image = typeof data.image === "string" ? data.image.trim() : "";
  const price = Number(data.price);
  const stock = Number(data.stock);

  if (!name || !description || !category || !image || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
    return null;
  }

  return { name, description, category, image, price, stock };
}

function serializeSellerOrder(order, sellerId) {
  const orderData = order.toObject();
  orderData.orderItems = orderData.orderItems.filter(
    (item) =>
      String(item.sellerId || item.product?.sellerId || "") === String(sellerId),
  );
  orderData.sellerTotal = orderData.orderItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  return orderData;
}

async function findSellerOrders(sellerId) {
  const productIds = await Product.find({ sellerId }).distinct("_id");
  if (!productIds.length) return [];

  const orders = await Order.find({ "orderItems.product": { $in: productIds } })
    .populate("user", "name email")
    .populate("orderItems.product", "sellerId")
    .sort({ createdAt: -1 });

  return orders
    .map((order) => serializeSellerOrder(order, sellerId))
    .filter((order) => order.orderItems.length > 0);
}

export async function getSellerDashboard(req, res) {
  try {
    const [products, orders] = await Promise.all([
      Product.find({ sellerId: req.user._id }).sort({ createdAt: -1 }),
      findSellerOrders(req.user._id),
    ]);

    const completedRevenue = orders
      .filter((order) => order.status !== "cancelled")
      .reduce((sum, order) => sum + order.sellerTotal, 0);

    const chart = Array.from({ length: 6 }, (_, index) => {
      const month = new Date();
      month.setDate(1);
      month.setHours(0, 0, 0, 0);
      month.setMonth(month.getMonth() - (5 - index));
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
      const revenue = orders.reduce((sum, order) => {
        const orderMonth = new Date(order.createdAt);
        const orderKey = `${orderMonth.getFullYear()}-${String(orderMonth.getMonth() + 1).padStart(2, "0")}`;
        return sum + (orderKey === key && order.status !== "cancelled" ? order.sellerTotal : 0);
      }, 0);
      return {
        label: month.toLocaleDateString("vi-VN", { month: "short" }),
        revenue,
      };
    });

    res.status(200).json({
      shop: {
        name: req.user.shopName,
        location: req.user.shopLocation,
        owner: req.user.name,
      },
      stats: {
        revenue: completedRevenue,
        orders: orders.length,
        products: products.length,
        lowStock: products.filter((product) => product.stock <= 5).length,
      },
      chart,
      products: products.map(serializeProduct),
      orders,
    });
  } catch (error) {
    console.error("Error fetching seller dashboard:", error);
    res.status(500).json({ message: "Không thể tải dữ liệu gian hàng." });
  }
}

export async function updateSellerProfile(req, res) {
  const shopName = typeof req.body.shopName === "string" ? req.body.shopName.trim() : "";
  const shopLocation = typeof req.body.shopLocation === "string" ? req.body.shopLocation.trim() : "";
  if (!shopName || !shopLocation) {
    return res.status(400).json({ message: "Vui lòng nhập tên gian hàng và địa chỉ." });
  }

  try {
    req.user.shopName = shopName;
    req.user.shopLocation = shopLocation;
    await req.user.save();
    await Product.updateMany(
      { sellerId: req.user._id },
      { $set: { sellerName: shopName, sellerLocation: shopLocation } },
    );
    res.status(200).json({
      shop: { name: shopName, location: shopLocation, owner: req.user.name },
    });
  } catch (error) {
    console.error("Error updating seller profile:", error);
    res.status(500).json({ message: "Không thể cập nhật thông tin gian hàng." });
  }
}

export async function createSellerProduct(req, res) {
  const productData = validateProduct(req.body);
  if (!productData) {
    return res.status(400).json({ message: "Vui lòng nhập đúng tên, mô tả, danh mục, giá, tồn kho và đường dẫn ảnh." });
  }

  try {
    const product = await Product.create({
      ...productData,
      brand: req.user.shopName,
      sellerName: req.user.shopName,
      sellerLocation: req.user.shopLocation,
      sellerId: req.user._id,
      images: [productData.image],
    });
    res.status(201).json({ product });
  } catch (error) {
    console.error("Error creating seller product:", error);
    res.status(500).json({ message: "Không thể thêm sản phẩm." });
  }
}

export async function updateSellerProduct(req, res) {
  const productData = validateProduct(req.body);
  if (!productData) {
    return res.status(400).json({ message: "Vui lòng nhập đúng tên, mô tả, danh mục, giá, tồn kho và đường dẫn ảnh." });
  }

  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.productId, sellerId: req.user._id },
      {
        ...productData,
        brand: req.user.shopName,
        sellerName: req.user.shopName,
        sellerLocation: req.user.shopLocation,
        images: [productData.image],
      },
      { new: true, runValidators: true },
    );
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm của gian hàng." });
    res.status(200).json({ product });
  } catch (error) {
    console.error("Error updating seller product:", error);
    res.status(500).json({ message: "Không thể cập nhật sản phẩm." });
  }
}

export async function deleteSellerProduct(req, res) {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.productId,
      sellerId: req.user._id,
    });
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm của gian hàng." });
    res.status(200).json({ message: "Đã xóa sản phẩm." });
  } catch (error) {
    console.error("Error deleting seller product:", error);
    res.status(500).json({ message: "Không thể xóa sản phẩm." });
  }
}

export async function updateSellerOrderStatus(req, res) {
  const { status } = req.body;
  if (!["shipped", "delivered"].includes(status)) {
    return res.status(400).json({ message: "Trạng thái đơn hàng không hợp lệ." });
  }

  try {
    const order = await Order.findById(req.params.orderId).populate("orderItems.product", "sellerId");
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
    if (order.status === "cancelled") {
      return res.status(400).json({ message: "Đơn hàng đã bị hủy, không thể cập nhật." });
    }

    const sellerItems = order.orderItems.filter(
      (item) =>
        String(item.sellerId || item.product?.sellerId || "") === String(req.user._id),
    );
    if (!sellerItems.length) {
      return res.status(404).json({ message: "Đơn hàng không có sản phẩm của gian hàng." });
    }
    if (sellerItems.some((item) => {
      const currentStatus = item.sellerStatus || "pending";
      return (
        (status === "shipped" && currentStatus !== "pending") ||
        (status === "delivered" && currentStatus !== "shipped")
      );
    })) {
      return res.status(400).json({ message: "Vui lòng cập nhật đơn theo đúng thứ tự: chờ xử lý → đang giao → đã giao." });
    }

    sellerItems.forEach((item) => {
      item.sellerId = req.user._id;
      item.sellerStatus = status;
    });
    await order.save();
    res.status(200).json({ message: "Đã cập nhật trạng thái đơn hàng." });
  } catch (error) {
    console.error("Error updating seller order:", error);
    res.status(500).json({ message: "Không thể cập nhật trạng thái đơn hàng." });
  }
}
