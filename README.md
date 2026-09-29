# Music v2

Music v2 is a Nuxt 4 application. Its Nitro server provides the API, authentication, database access, upload handling, and media routes alongside the frontend.

## Local setup

Install dependencies and create a local environment file:

```sh
npm install
cp -n .env.example .env
```

For an existing local `.env`, update its values instead of replacing the file. Set `NUXT_MONGODB_URI` to a MongoDB connection string. Set `NUXT_UPLOAD_DIR` to a writable directory for uploaded artwork and audio. `NUXT_TOKEN_EXPIRE` is optional and defaults to `1h`.

Run the app at <http://localhost:3000>:

```sh
npm run dev
```

## Runtime configuration

The private settings are declared in `nuxt.config.ts` and can be set with matching `NUXT_` environment variables:

| Variable | Required | Description |
| --- | --- | --- |
| `NUXT_MONGODB_URI` | Yes | MongoDB connection URI. |
| `NUXT_UPLOAD_DIR` | Yes for upload/media operations | Writable path where uploaded media is stored. Prefer an absolute path. |
| `NUXT_PUBLIC_MEDIA_BASE_URL` | Yes for browser media URLs | Public base URL used by `GET_FILE` and `GET_AUDIO_FILE` to build direct bucket URLs. |
| `NUXT_TOKEN_EXPIRE` | No | Session lifetime accepted by `parse-duration`, such as `1h` or `7d`; defaults to `1h`. |

For a short migration window, the server also accepts the standalone backend names `MONGODB_URI`, `UPLOAD_DIR`, and `TOKEN_EXPIRE` as fallbacks. Prefer the `NUXT_` names for all new deployments. `VITE_PUBLIC_BACKEND` is no longer used: browser API requests are same-origin.

Nuxt loads `.env` while running its CLI for development and local production preview, but a built server does not load `.env`. Configure these variables in the production process manager or hosting environment. See the [Nuxt runtime config guide](https://nuxt.com/docs/4.x/guide/going-further/runtime-config) and [deployment guide](https://nuxt.com/docs/4.x/getting-started/deployment).

## Production deployment

Deploy the Nuxt server using the Node.js Nitro output:

```sh
npm run build
NODE_ENV=production node .output/server/index.mjs
```

The server listens on port `3000` by default; Nitro also honors `PORT`/`NITRO_PORT` and `HOST`/`NITRO_HOST`. A reverse proxy may terminate TLS and forward requests to this server. When using cookie authentication, configure a trusted proxy to preserve the public `Host` and overwrite `X-Forwarded-Proto`; the server uses these values to validate same-origin mutation requests.

The health check endpoint is `GET /api/health` and returns `{ "status": "ok" }`.

The upload directory must be writable and persist across deployments/restarts, and all Nuxt instances serving the same library must see the same files. Static/serverless deployments without persistent writable storage are not suitable for the current upload and media routes. Install `ffmpeg` and `ffprobe` on the host and make them available on `PATH`; audio uploads are processed after they are received. Configure an ingress or reverse-proxy request size limit appropriate for audio uploads.

`npm run generate` creates static output and cannot provide this backend, database, authentication, or upload functionality. Use the Node server deployment above.

## Checks

```sh
npx tsc --noEmit -p .nuxt/tsconfig.app.json
npx tsc --noEmit -p .nuxt/tsconfig.server.json
npm run build
```
