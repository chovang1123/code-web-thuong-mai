import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
const colors = Object.fromEntries([...css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map(([, name, hex]) => [name, hex]));
const luminance = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);

test("semantic text, badge and CTA color combinations meet WCAG AA", () => {
  const pairs = [
    ...["surface", "bg-page", "surface-media", "primary-soft", "accent-soft", "sale-soft"].map(background => ["text", background]),
    ["text-muted", "surface"],
    ...["bg-page", "surface-media", "primary-soft", "accent-soft", "sale-soft"].map(background => ["text-muted-on-warm", background]),
    ["primary", "primary-soft"], ["surface", "primary"],
    ...["surface", "bg-page", "surface-media", "primary-soft", "accent-soft"].map(background => ["accent", background]),
    ["sale", "surface"], ["surface", "sale"],
  ];
  for (const [foreground, background] of pairs) {
    const a = luminance(colors[foreground]), b = luminance(colors[background]);
    const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    assert.ok(ratio >= 4.5, foreground + " on " + background + ": " + ratio.toFixed(2) + ":1");
  }
});

test("color literals live only in design tokens", () => {
  const root = new URL("../src/", import.meta.url);
  for (const file of fs.readdirSync(root, { recursive: true }).filter(file => /\.(css|jsx)$/.test(file) && file.replaceAll("\\", "/") !== "styles/tokens.css")) {
    const content = fs.readFileSync(new URL(file.replaceAll("\\", "/"), root), "utf8");
    assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(content), path.basename(file) + " contains a hard-coded color");
  }
});
