import { Router } from "express";
import { addAddress, addBankAccount, changePassword, deleteAddress, deleteBankAccount, getProfile, listAddresses, listBankAccounts, login, register, setDefaultAddress, setDefaultBankAccount, updateAddress, updateBankAccount, updateProfile } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/password", changePassword);
router.get("/addresses", listAddresses);
router.post("/addresses", addAddress);
router.put("/addresses/:addressId", updateAddress);
router.delete("/addresses/:addressId", deleteAddress);
router.put("/addresses/:addressId/default", setDefaultAddress);
router.get("/bank-accounts", listBankAccounts);
router.post("/bank-accounts", addBankAccount);
router.put("/bank-accounts/:accountId", updateBankAccount);
router.delete("/bank-accounts/:accountId", deleteBankAccount);
router.put("/bank-accounts/:accountId/default", setDefaultBankAccount);

export default router;
