import test from "node:test";
import assert from "node:assert/strict";
import {
  CARE_FEATURE_KINDS,
  CARE_FEATURE_TAXONOMY,
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
  ]), [
    { kind: "care_profile", code: "dementia_support", displayName: "Accompagnement des troubles cognitifs", details: null },
    { kind: "facility", code: "emergency_call_system", displayName: "Système d’appel d’urgence", details: null },
    { kind: "service", code: "social_activities", displayName: "Activités sociales et socioculturelles", details: null },
    { kind: "facility", code: "garden_or_park", displayName: "Jardin ou parc", details: null },
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
