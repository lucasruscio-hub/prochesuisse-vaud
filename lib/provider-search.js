// Pure client-safe filtering over the repository DTO. Phase 1 preserves legacy semantics.
export function searchProviders(providers, query = "", type = "ems", region = "Tous") {
  const q = query.toLowerCase().trim();
  return providers.filter((provider) => {
    const matchesType = provider.type === type;
    const matchesRegion = region === "Tous"
      || provider.commune.toLowerCase().includes(region.toLowerCase())
      || provider.tags.some((tag) => tag.toLowerCase().includes(region.toLowerCase()));
    const matchesQuery = !q
      || provider.name.toLowerCase().includes(q)
      || provider.commune.toLowerCase().includes(q)
      || provider.npa.includes(q)
      || provider.tags.some((tag) => tag.toLowerCase().includes(q));
    return matchesType && matchesRegion && matchesQuery;
  }).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
