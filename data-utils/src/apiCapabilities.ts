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
 * tables whose API has no such route (Print-Tracker's `UploadJob` and
 * `PrintJob`) — a dialog that 405s on submit.
 *
 * `bulk_update_api_url` is emitted by the generator only when the route really
 * exists (bcl32-schema-utils probes the app's OpenAPI document), so presence
 * answers the question directly. It stays a function so that rule lives in one
 * place and consumers never special-case a missing key.
 *
 * ## The migration window is closed as of 2.4.0
 *
 * 2.3.0 fell back to the old derivation while the key was absent, so an app
 * could adopt the package before regenerating its metadata. Every app that
 * consumes data-utils now emits the key (image-poc, the one unmigrated
 * registry, does not depend on this package at all), so absence has stopped
 * meaning "unknown" and now means "no route". Removing the branch is what
 * finally switches the dead buttons off.
 *
 * One consequence is worth stating, because it is invisible from this file: a
 * call site that **hand-injects** `update_api_url` for a model the generator
 * gives no URLs at all — a `surface: scoped` model such as Print-Tracker's
 * part-set members or project items — used to get a working bulk URL out of
 * the derivation for free. Those sites must inject `bulk_update_api_url`
 * alongside it. Injecting the update URL is now a statement about row editing
 * only.
 */
export function resolveBulkUpdateUrl(ModelData: ModelData): string | null {
  return ModelData.bulk_update_api_url || null;
}
