//@ts-check

import { describe, expect, test, vi } from "vitest";
import prettier from "prettier";

vi.mock("prettier", () => ({
  default: {
    format: vi.fn().mockResolvedValue("<formatted/>"),
  },
}));

import { readFile } from "node:fs/promises";

import {
  formatWpCommentJson,
  formatAllWpComments,
  normalizeCommentTagSpacing,
  trimInsideListElements,
  normalizeNewlines,
  trimInsideHeadings,
  formatWithPrettier,
  formatWPBlockPattern,
  main,
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
      await readFile(
        "./test/fixtures/format-wp-block-pattern/nested-list__formatted.php",
      )
    ).toString();

    const actual = trimInsideListElements(input);
    expect(actual).toMatch(/<li>UL/);

    expect(actual).toBe(expected);
  });

  test("Whitespace handling in paragraphs", async () => {
    const input = (
      await readFile(
        "./test/fixtures/format-wp-block-pattern/paragraph-whitespace.php",
      )
    ).toString();

    const expected = (
      await readFile(
        "./test/fixtures/format-wp-block-pattern/paragraph-whitespace__formatted.php",
      )
    ).toString();

    const actual = normalizeCommentTagSpacing(input);
    expect(actual).toBe(expected);
  });

  test("Whitespace handling in paragraphs with attributes", async () => {
    const input = (
      await readFile(
        "./test/fixtures/format-wp-block-pattern/paragraph-whitespace-with-attributes.php",
      )
    ).toString();

    const expected = (
      await readFile(
        "./test/fixtures/format-wp-block-pattern/paragraph-whitespace-with-attributes__formatted.php",
      )
    ).toString();

    const actual = normalizeCommentTagSpacing(input);
    expect(actual).toBe(expected);
  });

  test("normalizeNewlines for coverage", async () => {
    const input = "Line 1\nLine 2\n \n \n\n\n\nLine 3\nLine 4";
    const expected = "Line 1\nLine 2\n\nLine 3\nLine 4\n";

    const actual = normalizeNewlines(input);
    expect(actual).toBe(expected);
  });

  test("trimInsideHeadings for coverage", async () => {
    const input = "<h2>   Heading with extra spaces   </h2>";
    const expected = "<h2>Heading with extra spaces</h2>";

    const actual = trimInsideHeadings(input);
    expect(actual).toBe(expected);
  });

  test("formatWithPrettier for coverage", async () => {
    const input = "<div>foo</div>";
    await formatWithPrettier(input);
    expect(prettier.format).toHaveBeenCalled();
  });

  test("main requires filepath", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await main();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

