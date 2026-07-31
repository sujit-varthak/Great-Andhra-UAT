# API note: `schemaData` shape on articles

The optional "movie/review details" field on articles (`schemaData` in the article object returned by `GET /api/public/articles` and `GET /api/public/articles/:id`) now has this shape:

```json
{
  "movieName": "string",
  "rating": "string",
  "releaseDate": "YYYY-MM-DD"
}
```

`rating` is free-text (e.g. `"2.5/5"`, `"4 stars"`), not a bare number — not every review uses a 0-10 scale, and the admin panel's rating field is now a plain text input rather than a numeric one. If this shape was already relayed to you as `rating: number`, treat this as a correction to that — same "never populated, never shipped" caveat as before applies, so nothing you've built against real data needs to change.

This replaces an earlier draft shape (`{ director, rating, cast }`) that was never populated on any article and never shipped to you — no consumer-facing change is happening today, this is just the shape locking in before any data exists.

All three keys are optional; `schemaData` itself is `null` when none of them were set on an article. Intended use: build a schema.org `Movie`/`Review` JSON-LD block for rich search snippets — that generation isn't implemented anywhere yet (admin CMS or otherwise), so if you want rich snippets on article pages, you'd build that from these fields on your end.
