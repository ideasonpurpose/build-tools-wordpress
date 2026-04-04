#!/usr/bin/env node

//@ts-check

/**
 * Work in progress formatter for WordPress block pattern PHP files.
 *
 * TODO: Testing, naming, modularization, VS Code extension
 */
import prettier from "prettier";

/**
 * These container blocks should always have a single blank line
 * before their opening comment and another blank line after their
 * closing comment.
 *   - wp:paragraph
 *   - wp:column
 *   - wp:group
 *   - wp:image
 *   - wp:heading
 *   - wp:list
 *   - wp:quote
 *   - wp:pullquote
 *   - wp:buttons
 *   - wp:columns
 *   - wp:media-text
 *   - wp:gallery
 */

import { readFile, writeFile } from "fs/promises";
import { resolve, basename } from "path";

/**
 *
 * @param {String} wpCommentTag
 */
export function formatWpCommentJson(wpCommentTag) {
  const match = wpCommentTag.match(/<!--\s*wp:[\w-]+?\s*(\{.*?\})\s*-->/s);
  if (!match) {
    return wpCommentTag; // Return original if no match
  }

  const jsonStr = match[1];
  try {
    const jsonObj = JSON.parse(jsonStr);
    const indent =
      JSON.stringify(jsonObj).length > 50 || Object.keys(jsonObj).length > 2
        ? 2
        : 0;
    const prettyJson = JSON.stringify(jsonObj, null, indent);
    return wpCommentTag.replace(jsonStr, prettyJson);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in wp comment: ${message}`);
  }
}

/**
 * @param {string} content
 * @returns {string}
 */
export function formatAllWpComments(content) {
  const htmlCommentRegex = /<!--[\s\S]*?-->/g;
  return content.replace(
    htmlCommentRegex,
    /** @param {string} comment */ (comment) => {
      return formatWpCommentJson(comment);
    },
  );
}

/**
 * @param {string} content
 * @returns {string}
 */
export function normalizeCommentTagSpacing(content) {
  let newContent = content;
  const containerBlocks = [
    "wp:buttons",
    "wp:column",
    "wp:columns",
    "wp:gallery",
    "wp:group",
    "wp:heading",
    "wp:image",
    "wp:list",
    "wp:media-text",
    "wp:paragraph",
    "wp:pattern",
    "wp:pullquote",
    "wp:quote",
  ];

  containerBlocks.forEach((block) => {
    const openingTagRegex = new RegExp(`(<!--\\s*${block}[^>]*-->)`, "g");
    const closingTagRegex = new RegExp(`>\\s*(<!--\\s*/${block}\\s*-->)`, "g");

    // Ensure one blank line before opening tag
    newContent = newContent.replace(
      openingTagRegex,
      /** @param {string} match @param {string} p1 */ (match, p1) => `\n${p1}`,
    );

    // Ensure one blank line after closing tag
    newContent = newContent.replace(
      closingTagRegex,
      /** @param {string} match @param {string} p1 */ (match, p1) =>
        `>\n${p1}\n`,
    );
  });
  return newContent;
}

/**
 * @param {String} filepath
 */
async function formatWPBlockPattern(filepath) {
  try {
    const startTime = process.hrtime.bigint();
    const rawFile = await readFile(filepath, "utf8");

    const formattedHTML = await prettier.format(rawFile, {
      parser: "html",
      tabWidth: 0,
      useTabs: false,
      printWidth: 80,
      htmlWhitespaceSensitivity: "css",
    });

    const cleanedWhiteSpace = normalizeCommentTagSpacing(formattedHTML);
    const formattedCommentsJSON = formatAllWpComments(cleanedWhiteSpace);
    const finalFormatted =
      formattedCommentsJSON.replace(/\n{3,}/g, "\n\n").trim() + "\n";

    await writeFile(filepath, finalFormatted, "utf8");
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime);

    console.log(`${basename(filepath)} ${(duration / 1e6).toFixed(2)}ms`);
  } catch (error) {
    console.error("Error:", error);
  }
}

if (process.argv[2]) {
  const fullPath = resolve(process.argv[2]);
  formatWPBlockPattern(fullPath);
} else {
  console.error("Error: A filepath is required.");
}
