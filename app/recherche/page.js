import { connection } from "next/server";
import { listProviders } from "../../lib/provider-repository";
import { providerHasSpecialFilter, SPECIAL_FILTERS } from "../../lib/provider-config";
import RechercheClient from "./RechercheClient";

export default async function RecherchePage({ searchParams }) {
  await connection();
  const providers = await listProviders();
  const requested = (await searchParams) ?? {};
  const communes = new Set(providers.map(({ commune }) => commune).filter(Boolean));
  const availableFilters = new Set(SPECIAL_FILTERS.filter((filter) =>
    providers.some((provider) => providerHasSpecialFilter(provider, filter))));
  const initialFilters = {
    type: ["ems", "domicile", "residence"].includes(requested.type) ? requested.type : "ems",
    query: typeof requested.query === "string" ? requested.query : "",
    commune: typeof requested.commune === "string" && communes.has(requested.commune)
      ? requested.commune : "Tous",
    special: typeof requested.filter === "string" && availableFilters.has(requested.filter)
      ? requested.filter : "",
  };
  return <RechercheClient providers={providers} initialFilters={initialFilters} />;
}
