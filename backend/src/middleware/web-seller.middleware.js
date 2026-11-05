import { User } from "../models/user.model.js";
import { verifyWebAuthToken } from "../utils/web-auth.js";

export async function protectWebSeller(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : "";
    const userId = verifyWebAuthToken(token);
    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập lại để tiếp tục." });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== "seller") {
      return res.status(403).json({ message: "Chỉ tài khoản người bán mới được truy cập." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error authenticating seller request:", error);
    res.status(500).json({ message: "Không thể xác thực tài khoản người bán." });
  }
}
