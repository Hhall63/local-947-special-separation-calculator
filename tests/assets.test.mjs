import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const rootUrl = new URL("../", import.meta.url);

test("uses an optimized two-density Local 947 logo", async () => {
  const logo = await readFile(new URL("assets/local-947-logo.png", rootUrl));
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  assert.ok(logo.subarray(0, 8).equals(pngSignature), "Logo must remain a PNG");
  assert.equal(logo.toString("ascii", 12, 16), "IHDR");

  const width = logo.readUInt32BE(16);
  const height = logo.readUInt32BE(20);
  assert.ok(width <= 192 && height <= 192, `Logo is ${width}x${height}`);
  assert.ok(
    logo.byteLength <= Math.floor(213_444 * 0.6),
    `Logo is still ${logo.byteLength} bytes`,
  );
});
