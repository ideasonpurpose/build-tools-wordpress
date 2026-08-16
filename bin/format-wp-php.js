#!/usr/bin/env node

//@ts-check

import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const blockPatternPath = /(?:^|\/)wp-content\/themes\/[^/]+\/patterns\/.*\.php$/;

/**
 * @param {string} filepath
 * @returns {string}
 */
export function getFormatter(filepath) {
  const normalizedPath = filepath.replaceAll("\\", "/");
  return blockPatternPath.test(normalizedPath)
    ? "iop-format-wp-block-pattern"
    : "format-mixed-php-html";
}

/**
 * @param {string[]} args
 */
export async function main(args = process.argv.slice(2)) {
  const fileFlagIndex = args.indexOf("--file");
  const filepath = args[fileFlagIndex + 1];

  if (fileFlagIndex === -1 || !filepath) {
    console.error(
      "Usage: iop-format-wp-php --file <filepath> < input.php",
    );
    process.exitCode = 1;
    return;
  }

  if (process.stdin.isTTY) {
    console.error(
      "Usage: iop-format-wp-php --file <filepath> < input.php",
    );
    process.exitCode = 1;
    return;
  }

  const formatter = getFormatter(filepath);

  try {
    const formatted = execFileSync(formatter, [], {
      input: await readStdin(),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "inherit"],
    });
    process.stdout.write(formatted);
  } catch (error) {
    console.error(`Error running ${formatter}:`, error);
    process.exitCode = 1;
  }
}

/**
 * @returns {Promise<string>}
 */
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const isMain = (() => {
  if (process.argv[1] == null) return false;
  try {
    return (
      fileURLToPath(import.meta.url) === realpathSync(resolve(process.argv[1]))
    );
  } catch {
    return false;
  }
})();

if (isMain) main();
