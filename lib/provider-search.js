import { providerHasSpecialFilter, SPECIAL_FILTERS } from "./provider-config.js";

// Pure client-safe filtering over the canonical public projection.
export function searchProviders(providers, query = "", type = "ems", region = "Tous") {
  const q = query.toLowerCase().trim();
  return providers.filter((provider) => {
    const matchesType = provider.type === type;
    const matchesRegion = region === "Tous"
      || (provider.commune ?? "").toLowerCase().includes(region.toLowerCase());
    const matchesQuery = !q
      || provider.name.toLowerCase().includes(q)
      || (provider.commune ?? "").toLowerCase().includes(q)
      || (provider.npa ?? "").includes(q)
      || provider.badges.some((badge) => badge.toLowerCase().includes(q))
      || SPECIAL_FILTERS.some((filter) => filter.toLowerCase() === q
        && providerHasSpecialFilter(provider, filter));
    return matchesType && matchesRegion && matchesQuery;
  }).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
