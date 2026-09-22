import { runLocalSql, jsonSql } from "../lib/local-provider-writer.mjs";
import { LOCAL_DETAIL_PILOTS } from "../lib/provider-local-projection.js";

const [slug] = process.argv.slice(2);
if (process.env.NODE_ENV !== "development" || process.argv.length !== 3
  || !LOCAL_DETAIL_PILOTS.includes(slug)) throw new Error("Local development pilot only");

const identity = jsonSql(slug);
const sql = `BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SELECT jsonb_build_object(
  'provider', (SELECT to_jsonb(p) FROM public.providers p WHERE p.legacy_id = (${identity} #>> '{}') AND p.slug = (${identity} #>> '{}')),
  'sources', (SELECT coalesce(jsonb_agg(jsonb_build_object('source_type',s.source_type,
    'source_url',s.source_url,'external_record_id',s.external_record_id,
    'fields_supported',s.fields_supported) ORDER BY s.id),'[]')
    FROM public.provider_sources s JOIN public.providers p ON p.id = s.provider_id
    WHERE p.legacy_id = (${identity} #>> '{}')),
  'serviceAreaCount', (SELECT count(*) FROM public.provider_service_areas a
    JOIN public.providers p ON p.id = a.provider_id WHERE p.legacy_id = (${identity} #>> '{}'))
);
ROLLBACK;`;
console.log(runLocalSql(sql).trim());
