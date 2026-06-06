# Progress Sync Setup

The web app stores vocabulary content locally, but study progress can be shared
between devices through the Vercel API route at `/api/progress`.

## Required Database

Create a Vercel KV or Upstash Redis database and set these environment variables
on the Vercel project:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Upstash Redis can also use these names:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Optional Variables

- `APP_PASSWORD`: Required when password protecting the app. Set this in Vercel,
  not in client code.
- `APP_AUTH_SECRET`: Optional cookie signing secret. Defaults to `APP_PASSWORD`.
- `PROGRESS_SYNC_KEY`: Redis key name. Defaults to
  `hackers-transfer-750:progress:v1`.
- `PROGRESS_SYNC_TOKEN`: Optional API write/read token checked by the Vercel
  function.
- `EXPO_PUBLIC_PROGRESS_SYNC_TOKEN`: Client-side token sent to the API. Use the
  same value as `PROGRESS_SYNC_TOKEN` when enabling token checks.
- `EXPO_PUBLIC_PROGRESS_SYNC_URL`: Override sync endpoint. Usually not needed on
  Vercel because `/api/progress` is same-origin.

## Behavior

- App start and screen refresh pull the latest remote progress.
- Rating a card, undoing a rating, and pressing reset push the full progress
  snapshot.
- The sync model is last-write-wins. Avoid studying on two devices at exactly
  the same time.
