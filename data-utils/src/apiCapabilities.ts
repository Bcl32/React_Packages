import type { ModelData } from "./types";

/**
 * The bulk-update endpoint for a model, or `null` when it has none.
 *
 * ## Why this is a function and not just a field
 *
 * A generated ModelData file carries one URL per capability, and every consumer
 * treats a URL's *presence* as the feature flag for the affordance that uses it
 * — `update_api_url` gates row editing, `delete_api_url` gates bulk delete.
 * Bulk edit was the exception: it had no URL of its own and was derived as
 * `update_api_url + "/bulk-update"`, so it was **always** present wherever
 * editing was. That made the capability undetectable, and the button shipped on
 * tables whose API has no such route (Print-Tracker's `UploadJob`, Base-POC,
 * which batches at `/batch`) — a dialog that 405s on submit.
 *
 * `bulk_update_api_url` is now emitted by the generator only when the route
 * really exists (bcl32-schema-utils probes the app's OpenAPI document), so
 * presence answers the question directly.
 *
 * ## The fallback is a migration window, and it is meant to be deleted
 *
 * A ModelData file generated *before* capability emission has no
 * `bulk_update_api_url` key at all — absence there means "unknown", not "no
 * route". Without the fallback, a frontend that picks up this package before
 * its app regenerates its metadata loses bulk edit on every table at once. So
 * while the key is missing we fall back to the old derivation.
 *
 * The cost of the window is precise and worth knowing: it is the only reason a
 * model with editing but no bulk route still shows the button. Once all four
 * apps have regenerated with a capability-aware generator, delete the fallback
 * branch — that single deletion is what finally switches those dead buttons
 * off.
 */
export function resolveBulkUpdateUrl(ModelData: ModelData): string | null {
  const explicit = ModelData.bulk_update_api_url;
  if (typeof explicit === "string") return explicit || null;

  // Migration window — see above. Delete once every app emits the explicit key.
  const update = ModelData.update_api_url;
  return update ? `${update}/bulk-update` : null;
}
