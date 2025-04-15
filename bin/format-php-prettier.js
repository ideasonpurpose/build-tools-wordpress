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

function tokenizeHTML(htmlContent) {
  const phpCodeBlocks = {};
  let tokenCount = 0;

  // Tokens are end-padded to the length of the span, up to 80 characters
  const tokenizedHTML = htmlContent.replace(
    /<\?(?:php|=)[\s\S]*?\?>/gs,
    (phpCodeBlock) => {
      const codeLength = Math.min(phpCodeBlock.length, 80);
      const token = `__php_${tokenCount++}__`.padEnd(codeLength, "_");
      phpCodeBlocks[token] = phpCodeBlock;
      return token;
    },
  );

  return { tokenizedHTML, phpCodeBlocks };
}

function unTokenizeHTML(htmlContent, tokens) {
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
