# Phase 3C.1 local provider detail preview

The public search repository remains the static legacy dataset. Provider detail pages also use that static dataset by default. An explicit development-only flag enables a read-only overlay for the two locally applied Phase 3B pilots, `ems-boveresses` and `senevita-vaud`.

From PowerShell, with this workspace's local Supabase Docker container running:

```powershell
$env:LIA_PROVIDER_DETAIL_SOURCE = 'local'
npm.cmd run dev -- --hostname 127.0.0.1
```

Open `http://localhost:3000/prestataires/ems-boveresses` and `http://localhost:3000/prestataires/senevita-vaud`. The actual port is printed by Next.js. Start a fresh terminal without the flag for the unchanged static fallback. `nova-via` always uses the static fallback.

The server runs a fixed, read-only query through the existing workspace-pinned local Docker helper. No database URL or credentials are accepted. The repository checks the unpublished/unverified state, legacy identity/tags, empty service areas, and exact reviewed source field sets. It returns only approved structured identity, locality/NPA and contact fields to the detail view. Source rows and deferred claims stay server-side. If the local container is unavailable or the state conflicts, the page uses the static fallback. This preview does not change `is_published`, `verification_status`, RLS or production data.
