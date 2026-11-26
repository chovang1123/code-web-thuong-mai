import { test } from "node:test";
import assert from "node:assert/strict";
import { addressErrors, estimatedDelivery, isValidAddress } from "../src/lib/checkout.js";
const valid = { fullName: "Nguyễn Văn An", phoneNumber: "0912345678", state: "TP. Hồ Chí Minh", city: "Quận 1", streetAddress: "12 Nguyễn Huệ" };
test("address validation rejects blank fields and invalid phones; accepts formatted Vietnam numbers", () => {
  assert.equal(isValidAddress(valid), true);
  for (const phone of ["+84 912 345 678", "0912-345-678"]) assert.equal(isValidAddress({ ...valid, phoneNumber: phone }), true);
  for (const phone of ["123 Test", "123", "abcdefghij"]) assert.ok(addressErrors({ ...valid, phoneNumber: phone }).phoneNumber);
  for (const key of Object.keys(valid)) assert.ok(addressErrors({ ...valid, [key]: "   " })[key]);
  assert.ok(!isValidAddress(null));
});
test("delivery estimate uses the Vietnam date and crosses month boundaries", () => {
  assert.equal(estimatedDelivery(new Date("2026-11-29T01:00:00Z")), "01/12 – 03/12");
});
