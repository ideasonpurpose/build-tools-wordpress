//@ts-check

import { describe, expect, test } from "vitest";

import { readFile } from "node:fs/promises";

import { tokenizeHTML, unTokenizeHTML } from "../bin/format-php-prettier.js";

import prettier from "prettier";
import prettierConfig from "@ideasonpurpose/prettier-config" with { type: "json" };

/**
 * Prettier API doesn't recognize overrides, so we extract them
 */
const htmlOptions = prettierConfig.overrides.find(
  (o) => o.files === "*.html",
)?.options;

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

    const { tokenizedHTML, phpCodeBlocks } = tokenizeHTML(input);

    // console.log({input, tokenizedHTML})

    const tokens = Object.keys(phpCodeBlocks);

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

  /**
   * Not sure what's going on here, but this breaks and returns with the last replacement token still in place.
   * Something to do with the overall length, if the aaa...aaa attribute is shortened it formats correctly.
   *
   * Something about this file, likely the length, is causing it to fail to find
   * and restore the last PHP token. Trying to format this:
   *
   *
   *   <i aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa="<?= a('a') ?>"><?= b('b') ?> : <?= c('c') ?></i>
   *
   * ...ends up returning something like this:
   *
   *   <i aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa="<?= a('a') ?>"
   *     ><?= b('b') ?> : _php_3_______
   *   /></i>
   *
   * It seems to have something to do with HTML whitespace preservation, I can't get this to
   * happen with a div
   */
  test("whitespace orphaned tokens", async () => {
    const input = (
      await readFile(
        "./test/fixtures/format-php-prettier/length-orphaned-token-bug.php",
      )
    ).toString();

    const { tokenizedHTML, phpCodeBlocks } = tokenizeHTML(input);

    const formattedContent = unTokenizeHTML(tokenizedHTML, phpCodeBlocks);

    // console.log(input, tokenizedHTML, phpCodeBlocks, formattedContent);

    expect(formattedContent).toContain("<?= c('c') ?>");
  });

  test("tokenization error (drill down from whitespace orphaned tokens)", async () => {
    const input = "<?= b('b') ?> : <?= c('c') ?>";
    const { tokenizedHTML, phpCodeBlocks } = tokenizeHTML(input);

    // console.log({input, tokenizedHTML, phpCodeBlocks});

    expect(tokenizedHTML).toContain("<php_0____ />");
    expect(tokenizedHTML).toContain("<php_1____ />");
    expect(phpCodeBlocks).toHaveProperty("<php_0____ />");
    expect(phpCodeBlocks).toHaveProperty("<php_1____ />");
  });

  /**
 *
 * Tag-style tokens towards the end of long lines may be line-wrapped by Prettier's HTML
 * formatting, where the token `<php_4___ />` ends up as `<php_4___ \n    />`
 *
 * That line-break means a simple string match won't work and the PHP token must be converted
 * to a regexp that matches more than one whitespace character.
 *
 * This example is tricky because the <time> is an inline tag so whitespace is significant. The inner
 * PHP codeblock has a space before it, but not after: <time> <?php ... ?></time>
 * More here: @link https://prettier.io/blog/2018/11/07/1.15.0.html#whitespace-sensitive-formatting
 *
 * Input:
 *     <time class="type-eyebrow" datetime="<?= get_the_date('c') ?>"> <?= date('F j, Y', get_post_time()) ?></time>
 *
 * Expected:
 *        <time class="type-eyebrow" datetime="<?= get_the_date('c') ?>">
 *          <?= date('F j, Y', get_post_time()) ?></time>
 *
 * This is an edge case on line-length.
 *   TODO: I think the token replacement pattern needs to replace the literal space between ___ and /> with a regex token
 *         so any acquired whitespace from prettier's HTML formatter.
 *
 */
  test("extra space bug", async () => {
    const input = `<time class="type" datetime="<?= get_the_date('c') ?>"> <?= date('F j, Y', get_post_time()) ?></time>`;
    // const input = `<time class="typ" datetime="<?= get_the_date('c') ?>"> <?= date('F j, Y', get_post_time()) ?></time>`;
    const { tokenizedHTML, phpCodeBlocks } = tokenizeHTML(input);

    const htmlFormatted = await prettier.format(tokenizedHTML, {
      ...prettierConfig,
      ...htmlOptions,
      parser: "html",
      embeddedLanguageFormatting: "auto",
    });

    const formattedContent = unTokenizeHTML(htmlFormatted, phpCodeBlocks);
    console.log({
      phpCodeBlocks,
      tokenizedHTML,
      htmlFormatted,
      formattedContent,
    });

    expect(tokenizedHTML).toContain("_php_0___");
    expect(tokenizedHTML).toContain("<php_1___");
    expect(htmlFormatted).toContain("_____\n/>");
    expect(formattedContent).not.toContain("<php_1___");
  });
});
