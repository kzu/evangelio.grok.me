import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseQuoteSlug, quoteSlug, toUsfmReference } from "./quote-ref.ts";

describe("toUsfmReference", () => {
  it("converts Spanish liturgical refs to USFM", () => {
    assert.equal(toUsfmReference("Lc 6, 39–42"), "LUK 6, 39–42");
    assert.equal(toUsfmReference("Mt 23, 27-32"), "MAT 23, 27–32");
    assert.equal(toUsfmReference("Jn 1, 1"), "JHN 1, 1");
    assert.equal(toUsfmReference("Hch 2, 1–4"), "ACT 2, 1–4");
  });

  it("is idempotent for USFM refs", () => {
    assert.equal(toUsfmReference("LUK 6, 39–42"), "LUK 6, 39–42");
    assert.equal(toUsfmReference("MAT 1, 1"), "MAT 1, 1");
  });
});

describe("quoteSlug", () => {
  it("slugs USFM refs", () => {
    assert.equal(quoteSlug(toUsfmReference("Lc 6, 39–42")), "luk-6-39-42");
  });
});

describe("parseQuoteSlug", () => {
  it("accepts both liturgical and USFM slugs", () => {
    assert.deepEqual(parseQuoteSlug("lc-6-39"), { book: "lc", chapter: 6, verse: 39 });
    assert.deepEqual(parseQuoteSlug("luk-6-39"), { book: "lc", chapter: 6, verse: 39 });
    assert.deepEqual(parseQuoteSlug("jhn-1-1"), { book: "jn", chapter: 1, verse: 1 });
  });
});
