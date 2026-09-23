import { runLocalSql, jsonSql } from "../lib/local-provider-writer.mjs";
import { LOCAL_DETAIL_PILOTS } from "../lib/provider-local-projection.js";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export function buildLocalProviderDetailSql(slug) {
  if (!LOCAL_DETAIL_PILOTS.includes(slug)) throw new Error("Local development pilot only");
  const identity = jsonSql(slug);
  return `BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SELECT jsonb_build_object(
  'provider', (SELECT to_jsonb(p) FROM public.providers p WHERE p.legacy_id = (${identity} #>> '{}') AND p.slug = (${identity} #>> '{}')),
  'sources', (SELECT coalesce(jsonb_agg(jsonb_build_object('source_type',s.source_type,
    'source_url',s.source_url,'external_record_id',s.external_record_id,
    'fields_supported',s.fields_supported) ORDER BY s.id),'[]')
    FROM public.provider_sources s JOIN public.providers p ON p.id = s.provider_id
    WHERE p.legacy_id = (${identity} #>> '{}')),
  'serviceAreaCount', (SELECT count(*) FROM public.provider_service_areas a
    JOIN public.providers p ON p.id = a.provider_id WHERE p.legacy_id = (${identity} #>> '{}')),
  'organizationLinks', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'organization',to_jsonb(o),'relationship',to_jsonb(po),
      'source',jsonb_build_object('source_type',s.source_type,'source_name',s.source_name,
        'source_url',s.source_url,'external_record_id',s.external_record_id)) ORDER BY o.id),'[]')
    FROM public.provider_organizations po
    JOIN public.providers p ON p.id=po.provider_id
    JOIN public.organizations o ON o.id=po.organization_id
    JOIN public.provider_sources s ON s.id=po.source_id AND s.provider_id=po.provider_id
    WHERE p.legacy_id = (${identity} #>> '{}')),
  'offerings', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'offering',to_jsonb(o),
      'features',(SELECT coalesce(jsonb_agg(jsonb_build_object('feature',to_jsonb(f),
        'source',jsonb_build_object('source_type',s.source_type,'source_name',s.source_name,
          'source_url',s.source_url,'external_record_id',s.external_record_id))
        ORDER BY f.feature_kind,f.feature_code),'[]')
        FROM public.care_offering_features f JOIN public.provider_sources s
          ON s.id=f.source_id AND s.provider_id=f.provider_id WHERE f.offering_id=o.id),
      'sources',(SELECT coalesce(jsonb_agg(jsonb_build_object('link',to_jsonb(os),
        'source',jsonb_build_object('source_type',s.source_type,'source_name',s.source_name,
          'source_url',s.source_url,'external_record_id',s.external_record_id))
        ORDER BY s.source_type,s.source_url),'[]')
        FROM public.care_offering_sources os JOIN public.provider_sources s
          ON s.id=os.source_id AND s.provider_id=os.provider_id WHERE os.offering_id=o.id),
      'availabilityCount',(SELECT count(*) FROM public.care_offering_availability a WHERE a.offering_id=o.id)
    ) ORDER BY o.id),'[]') FROM public.care_offerings o JOIN public.providers p ON p.id=o.provider_id
      WHERE p.legacy_id = (${identity} #>> '{}'))
);
ROLLBACK;`;
}

export function main(args) {
  const [slug] = args;
  if (process.env.NODE_ENV !== "development" || args.length !== 1
    || !LOCAL_DETAIL_PILOTS.includes(slug)) throw new Error("Local development pilot only");
  console.log(runLocalSql(buildLocalProviderDetailSql(slug)).trim());
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
