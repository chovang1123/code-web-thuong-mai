import { User } from "../models/user.model.js";
import { verifyWebAuthToken } from "../utils/web-auth.js";

export async function protectWebRoute(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : "";
    const userId = verifyWebAuthToken(token);
    if (!userId) {
      return res.status(401).json({ message: "Please log in again to sync your cart." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "User account no longer exists." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error authenticating web cart request:", error);
    res.status(500).json({ message: "Unable to authenticate cart request." });
  }
}
