---
"@bcl32/account": minor
---

ActivityFeed: hide chosen verbs with `excludeVerbs`

Some mutations are worth **recording** but not worth **reading**. Home Helper's
thumbnail endpoints are the motivating case: they live on the polymorphic
resource rail (`POST /rooms/{id}/resources/{rid}/thumbnail`), which is mounted
per parent with `tags=["Resources"]`. `install_activity` excludes by a route's
*first* tag and `include_router`'s tags come first, so the package's default
`exclude_tags` can never reach them — "Media" is never their first tag. The rows
are written, correctly (someone really did attach that photo); they are just
noise beside "created a room".

`ActivityFeed` takes `excludeVerbs?: string[]` and `AccountPanel` forwards
`activityExcludeVerbs` to its Activity tab. Both render as a **repeated** query
parameter (`?exclude_verbs=a&exclude_verbs=b`), which is what FastAPI reads into
a `list[str]`; comma-joining would arrive as one string matching no verb.

The filtering is done by the API (bcl32-auth ≥ 0.2.0), deliberately not by
dropping rows here: `total` has to count the same rows the reader can see, or
"Show more" offers a page that renders as nothing.

Two details worth knowing:

- A trailing literal names the event and multiple literals join with `_`, so
  `/thumbnail/fetch` is `thumbnail_fetch` and excluding `thumbnail` does **not**
  cover it. Pass both.
- The dependency is on the array's *contents*, not its identity. Callers pass a
  literal (`excludeVerbs={["thumbnail"]}`), which is a fresh array every render;
  depending on the array itself would reset the paging window on every render
  and snap "Show more" back as fast as it was clicked.

Additive and opt-in — omitting the prop changes nothing.
