import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseUsfmCitation } from "./gospel/citation.ts";
import { parseQuoteSlug, quoteSlug, quoteSharePath, toUsfmReference } from "./quote-ref.ts";

describe("toUsfmReference", () => {
  it("converts liturgical refs to USFM", () => {
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

describe("parseUsfmCitation", () => {
  it("accepts only canonical USFM book ids", () => {
    assert.equal(parseUsfmCitation("LUK 6, 39–42")?.usfm, "LUK");
    assert.equal(parseUsfmCitation("Lc 6, 39–42"), null);
    assert.equal(parseUsfmCitation("mt 1, 1"), null);
  });
});

describe("quoteSlug", () => {
  it("slugs USFM refs", () => {
    assert.equal(quoteSlug("LUK 6, 39–42"), "luk-6-39-42");
  });
});

describe("parseQuoteSlug", () => {
  it("accepts USFM slugs only", () => {
    assert.deepEqual(parseQuoteSlug("luk-6-39"), { book: "LUK", chapter: 6, verse: 39 });
    assert.deepEqual(parseQuoteSlug("jhn-1-1"), { book: "JHN", chapter: 1, verse: 1 });
    assert.equal(parseQuoteSlug("lc-6-39"), null);
  });
});

describe("quoteSharePath", () => {
  it("uses USFM in the path", () => {
    assert.equal(quoteSharePath("LUK 6, 39–42"), "/citas/LUK/6.39");
    assert.equal(quoteSharePath("Lc 6, 39–42"), "/citas/lc-6-39-42");
  });
});
