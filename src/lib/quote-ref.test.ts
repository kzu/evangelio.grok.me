import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  displayQuoteReference,
  firstVerseSlug,
  mapCitaThumbPath,
  parseUsfmSlug,
  quotePngAssetPath,
  quotePngPath,
  quoteSharePath,
  toUsfmSlug,
} from "./quote-ref.ts";

describe("parseUsfmSlug", () => {
  it("canonicalizes to Spanish liturgical slugs", () => {
    assert.equal(parseUsfmSlug("JHN.3.16")?.slug, "Jn.3.16");
    assert.equal(parseUsfmSlug("MAT.5.3-12")?.slug, "Mt.5.3-12");
    assert.equal(parseUsfmSlug("LUK.23.44-24.3")?.slug, "Lc.23.44-24.3");
    assert.equal(parseUsfmSlug("Mt.5.3-12")?.usfm, "MAT");
    assert.equal(parseUsfmSlug("Lc.23.44-24.3")?.usfm, "LUK");
  });

  it("maps liturgical prefixes case-insensitively", () => {
    assert.equal(parseUsfmSlug("Lc.6.39-42")?.slug, "Lc.6.39-42");
    assert.equal(parseUsfmSlug("mt.5.3")?.slug, "Mt.5.3");
    assert.equal(parseUsfmSlug("Mc.1.1")?.slug, "Mc.1.1");
    assert.equal(parseUsfmSlug("jn.3.16")?.slug, "Jn.3.16");
    assert.equal(parseUsfmSlug("Hch.2.1")?.slug, "Hch.2.1");
    assert.equal(parseUsfmSlug("hc.2.1")?.slug, "Hch.2.1");
  });

  it("rejects hyphenated legacy slugs", () => {
    assert.equal(parseUsfmSlug("luk-6-39"), null);
    assert.equal(parseUsfmSlug("lc-6-39"), null);
  });
});

describe("toUsfmSlug", () => {
  it("ingests liturgical prose into public slugs", () => {
    assert.equal(toUsfmSlug("Lc 6, 39–42"), "Lc.6.39-42");
    assert.equal(toUsfmSlug("Mt 23, 27-32"), "Mt.23.27-32");
    assert.equal(toUsfmSlug("Jn 1, 1"), "Jn.1.1");
  });
});

describe("displayQuoteReference", () => {
  it("always shows Mt|Mc|Lc|Jn|Hch", () => {
    assert.equal(displayQuoteReference("MAT.5.3-12"), "Mt 5, 3–12");
    assert.equal(displayQuoteReference("Mt.5.3-12"), "Mt 5, 3–12");
    assert.equal(displayQuoteReference("JHN.3.16-18"), "Jn 3, 16–18");
    assert.equal(displayQuoteReference("LUK.23.44-24.3"), "Lc 23, 44–24, 3");
    assert.equal(displayQuoteReference("ACT.2.1"), "Hch 2, 1");
  });
});

describe("paths", () => {
  it("points fragments at /biblia/Mt.5.3-12 and thumbs at /citas/Mt.5.3.png", () => {
    assert.equal(quoteSharePath("Lc 6, 39–42"), "/biblia/Lc.6.39-42");
    assert.equal(quotePngPath("Mt.5.3-12"), "/citas/Mt.5.3.png");
    const parsed = parseUsfmSlug("LUK.23.44-24.3");
    assert.equal(parsed && firstVerseSlug(parsed), "Lc.23.44");
    assert.equal(parsed && quotePngAssetPath(parsed), "/citas/Lc/23.44.png");
  });

  it("maps unfurl thumbs onto liturgical folders", () => {
    assert.equal(mapCitaThumbPath("/citas/Mt.5.3.png"), "/citas/Mt/5.3.png");
    assert.equal(mapCitaThumbPath("/citas/jn.3.16.png"), "/citas/Jn/3.16.png");
    assert.equal(mapCitaThumbPath("/citas/Hch.2.1.png"), "/citas/Hch/2.1.png");
    assert.equal(mapCitaThumbPath("/citas/Hcn.2.1.png"), "/citas/Hch/2.1.png");
    assert.equal(mapCitaThumbPath("/citas/MAT.5.3.png"), "/citas/Mt/5.3.png");
    assert.equal(mapCitaThumbPath("/biblia/Mt.5.3.png"), "/citas/Mt/5.3.png");
    assert.equal(mapCitaThumbPath("/citas/Mt/5.3.png"), null);
  });
});
