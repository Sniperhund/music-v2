# Music v2

Yet another music platform.

This is a rewrite of my [first version](https://github.com/Sniperhund/Music), everything is contained in this repo instead of v1 (v1 had a separate frontend + backend)<br />
I got tired and irritated by trying to add new features to v1, so here we are nearly 5 months in development.

It's a Nuxt 4 full stack application, hook up a S3 bucket and MongoDB service and you're basically good to go (check .env.example)

This project is mostly a inspiration of Apple Music (my go-to platform) with my personal design choices and the "I can do it" mindset.

### Debug view

There's a debug view (now only for lyric alignemt), just set `DEBUG_VIEW` to `1`. It will likely be expanded.

## Local setup

Install dependencies and create a local environment file:

```sh
bun install
cp -n .env.example .env
```

Run the app at <http://localhost:3000>:

```sh
bun run dev
```
