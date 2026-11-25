import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("shared text and button color combinations meet WCAG AA contrast", () => {
  const css = fs.readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
  const colors = Object.fromEntries([...css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})/g)].map(([, name, hex]) => [name, hex]));
  const luminance = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  for (const [foreground, background] of [["primary", "surface"], ["primary", "background"], ["primary", "tag"], ["primary", "placeholder"], ["muted", "surface"], ["muted", "background"], ["original-price", "surface"], ["accent", "surface"], ["accent", "background"], ["surface", "accent"], ["surface", "primary"], ["background", "primary"]]) {
    const a = luminance(colors[foreground]), b = luminance(colors[background]);
    const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    assert.ok(ratio >= 4.5, `${foreground} on ${background}: ${ratio.toFixed(2)}:1`);
  }
});
