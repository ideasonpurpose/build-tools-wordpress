//@ts-check

import { describe, expect, test } from "vitest";

import { readFile } from "node:fs/promises";

import { tokenizeHTML, unTokenizeHTML } from "../bin/format-php-prettier.js";

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

  test("single open PHP code block #11", async () => {
    const input = (
      await readFile(
        "./test/fixtures/format-php-prettier/single-open-php-block.php",
      )
    ).toString();

    const { phpCodeBlocks: codeBlocks } = tokenizeHTML(input);

    const tokens = Object.keys(codeBlocks);

    expect(tokens).toHaveLength(1);
  });

  test("bare attribute in tag", async () => {
    const input = (
      await readFile(
        "./test/fixtures/format-php-prettier/card-attribute-bug.php",
      )
    ).toString();

    const { phpCodeBlocks: codeBlocks } = tokenizeHTML(input);

    const tokens = Object.keys(codeBlocks);

    expect(tokens[0]).toMatch(/^_php_\d+_*$/);
    expect(tokens[1]).toMatch(/^_php_\d+_*$/);
    expect(tokens[2]).toMatch(/^<php_\d+_* \/>$/);
    expect(tokens[3]).toMatch(/^<php_\d+_* \/>$/);
    expect(tokens[4]).toMatch(/^<php_\d+_* \/>$/);

    expect(tokens).toHaveLength(5);
  });

  /**
   * If code blocks contain JS capture-group replacement strings
   * those strings will vanish from the output.
   */
  test("$ capture group references bug", async () => {
    const input = (
      await readFile("./test/fixtures/format-php-prettier/regex-string-bug.php")
    ).toString();

    const { tokenizedHTML, phpCodeBlocks } = tokenizeHTML(input);

    const formattedContent = unTokenizeHTML(tokenizedHTML, phpCodeBlocks);

    expect(formattedContent).toContain("'a $'");
    expect(formattedContent).toContain("'b $&'");
    expect(formattedContent).toContain("'$0 $1 $2 $3'");
  });
});
