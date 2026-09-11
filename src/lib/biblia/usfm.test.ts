import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookToUsfm, citaBookToUsfm } from "./usfm.ts";
import { versesFromBook } from "./verses.ts";

describe("bookToUsfm", () => {
  it("maps Spanish names and liturgical abbreviations", () => {
    assert.equal(bookToUsfm("Mt"), "MAT");
    assert.equal(bookToUsfm("san Mateo"), "MAT");
    assert.equal(bookToUsfm("Mc"), "MRK");
    assert.equal(bookToUsfm("Lucas"), "LUK");
    assert.equal(bookToUsfm("Jn"), "JHN");
    assert.equal(bookToUsfm("Hechos"), "ACT");
    assert.equal(bookToUsfm("Hch"), "ACT");
    assert.equal(bookToUsfm("Génesis"), "GEN");
    assert.equal(bookToUsfm("Salmos"), "PSA");
  });

  it("maps CitaBook codes", () => {
    assert.equal(citaBookToUsfm("mt"), "MAT");
    assert.equal(citaBookToUsfm("jn"), "JHN");
    assert.equal(citaBookToUsfm("hch"), "ACT");
    assert.equal(bookToUsfm("mt"), "MAT");
  });
});

describe("versesFromBook", () => {
  it("indexes chapter/verse directly in the JSON arrays", () => {
    const book = [
      ["a1", "a2", "a3"],
      ["b1", "b2", "b3", "b4"],
    ];
    assert.deepEqual(versesFromBook(book, [{ chapter: 2, start: 2, end: 4 }]), [
      { chapter: 2, number: 2, text: "b2" },
      { chapter: 2, number: 3, text: "b3" },
      { chapter: 2, number: 4, text: "b4" },
    ]);
  });

  it("skips empty slots and missing chapters", () => {
    const book = [["one", "", "three"]];
    assert.deepEqual(versesFromBook(book, [{ chapter: 1, start: 1, end: 3 }]), [
      { chapter: 1, number: 1, text: "one" },
      { chapter: 1, number: 3, text: "three" },
    ]);
    assert.deepEqual(versesFromBook(book, [{ chapter: 9, start: 1, end: 2 }]), []);
  });
});
