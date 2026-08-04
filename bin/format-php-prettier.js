#!/usr/bin/env node

//@ts-check

import prettierConfig from "@ideasonpurpose/prettier-config" with {
  type: "json",
};
/**
 * This is an experimental proof-of-concept for formatting mixed HTML & PHP
 * files from a single function.
 *
 * TODO: Testing, naming, modularization, VS Code extension
 */
import prettier from "prettier";

const phpPlugin = await import("@prettier/plugin-php");

// Explicitly reset the plugin because global installs can't resolve it
// @ts-expect-error — prettierConfig types expect string paths, but runtime accepts plugin modules
prettierConfig.plugins = [phpPlugin];

import { realpathSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Prettier API doesn't recognize overrides, so we extract them
 */
const htmlOptions = prettierConfig.overrides.find(
  (o) => o.files === "*.html",
)?.options;

const phpOptions = prettierConfig.overrides.find(
  (o) => o.files === "*.php",
)?.options;

/** @param {string} html @param {number} offset */
const isInTag = (html, offset) => {
  if (offset === 0) return false;

  for (let i = offset - 1; i >= 0; i--) {
    if (html[i] === "<") {
      return true;
    } else if (html[i] === ">") {
      return false;
    }
  }
  return false;
};

/**
 * Replaces all PHP Code Blocks with iterated tokens.
 *
 * Code Blocks inside HTML tags will be replaced with attribute-safe tokens: _php_4____
 * All other Code Blocks will be replaced with tag-shaped tokens: <php_4___ />
 *
 * Tokens will match the length of their Code Blocks up to 80 characters.
 *
 * NOTE: Because Prettier's HTML formatter will always add a space before self-closing
 * tags' closing slash, we just include the space in the token to prevent it from
 * being mutilated by the HTML formatting step. Cleaner than adding a string.replace
 * to unTokenizeHTML().
 */
/** @param {string} htmlContent */
export function tokenizeHTML(htmlContent) {
  let tokenizedHTML = "";
  const phpCodeBlocks = new Map(); // Changed to Map for better performance and type safety
  let tokenCount = 0;

  /**
   * Check previous content for a '>' or '<' then return either an attribute-safe
   * token: _php_4____ or a tag-shaped token: <php_4___ />
   *
   * NOTE: This uses tokenCount from the enclosing scope
   */
  /** @param {string} phpCodeBlock @param {string} prevContent */
  const tokenizeCodeBlock = (phpCodeBlock, prevContent) => {
    let start = "<";
    let end = " />";
    if (isInTag(prevContent, prevContent.length)) {
      start = "_";
      end = "___";
    }

    const codeLength = Math.min(phpCodeBlock.length, 80) - end.length;
    return `${start}php_${tokenCount++}__`.padEnd(codeLength, "_") + end;
  };

  // const regex = new RegExp(/<\?(?:php|=).*?\?>/, "gs");
  // Trying to capture open-ended PHP codeBlocks in a single regexp
  const regex = new RegExp(/<\?(?:php|=).*?(?:\?>|$)/, "gs");

  let match = regex.exec(htmlContent);
  let token;
  let lastIndex = 0;
  while (match !== null) {
    tokenizedHTML += htmlContent.slice(lastIndex, match.index);

    token = tokenizeCodeBlock(match[0], tokenizedHTML);
    phpCodeBlocks.set(token, match[0]);
    tokenizedHTML += token;

    lastIndex = match.index + match[0].length;
    match = regex.exec(htmlContent);
  }
  tokenizedHTML += htmlContent.slice(lastIndex);

  return { tokenizedHTML, phpCodeBlocks };
}

/** @param {string} tokenizedHTML @param {Map<string, string>} phpCodeBlocks */
export function unTokenizeHTML(tokenizedHTML, phpCodeBlocks) {
  let phpContent = tokenizedHTML;
  for (const [token, phpBlock] of phpCodeBlocks) {
    /**
     * Create a pattern from token that matches whitespace breaks resulting
     * from Prettier's HTML formatting, usually on very long lines.
     * eg. the token `<php_4___ />` formats to `<php_4___ \n    />`
     * This changes the token to `/<php_4___\s+\/>/g`
     */
    const regexToken = new RegExp(token.replace("_ />", "_\\s+\\/>"), "g");
    phpContent = phpContent.replace(
      regexToken,
      phpBlock.replace(/\$/g, "$$$$"),
    );
  }
  return phpContent;
}

/**
 * @param {bigint} start
 * @param {bigint} end
 */
const ms = (start, end) => Number(end - start) / 1e6;

/**
 * Formats mixed HTML & PHP content:
 *  1. Tokenize PHP Blocks as HTML-safe and attribute-safe strings
 *  2. Format the result as HTML
 *  3. Un-tokenize HTML back to PHP
 *  4. Format again as PHP
 *
 * @param {string} content
 * @param {string} [label]
 * @returns {Promise<string>}
 */
export async function formatHTMLThenPHPContent(content, label = "stdin") {
  const t0 = process.hrtime.bigint();
  const startupMs = process.uptime() * 1e3;

  const tTokenize0 = process.hrtime.bigint();
  const { tokenizedHTML, phpCodeBlocks } = tokenizeHTML(content);
  const tTokenize1 = process.hrtime.bigint();

  const htmlFormatted = await prettier.format(tokenizedHTML, {
    ...prettierConfig,
    ...htmlOptions,
    parser: "html",
    embeddedLanguageFormatting: "auto",
  });
  const tHtml = process.hrtime.bigint();

  const phpUnTokenized = unTokenizeHTML(htmlFormatted, phpCodeBlocks);
  const tUnTokenize = process.hrtime.bigint();

  const phpFormatted = await prettier.format(phpUnTokenized, {
    ...prettierConfig,
    ...phpOptions,
    parser: "php",
    embeddedLanguageFormatting: "auto",
  });
  const tEnd = process.hrtime.bigint();

  console.error(
    [
      label,
      `startup ${startupMs.toFixed(2)}ms`,
      `tokenize ${ms(tTokenize0, tTokenize1).toFixed(2)}ms`,
      `formatHTML ${ms(tTokenize1, tHtml).toFixed(2)}ms`,
      `unTokenize ${ms(tHtml, tUnTokenize).toFixed(2)}ms`,
      `formatPHP ${ms(tUnTokenize, tEnd).toFixed(2)}ms`,
      `total ${(startupMs + ms(t0, tEnd)).toFixed(2)}ms`,
    ].join("  "),
  );

  return phpFormatted;
}

/**
 * Formats a mixed HTML & PHP file in place.
 *
 * @param {string} filepath
 */
export async function formatHTMLThenPHP(filepath) {
  const rawFile = await readFile(filepath, "utf8");
  const phpFormatted = await formatHTMLThenPHPContent(
    rawFile,
    basename(filepath),
  );
  await writeFile(filepath, phpFormatted, "utf8");
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

/**
 * CLI: filepath arg overwrites the file; no arg reads STDIN and writes STDOUT.
 *
 * @param {string} [filepath]
 */
export async function main(filepath = process.argv[2]) {
  try {
    if (filepath) {
      await formatHTMLThenPHP(resolve(filepath));
      return;
    }

    if (process.stdin.isTTY) {
      console.error(
        "Usage: iop-html-php-prettier <filepath>\n       iop-html-php-prettier < input.php",
      );
      process.exitCode = 1;
      return;
    }

    const formatted = await formatHTMLThenPHPContent(
      await readStdin(),
      "stdin",
    );
    process.stdout.write(formatted);
  } catch (error) {
    console.error("Error:", error);
    process.exitCode = 1;
  }
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
