import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  displayQuoteReference,
  firstVerseSlug,
  parseUsfmSlug,
  quotePngPath,
  quoteSharePath,
  toUsfmSlug,
} from "./quote-ref.ts";

describe("parseUsfmSlug", () => {
  it("parses single, same-chapter, and cross-chapter slugs", () => {
    assert.equal(parseUsfmSlug("JHN.3.16")?.slug, "JHN.3.16");
    assert.equal(parseUsfmSlug("MAT.5.3-12")?.slug, "MAT.5.3-12");
    assert.equal(parseUsfmSlug("LUK.23.44-24.3")?.slug, "LUK.23.44-24.3");
  });

  it("maps liturgical prefixes case-insensitively", () => {
    assert.equal(parseUsfmSlug("Lc.6.39-42")?.slug, "LUK.6.39-42");
    assert.equal(parseUsfmSlug("mt.5.3")?.slug, "MAT.5.3");
    assert.equal(parseUsfmSlug("Mc.1.1")?.slug, "MRK.1.1");
    assert.equal(parseUsfmSlug("jn.3.16")?.slug, "JHN.3.16");
    assert.equal(parseUsfmSlug("Hch.2.1")?.slug, "ACT.2.1");
    assert.equal(parseUsfmSlug("hc.2.1")?.slug, "ACT.2.1");
  });

  it("rejects hyphenated legacy slugs", () => {
    assert.equal(parseUsfmSlug("luk-6-39"), null);
    assert.equal(parseUsfmSlug("lc-6-39"), null);
  });
});

describe("toUsfmSlug", () => {
  it("ingests liturgical prose", () => {
    assert.equal(toUsfmSlug("Lc 6, 39–42"), "LUK.6.39-42");
    assert.equal(toUsfmSlug("Mt 23, 27-32"), "MAT.23.27-32");
    assert.equal(toUsfmSlug("Jn 1, 1"), "JHN.1.1");
  });
});

describe("displayQuoteReference", () => {
  it("always shows Mt|Mc|Lc|Jn|Hch", () => {
    assert.equal(displayQuoteReference("MAT.5.3-12"), "Mt 5, 3–12");
    assert.equal(displayQuoteReference("JHN.3.16-18"), "Jn 3, 16–18");
    assert.equal(displayQuoteReference("LUK.23.44-24.3"), "Lc 23, 44–24, 3");
    assert.equal(displayQuoteReference("ACT.2.1"), "Hch 2, 1");
    assert.equal(displayQuoteReference("Lc.6.39-42"), "Lc 6, 39–42");
  });
});

describe("paths", () => {
  it("points fragments at /biblia and thumbs at /citas/*.png", () => {
    assert.equal(quoteSharePath("Lc 6, 39–42"), "/biblia/LUK.6.39-42");
    assert.equal(quotePngPath("MAT.5.3-12"), "/citas/MAT.5.3.png");
    const parsed = parseUsfmSlug("LUK.23.44-24.3");
    assert.equal(parsed && firstVerseSlug(parsed), "LUK.23.44");
  });
});
