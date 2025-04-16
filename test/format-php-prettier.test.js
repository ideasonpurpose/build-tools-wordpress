//@ts-check

import { describe, expect, test } from "vitest";

import { readFile } from "node:fs/promises";

import { tokenizeHTML } from "../bin/format-php-prettier.js";

describe("HTML-PHP Prettier", () => {
  test("All tokens exist", async () => {
    const input = (
      await readFile("./test/fixtures/format-php-prettier/basic-html.php")
    ).toString();

    const { tokenizedHTML, phpCodeBlocks } = tokenizeHTML(input);

    Object.keys(phpCodeBlocks).forEach((token) =>
      expect(tokenizedHTML.includes(token)).toBe(true),
    );
  });

  test("make tokens self-closing tags", async () => {
    const input = (
      await readFile("./test/fixtures/format-php-prettier/basic-html.php")
    ).toString();

    const { phpCodeBlocks: codeBlocks } = tokenizeHTML(input);

    const tokens = Object.keys(codeBlocks);

    expect(tokens[0]).toMatch(/^<php_\d+_* \/>$/);
    expect(tokens[1]).toMatch(/^_php_\d+_*$/);
    expect(tokens[2]).toMatch(/^<php_\d+_* \/>$/);
    expect(tokens[3]).toMatch(/^<php_\d+_* \/>$/);
  });

  test("single open PHP code block #11"),
    async () => {
      const input = (
        await readFile(
          "./test/fixtures/format-php-prettier/single-open-php-block.php",
        )
      ).toString();

      const { phpCodeBlocks: codeBlocks } = tokenizeHTML(input);

      const tokens = Object.keys(codeBlocks);

      expect(tokens).toHaveLength(1);
    };
});
