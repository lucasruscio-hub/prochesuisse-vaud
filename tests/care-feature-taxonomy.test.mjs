import test from "node:test";
import assert from "node:assert/strict";
import {
  CARE_FEATURE_KINDS,
  CARE_FEATURE_TAXONOMY,
  HOME_CARE_SERVICE_DEFINITIONS,
  controlledCareFeature,
  projectControlledCareFeatures,
} from "../lib/care-feature-taxonomy.js";

test("V1 taxonomy exposes only the three database feature families", () => {
  assert.deepEqual(CARE_FEATURE_KINDS, ["care_profile", "service", "facility"]);
  assert.deepEqual(Object.keys(CARE_FEATURE_TAXONOMY), CARE_FEATURE_KINDS);
  assert.equal(CARE_FEATURE_TAXONOMY.service.palliative_care, "Soins palliatifs");
  assert.equal(CARE_FEATURE_TAXONOMY.service.social_activities, "Activités sociales et socioculturelles");
  assert.equal(CARE_FEATURE_TAXONOMY.facility.emergency_call_system, "Système d’appel d’urgence");
  assert.equal(CARE_FEATURE_TAXONOMY.facility.garden_or_park, "Jardin ou parc");
  assert.equal(CARE_FEATURE_TAXONOMY.facility.restaurant, "Restaurant sur place");
  assert.deepEqual(Object.keys(HOME_CARE_SERVICE_DEFINITIONS), [
    "on_call_24h", "companionship", "meal_delivery", "respite_at_home", "emergency_call_service",
  ]);
  assert.deepEqual(Object.fromEntries(Object.entries(HOME_CARE_SERVICE_DEFINITIONS)
    .map(([code, definition]) => [code, definition.label])), {
    on_call_24h: "Permanence 24h/24",
    companionship: "Présence et compagnie",
    meal_delivery: "Livraison de repas",
    respite_at_home: "Relève à domicile",
    emergency_call_service: "Service de téléalarme",
  });
});

test("home-care additions have explicit meanings and non-inference guardrails", () => {
  for (const [code, definition] of Object.entries(HOME_CARE_SERVICE_DEFINITIONS)) {
    assert.equal(CARE_FEATURE_TAXONOMY.service[code], definition.label);
    assert.ok(definition.meaning.length > 30);
    assert.match(definition.evidenceRule, /Exiger|ne jamais|ne pas/i);
    assert.deepEqual(controlledCareFeature("service", code), {
      kind: "service", code, displayName: definition.label, details: null,
    });
  }
  assert.match(HOME_CARE_SERVICE_DEFINITIONS.on_call_24h.meaning, /sans présumer une présence continue/i);
  assert.match(HOME_CARE_SERVICE_DEFINITIONS.emergency_call_service.evidenceRule, /ne pas confondre.*24h\/24/i);
  assert.match(HOME_CARE_SERVICE_DEFINITIONS.companionship.evidenceRule, /ne jamais l’inférer/i);
  assert.match(HOME_CARE_SERVICE_DEFINITIONS.respite_at_home.evidenceRule, /domicile/i);
  assert.match(HOME_CARE_SERVICE_DEFINITIONS.meal_delivery.evidenceRule, /livraison|apport/i);
});

test("controlled projection accepts known codes and returns canonical labels", () => {
  assert.deepEqual(controlledCareFeature("service", "home_nursing", "  Tous les jours  "), {
    kind: "service",
    code: "home_nursing",
    displayName: "Soins infirmiers à domicile",
    details: "Tous les jours",
  });
  assert.deepEqual(projectControlledCareFeatures([
    { kind: "care_profile", code: "dementia_support" },
    { kind: "facility", code: "emergency_call_system" },
    { kind: "service", code: "social_activities" },
    { kind: "facility", code: "garden_or_park" },
    { kind: "facility", code: "restaurant" },
  ]), [
    { kind: "care_profile", code: "dementia_support", displayName: "Accompagnement des troubles cognitifs", details: null },
    { kind: "facility", code: "emergency_call_system", displayName: "Système d’appel d’urgence", details: null },
    { kind: "service", code: "social_activities", displayName: "Activités sociales et socioculturelles", details: null },
    { kind: "facility", code: "garden_or_park", displayName: "Jardin ou parc", details: null },
    { kind: "facility", code: "restaurant", displayName: "Restaurant sur place", details: null },
  ]);
});

test("unknown codes, aliases, stay modes, and duplicates are rejected", () => {
  for (const code of ["unsupported", "hairdresser", "24_hour_assistance", "long_stay", "short_stay", "respite_stay"]) {
    assert.throws(() => controlledCareFeature("service", code), /Unsupported controlled care feature/);
  }
  assert.throws(() => controlledCareFeature("unknown", "palliative_care"), /Unsupported controlled care feature/);
  assert.throws(() => projectControlledCareFeatures([
    { kind: "service", code: "palliative_care" },
    { kind: "service", code: "palliative_care" },
  ]), /Duplicate controlled care feature/);
});

test("null or absent feature collections remain unknown", () => {
  assert.equal(projectControlledCareFeatures(null), null);
  assert.equal(projectControlledCareFeatures(undefined), null);
  assert.deepEqual(projectControlledCareFeatures([]), []);
  assert.throws(() => projectControlledCareFeatures(false), /array or null/);
});
