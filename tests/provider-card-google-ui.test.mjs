import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const cards = readFileSync(new URL("../app/recherche/RechercheClient.js", import.meta.url), "utf8");

test("marketplace cards render attributed Google media and request-time ratings", () => {
  assert.match(cards, /provider\.cardMedia/);
  assert.match(cards, /media\.authors\.map/);
  assert.match(cards, /href=\{media\.sourceUrl\}/);
  assert.match(cards, /Google Maps/);
  assert.match(cards, /provider\.externalRating/);
  assert.match(cards, /provider\.externalRating\.reviewCount/);
});

test("marketplace cards retain a premium non-image Lia fallback", () => {
  assert.match(cards, /Sélection Lia · Vaud/);
  assert.match(cards, /bg-gradient-to-br/);
  assert.match(cards, /provider\.type === "ems"/);
});
