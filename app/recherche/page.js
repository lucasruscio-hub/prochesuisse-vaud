import { listProviders } from "../../lib/provider-repository";
import RechercheClient from "./RechercheClient";

export default async function RecherchePage() {
  const providers = await listProviders();
  return <RechercheClient providers={providers} />;
}
