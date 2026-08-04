#!/usr/bin/env node

// @ts-check

import { readFileSync } from "node:fs";
import { loadConfig, optimize } from "svgo";
import fallbackConfig from "../config/svgo.config.mjs";

console.error("starting iop-vscode-svgo");

if (process.stdin.isTTY) {
  process.stderr.write("Error: No SVG data received on stdin\n");
  process.exit(1);
}

const svg = readFileSync(0, "utf8").trim();
if (!svg) {
  process.stderr.write("Error: No SVG data received on stdin\n");
  process.exit(1);
}

try {
  const svgoConfig = /** @type {import("svgo").Config} */ (
    (await loadConfig()) ?? fallbackConfig
  );
  const result = optimize(svg, svgoConfig);
  process.stdout.write(result.data);
} catch (err) {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
}
console.error("Done!");
