#!/usr/bin/env node

/**
 * This is an experimental proof-of-concept for formatting mixed HTML & PHP
 * files from a single function.
 *
 * TODO: Testing, naming, modularization, VS Code extension
 */
import prettier from "prettier";
import prettierConfig from "@ideasonpurpose/prettier-config" with { type: "json" };

import { readFile, writeFile } from "fs/promises";
import { resolve, basename } from "path";

/**
 * Prettier API doesn't recognize overrides, so we extract them
 */
const htmlOptions = prettierConfig.overrides.find(
  (o) => o.files === "*.html",
)?.options;

const phpOptions = prettierConfig.overrides.find(
  (o) => o.files === "*.php",
)?.options;

/**
 * Replaces PHP Code Blocks with tokens, returns tokenized HTML and an object containing
 * PHP Code Blocks
 *
 * For code blocks between tags (bounded by > & <) tokens will be self-closing HTML
 * tags, similar to this: <php_14______ /> PHP Code blocks at the beginning and end of
 * the file will be tokenized as self-closing if they preceed or follow an HTML tag.
 *
 * All other PHP Code Blocks are represented as HTML attribute-safe padded strings, up
 * to 80 characters long.
 *
 * NOTE: Because Prettier's HTML formatter will always add a space before self-closing
 * tags' closing slash, we just include the space in the token to prevent it from
 * being mutilated by the HTML formatting step. Cleaner than adding a string.replace
 * to unTokenizeHTML().
 */
export function tokenizeHTML(htmlContent) {
  const phpCodeBlocks = {};
  let tokenCount = 0;

  // const pattern = /<\?(?:php|=)[\s\S]*?\?>/gs;
  // const pattern =
  //   /(?<before>(?:[^\s]|\s|^)\s*)(?<php><\?(?:php|=).*?(?:\?>|$))(?<after>(?:\s*)[^\s]|$)/gs;
  // const pattern =
  //   /((?:[^\s]|\s|^)\s*)(<\?(?:php|=).*?(?:\?>|$))((?:\s*)[^\s]|$)/gms;
  // // const pattern = /([^\s]+)\s*(<\?(?:php|=).*?(?:\?>|$))\s*([^\s]*)/gms;
  // const pattern =
  //   /([^\s]?\s*)?(<\?(?:php|=).*?(?:\?>|$))((?:\s*)[^\s]|$)/gms;
  const pattern =
    /(?<=((?:[^\s]|\s|^)\s*))(<\?(?:php|=).*?\?>)(?=((?:\s*)[^\s]|$))/gms;

  let tokenizedHTML = htmlContent.replace(
    pattern,
    (string, before, phpCodeBlock, after, offset) => {
      const start = [">", ""].includes(before.trim()) ? "<" : "_";
      const end = ["<", ""].includes(after.trim()) ? " />" : "___";

      // end-pad the token to the length of the span, up to 80 characters
      const codeLength = Math.min(phpCodeBlock.length, 80 - end.length);
      const token =
        `${start}php_${tokenCount++}__`.padEnd(codeLength, "_") + end;
      phpCodeBlocks[token] = phpCodeBlock;

      return token;
    },
  );

  /**
   * special case followup for open-ended PHP tags at the end of the document
   * TODO: Merge this back up into a single pattern
   */
  tokenizedHTML = tokenizedHTML.replace(
    /(?<=((?:[^\s]|\s|^)\s*))(<\?(?:php|=).*$)/gms,

    (string, before, phpCodeBlock, offset) => {
      const start = [">", ""].includes(before.trim()) ? "<" : "_";
      const end = start === "<" ? " />" : "___";

      const codeLength = Math.min(phpCodeBlock.length, 80 - end.length);
      const token =
        `${start}php_${tokenCount++}__`.padEnd(codeLength, "_") + end;
      phpCodeBlocks[token] = phpCodeBlock;

      return token;
    },
  );

  return { tokenizedHTML, phpCodeBlocks };
}

export function unTokenizeHTML(htmlContent, tokens) {
  let phpContent = htmlContent;
  for (const token in tokens) {
    phpContent = phpContent.replace(new RegExp(token, "g"), tokens[token]);
  }
  return phpContent;
}

async function formatHTMLThenPHP(filepath) {
  try {
    const startTime = process.hrtime.bigint();
    const rawFile = await readFile(filepath, "utf8");

    const { tokenizedHTML, phpCodeBlocks } = tokenizeHTML(rawFile);

    const htmlFormatted = await prettier.format(tokenizedHTML, {
      ...prettierConfig,
      ...htmlOptions,
      parser: "html",
    });

    const phpUnTokenized = unTokenizeHTML(htmlFormatted, phpCodeBlocks);

    const phpFormatted = await prettier.format(phpUnTokenized, {
      ...prettierConfig,
      ...phpOptions,
      parser: "php",
    });

    await writeFile(filepath, phpFormatted, "utf8");
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime);

    console.log(`${basename(filepath)} ${(duration / 1e6).toFixed(2)}ms`);
  } catch (error) {
    console.error("Error:", error);
  }
}

if (process.argv[2]) {
  const fullPath = resolve(process.argv[2]);
  formatHTMLThenPHP(fullPath);
} else {
  console.error("Error: A filepath is required.");
}
