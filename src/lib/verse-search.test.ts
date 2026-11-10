import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseVerseQuery } from "./verse-search.ts";

describe("parseVerseQuery", () => {
  it("accepts a book, chapter and verse with a colon", () => {
    assert.equal(parseVerseQuery("Mateo 7:16"), "Mt.7.16");
    assert.equal(parseVerseQuery("Mt 7:16"), "Mt.7.16");
    assert.equal(parseVerseQuery("san Lucas 1:26"), "Lc.1.26");
  });

  it("accepts liturgical commas", () => {
    assert.equal(parseVerseQuery("Mateo 7, 16"), "Mt.7.16");
    assert.equal(parseVerseQuery("Jn 1, 1"), "Jn.1.1");
  });

  it("accepts verse ranges and cross-chapter ranges", () => {
    assert.equal(parseVerseQuery("Mateo 7:16-20"), "Mt.7.16-20");
    assert.equal(parseVerseQuery("Mateo 7,16-20"), "Mt.7.16-20");
    assert.equal(parseVerseQuery("Mt 7:16–20"), "Mt.7.16-20");
    assert.equal(parseVerseQuery("Lucas 23:44-24:3"), "Lc.23.44-24.3");
    assert.equal(parseVerseQuery("Mt 21:33-43.45-46"), "Mt.21.33-46");
  });

  it("rejects a book without a verse", () => {
    assert.equal(parseVerseQuery("Mateo"), null);
    assert.equal(parseVerseQuery("Mateo 7"), null);
    assert.equal(parseVerseQuery(""), null);
  });
});
