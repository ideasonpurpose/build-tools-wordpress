#!/usr/bin/env node

//@ts-check

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
export function tokenizeHTML(htmlContent) {
  let tokenizedHTML = "";
  const phpCodeBlocks = {};
  let tokenCount = 0;

  /**
   * Check previous content for a '>' or '<' then return either an attribute-safe
   * token: _php_4____ or a tag-shaped token: <php_4___ />
   *
   * NOTE: This uses tokenCount from the enclosing scope
   */
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

  // const pattern = /<\?(?:php|=)[\s\S]*?\?>/gs;
  // const pattern =
  //   /(?<before>(?:[^\s]|\s|^)\s*)(?<php><\?(?:php|=).*?(?:\?>|$))(?<after>(?:\s*)[^\s]|$)/gs;
  // const pattern =
  //   /((?:[^\s]|\s|^)\s*)(<\?(?:php|=).*?(?:\?>|$))((?:\s*)[^\s]|$)/gms;
  // // const pattern = /([^\s]+)\s*(<\?(?:php|=).*?(?:\?>|$))\s*([^\s]*)/gms;
  // const pattern =
  //   /([^\s]?\s*)?(<\?(?:php|=).*?(?:\?>|$))((?:\s*)[^\s]|$)/gms;
  // const pattern =
  //   /(?<=((?:[^\s]|\s|^)\s*))(<\?(?:php|=).*?\?>)(?=((?:\s*)[^\s]|$))/gms;
  // try removing look ahead/behind
  const pattern = /(<\?(?:php|=).*?\?>)/gms;

  // const regex = new RegExp(/<\?(?:php|=).*?\?>/, "gs");
  // Trying to capture open-ended PHP codeBlocks in a single regexp
  const regex = new RegExp(/<\?(?:php|=).*?(?:\?>|$)/, "gs");

  let match;
  let token;
  let lastIndex = 0;
  while ((match = regex.exec(htmlContent)) !== null) {
    tokenizedHTML += htmlContent.slice(lastIndex, match.index);

    token = tokenizeCodeBlock(match[0], tokenizedHTML);
    phpCodeBlocks[token] = match[0];
    tokenizedHTML += token;

    lastIndex = match.index + match[0].length;
  }
  tokenizedHTML += htmlContent.slice(lastIndex);

  return { tokenizedHTML, phpCodeBlocks };
}

export function unTokenizeHTML(tokenizedHTML, phpCodeBlocks) {
  let phpContent = tokenizedHTML;
  for (const token in phpCodeBlocks) {
    /**
     * Create a pattern from token that matches whitespace breaks resulting
     * from Prettier's HTML formatting, usually on very long lines.
     * eg. the token `<php_4___ />` formats to `<php_4___ \n    />`
     * This changes the token to `/<php_4___\s+\/>/g`
     */
    const regexToken = new RegExp(token.replace("_ />", "_\\s+\\/>"), "g");
    phpContent = phpContent.replace(
      regexToken,
      phpCodeBlocks[token].replace(/\$/g, "$$$$"),
    );
  }
  return phpContent;
}

/**
 * Formats a mixed HTML & PHP file with these steps:
 *  1. Tokenize PHP Blocks as HTML-safe and attribute-safe strings
 *  2. Format the result as HTML
 *  3. Un-tokenize HTML back to PHP
 *  4. Format again as PHP
 *  5. Overwrite the file
 *
 * @param {string} filepath - The path to the file to format (must be a valid file path).
 */
async function formatHTMLThenPHP(filepath) {
  try {
    const startTime = process.hrtime.bigint();
    const rawFile = await readFile(filepath, "utf8");

    const { tokenizedHTML, phpCodeBlocks } = tokenizeHTML(rawFile);

    const htmlFormatted = await prettier.format(tokenizedHTML, {
      ...prettierConfig,
      ...htmlOptions,
      parser: "html",
      embeddedLanguageFormatting: "auto",
    });

    const phpUnTokenized = unTokenizeHTML(htmlFormatted, phpCodeBlocks);

    const phpFormatted = await prettier.format(phpUnTokenized, {
      ...prettierConfig,
      ...phpOptions,
      parser: "php",
      embeddedLanguageFormatting: "auto",
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
