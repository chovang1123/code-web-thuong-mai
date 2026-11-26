import { Router } from "express";
import { getCategoryCatalog } from "../services/catalog.js";

const router = Router();
router.get("/", async (_, res) => {
  try {
    res.json(await getCategoryCatalog());
  } catch {
    res.status(500).json({ message: "Không thể tải danh mục." });
  }
});
export default router;
