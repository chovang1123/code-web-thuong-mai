import { User } from "../models/user.model.js";

export async function webAdminOnly(req, res, next) {
  const email = req.headers["x-user-email"];
  const user = email ? await User.findOne({ email: String(email).toLowerCase() }) : null;
  if (!user || user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  req.user = user;
  next();
}
