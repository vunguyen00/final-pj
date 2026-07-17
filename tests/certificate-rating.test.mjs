import assert from "node:assert/strict";
import test from "node:test";
import { getCertificateRating } from "../lib/certificate-rating.ts";

test("maps supported languages to their certificate reference systems", () => {
  assert.equal(getCertificateRating({ score: 85, maxScore: 100, languageCode: "en" }).label, "IELTS 7.0");
  assert.equal(getCertificateRating({ score: 80, maxScore: 100, languageCode: "zh" }).label, "HSK 5");
  assert.equal(getCertificateRating({ score: 80, maxScore: 100, languageCode: "ja" }).label, "JLPT N2");
  assert.equal(getCertificateRating({ score: 70, maxScore: 100, languageCode: "ko" }).label, "TOPIK II - Cấp 4");
});

test("uses a stored IELTS band instead of estimating it again", () => {
  const rating = getCertificateRating({
    score: 73,
    maxScore: 100,
    bandSystem: "IELTS",
    bandScore: 6.5,
  });

  assert.equal(rating.label, "IELTS 6.5");
  assert.match(rating.note, /không thay thế kết quả thi chứng chỉ chính thức/);
});

test("falls back safely when a result has no supported language", () => {
  assert.equal(getCertificateRating({ score: 60, maxScore: 100 }).label, "Trình độ Trung cấp");
  assert.equal(getCertificateRating({ score: 10, maxScore: 0, languageCode: "ja" }).label, "Dưới JLPT N5");
});
