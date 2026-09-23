import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/prestataires/[slug]/page.js", import.meta.url), "utf8");
const reviewCard = readFileSync(new URL("../app/components/GoogleReviewCard.js", import.meta.url), "utf8");

test("photo hero is responsive and keeps Google author and source attribution", () => {
  assert.match(page, /heroPhotos\.length > 0/);
  assert.match(page, /sm:grid-cols-3 sm:grid-rows-3/);
  assert.match(page, /photo\.authors\.map/);
  assert.match(page, /href=\{photo\.sourceUrl\}/);
  assert.match(page, /Photos fournies par/);
});

test("the no-photo branch retains the decorative sparse hero", () => {
  assert.match(page, /heroPhotos\.length > 0[\s\S]+:\s*<header/);
  assert.match(page, /border-\[70px\] border-\[#FF9EAA\]/);
});

test("Google review cards preserve full text and expose an accessible expansion control", () => {
  assert.match(reviewCard, /review\.quote/);
  assert.match(reviewCard, /line-clamp-5/);
  assert.match(reviewCard, /aria-expanded=\{expanded\}/);
  assert.match(reviewCard, /Lire la suite/);
  assert.match(reviewCard, /href=\{review\.sourceUrl\}/);
  assert.match(reviewCard, /review\.author\.name/);
  assert.match(reviewCard, /review\.rating/);
  assert.match(reviewCard, /review\.relativeDate/);
});

test("reviewer avatars stay hidden until loaded and disappear after an image error", () => {
  assert.match(reviewCard, /if \(!src \|\| status === "failed"\) return null/);
  assert.match(reviewCard, /onLoad=\{\(\) => setStatus\("loaded"\)\}/);
  assert.match(reviewCard, /onError=\{\(\) => setStatus\("failed"\)\}/);
  assert.match(reviewCard, /status === "loaded" \? "visible" : "invisible"/);
  assert.doesNotMatch(reviewCard, /defaultAvatar|placeholder|fallbackAvatar/);
});
