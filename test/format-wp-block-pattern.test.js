//@ts-check

import { describe, expect, test } from "vitest";

import { readFile } from "node:fs/promises";

import {
  formatWpCommentJson,
  formatAllWpComments,
  normalizeCommentTagSpacing,
  trimInsideListElements,
} from "../bin/format-wp-block-pattern.js";

describe("Format JSON in WP Block comments", () => {
  test("Pass through wp:* comments with no JSON", async () => {
    const input = "<!-- wp:post-date /-->";
    const expected = "<!-- wp:post-date /-->";

    const actual = formatWpCommentJson(input);
    expect(actual).toBe(expected);
  });

  test("Return short JSON for simple wp:* comments", async () => {
    const input = '<!-- wp:group {  "align": "full"} -->';
    const expected = '<!-- wp:group {"align":"full"} -->';

    const actual = formatWpCommentJson(input);
    expect(actual).toBe(expected);
  });

  test("Return cleaned short JSON for simple wp:* comments", async () => {
    const input = '<!-- wp:group {\n  "align": "full"\n} -->';
    const expected = '<!-- wp:group {"align":"full"} -->';

    const actual = formatWpCommentJson(input);
    expect(actual).toBe(expected);
  });

  test("Return short JSON for two-key wp:* comments", async () => {
    const input =
      '<!-- wp:group {  "align": "full", "className": "group-name"} -->';
    const expected =
      '<!-- wp:group {"align":"full","className":"group-name"} -->';

    const actual = formatWpCommentJson(input);
    expect(actual).toBe(expected);
  });

  test("Prettyprint three-key wp:* comments", async () => {
    const input =
      '<!-- wp:group {  "align": "full","isLink":true, "className": "group-name"} -->';
    const expected =
      '<!-- wp:group {\n  "align": "full",\n  "isLink": true,\n  "className": "group-name"\n} -->';

    const actual = formatWpCommentJson(input);
    expect(actual).toBe(expected);
  });

  test("Prettyprint long JSON in wp:* comments", async () => {
    const input =
      '<!-- wp:group {"className":"group-name","layout":{"type":"constrained"}} -->';
    const expected =
      '<!-- wp:group {\n  "className": "group-name",\n  "layout": {\n    "type": "constrained"\n  }\n} -->';

    const actual = formatWpCommentJson(input);
    expect(actual).toBe(expected);
  });

  test("Throw error on malformed JSON", async () => {
    const input = '<!-- wp:group {"just-a-key"} -->';

    expect(() => formatWpCommentJson(input)).toThrow();
  });
});

describe("Format WP Block Patterns", () => {
  test("Format JSON in all comments", async () => {
    const input = (
      await readFile(
        "./test/fixtures/format-wp-block-pattern/basic-pattern.php",
      )
    ).toString();

    const actual = formatAllWpComments(input);
    expect(actual).toMatch(/"layout":\s+\{\n\s+"type": "constrained"\n\s+\}/);
    expect(actual).toMatch(/"align":"full"/);
    expect(actual).toMatch(/\s+"align": "full",/);
    // console.log(actual);
  });
});

describe("Normalize whitespace", () => {
  test("Fix Comment tag spacing", async () => {
    const input = (
      await readFile(
        "./test/fixtures/format-wp-block-pattern/basic-pattern.php",
      )
    ).toString();

    const actual = normalizeCommentTagSpacing(input);
    expect(actual).toMatch(/<\/div>\n<!-- \/wp:group -->/);
  });

  test("List handling", async () => {
    const input = (
      await readFile("./test/fixtures/format-wp-block-pattern/nested-list.php")
    ).toString();

        const expected = (
      await readFile("./test/fixtures/format-wp-block-pattern/nested-list__formatted.php")
    ).toString();

    const actual = trimInsideListElements(input);
        expect(actual).toMatch(/<li>UL/);

    expect(actual).toBe(expected);
  });
});

// {"align":"full","className":"group-name"}
