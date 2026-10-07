import crypto from "node:crypto";
import { promisify } from "node:util";
import { User } from "../models/user.model.js";
import { ENV } from "../config/env.js";

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derivedKey = await scrypt(password, salt, 64);
  const storedKey = Buffer.from(key, "hex");
  return storedKey.length === derivedKey.length && crypto.timingSafeEqual(storedKey, derivedKey);
}

export async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!name?.trim() || !normalizedEmail || !password || password.length < 6) {
      return res.status(400).json({ message: "Name, email and a password of at least 6 characters are required" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(409).json({ message: "Email is already registered" });

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      clerkId: `web_${crypto.randomUUID()}`,
      passwordHash: await hashPassword(password),
    });

    res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Unable to register user" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user?.passwordHash || !(await verifyPassword(password || "", user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.status(200).json({ user: { id: user._id, name: user.name, email: user.email, phone: user.phone, address: user.address, role: user.role } });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Unable to log in" });
  }
}

export async function getProfile(req, res) {
  const user = await User.findOne({ email: req.query.email }).select("name email phone address");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.status(200).json({ user });
}

function validateAddress(data) {
  const requiredFields = ["label", "fullName", "phoneNumber", "city", "state", "streetAddress"];
  return requiredFields.every((field) => typeof data[field] === "string" && data[field].trim());
}

export async function listAddresses(req, res) {
  const user = await User.findOne({ email: req.query.email }).select("addresses");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.status(200).json({ addresses: user.addresses });
}

export async function addAddress(req, res) {
  if (!validateAddress(req.body)) return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin địa chỉ" });
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ message: "User not found" });
  const shouldBeDefault = Boolean(req.body.isDefault) || user.addresses.length === 0;
  if (shouldBeDefault) user.addresses.forEach((address) => { address.isDefault = false; });
  user.addresses.push({ ...req.body, zipCode: req.body.zipCode?.trim() || "", isDefault: shouldBeDefault });
  await user.save();
  res.status(201).json({ address: user.addresses[user.addresses.length - 1] });
}

export async function updateAddress(req, res) {
  if (!validateAddress(req.body)) return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin địa chỉ" });
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ message: "User not found" });
  const address = user.addresses.id(req.params.addressId);
  if (!address) return res.status(404).json({ message: "Address not found" });
  Object.assign(address, { ...req.body, zipCode: req.body.zipCode?.trim() || "" });
  if (address.isDefault) user.addresses.forEach((item) => { if (item.id !== address.id) item.isDefault = false; });
  await user.save();
  res.status(200).json({ address });
}

export async function deleteAddress(req, res) {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ message: "User not found" });
  const address = user.addresses.id(req.params.addressId);
  if (!address) return res.status(404).json({ message: "Address not found" });
  const wasDefault = address.isDefault;
  user.addresses.pull(address._id);
  if (wasDefault && user.addresses.length > 0) user.addresses[0].isDefault = true;
  await user.save();
  res.status(200).json({ message: "Đã xóa địa chỉ" });
}

export async function setDefaultAddress(req, res) {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ message: "User not found" });
  const address = user.addresses.id(req.params.addressId);
  if (!address) return res.status(404).json({ message: "Address not found" });
  user.addresses.forEach((item) => { item.isDefault = item.id === address.id; });
  await user.save();
  res.status(200).json({ address });
}

function sanitizeBankAccount(account) {
  const data = account.toObject ? account.toObject() : account;
  return {
    ...data,
    accountNumber: data.accountNumber.length > 4 ? `•••• ${data.accountNumber.slice(-4)}` : data.accountNumber,
    identityNumber: data.identityNumber.length > 4 ? `•••• ${data.identityNumber.slice(-4)}` : data.identityNumber,
  };
}

function validateBankAccount(data) {
  const requiredFields = ["bankName", "branchName", "accountNumber", "accountHolder", "identityNumber"];
  return requiredFields.every((field) => typeof data[field] === "string" && data[field].trim());
}

export async function listBankAccounts(req, res) {
  const user = await User.findOne({ email: req.query.email }).select("bankAccounts");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.status(200).json({ bankAccounts: user.bankAccounts.map(sanitizeBankAccount) });
}

export async function addBankAccount(req, res) {
  if (!validateBankAccount(req.body)) return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin tài khoản" });
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ message: "User not found" });
  const shouldBeDefault = Boolean(req.body.isDefault) || user.bankAccounts.length === 0;
  if (shouldBeDefault) user.bankAccounts.forEach((account) => { account.isDefault = false; });
  user.bankAccounts.push({ ...req.body, isDefault: shouldBeDefault });
  await user.save();
  res.status(201).json({ bankAccount: sanitizeBankAccount(user.bankAccounts[user.bankAccounts.length - 1]) });
}

export async function updateBankAccount(req, res) {
  if (!validateBankAccount(req.body)) return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin tài khoản" });
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ message: "User not found" });
  const account = user.bankAccounts.id(req.params.accountId);
  if (!account) return res.status(404).json({ message: "Bank account not found" });
  Object.assign(account, req.body);
  if (account.isDefault) user.bankAccounts.forEach((item) => { if (item.id !== account.id) item.isDefault = false; });
  await user.save();
  res.status(200).json({ bankAccount: sanitizeBankAccount(account) });
}

export async function deleteBankAccount(req, res) {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ message: "User not found" });
  const account = user.bankAccounts.id(req.params.accountId);
  if (!account) return res.status(404).json({ message: "Bank account not found" });
  const wasDefault = account.isDefault;
  user.bankAccounts.pull(account._id);
  if (wasDefault && user.bankAccounts.length > 0) user.bankAccounts[0].isDefault = true;
  await user.save();
  res.status(200).json({ message: "Đã xóa tài khoản ngân hàng" });
}

export async function setDefaultBankAccount(req, res) {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ message: "User not found" });
  const account = user.bankAccounts.id(req.params.accountId);
  if (!account) return res.status(404).json({ message: "Bank account not found" });
  user.bankAccounts.forEach((item) => { item.isDefault = item.id === account.id; });
  await user.save();
  res.status(200).json({ bankAccount: sanitizeBankAccount(account) });
}

export async function updateProfile(req, res) {
  const { email, name, phone, address } = req.body;
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { name: name?.trim(), phone: phone?.trim(), address: address?.trim() } },
    { new: true, runValidators: true }
  ).select("name email phone address");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.status(200).json({ user });
}

export async function changePassword(req, res) {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "Mật khẩu mới phải khác mật khẩu hiện tại" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user?.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
      return res.status(401).json({ message: "Mật khẩu hiện tại không đúng" });
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();
    res.status(200).json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Không thể đổi mật khẩu lúc này" });
  }
}

export async function ensureAdmin() {
  const email = (ENV.ADMIN_EMAIL || "admin@netstore.local").toLowerCase();
  const passwordHash = await hashPassword(ENV.ADMIN_PASSWORD);
  await User.findOneAndUpdate(
    { email },
    {
      $set: { role: "admin" },
      $setOnInsert: { name: "Net Store Admin", email, clerkId: `web_admin_${crypto.randomUUID()}`, passwordHash },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`Admin account ready: ${email}`);
}
