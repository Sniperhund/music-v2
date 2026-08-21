# Repository Guidelines

## Project Structure & Module Organization

This repository is a Nuxt 4 app. Application code lives under `app/`:

- `app/pages/` route pages
- `app/components/` feature components
- `app/ui/` shared UI primitives
- `app/composables/` reusable Vue logic
- `app/utils/` helpers and type utilities
- `app/styles/` global SCSS and variables
- `app/plugins/` client-side plugins

Static files belong in `public/`. Keep page-specific logic close to the page, and prefer shared code in `composables/`, `ui/`, or `utils/` when it is reused.

## Build, Test, and Development Commands

- `npm install` installs dependencies and runs Nuxt prepare through `postinstall`.
- `npm run dev` starts the local dev server on `http://localhost:3000`.
- `npm run build` creates a production build.
- `npm run preview` serves the production build locally.
- `npm run generate` builds a static output when needed.

There is no dedicated automated test script in `package.json`, so verify changes manually in the browser after building or running the dev server.

## Coding Style & Naming Conventions

Prettier is configured with tabs, `tabWidth = 4`, and no semicolons. Follow the existing Vue/Nuxt style in the repo:

- Use `PascalCase` for Vue components, such as `Player.vue` or `TrackDisplay.vue`.
- Use `camelCase` for functions, composables, and variables.
- Keep filenames descriptive and route-driven in `app/pages/` (for example `artist/[id]/index.vue`).

Prefer the current patterns in the codebase over introducing new abstractions.

## Testing Guidelines

No test framework is currently configured. For changes that affect rendering, routing, or API access, validate the affected pages manually and check browser console output. If you add tests later, colocate them near the feature or under a dedicated `tests/` directory.

## Commit & Pull Request Guidelines

Recent commits are short and direct, often written as brief past-tense summaries such as `Fixed lyrics` or `Small cleanup`. Keep commit messages similarly concise and action-oriented.

Pull requests should include:

- a short description of the change
- any related issue or context
- screenshots or screen recordings for UI work
- notes about environment variables or backend expectations when relevant

## Security & Configuration Tips

The app reads `VITE_PUBLIC_BACKEND` from `.env` and expects remote assets from `api.music.lucasskt.dk`. Do not commit secrets or machine-specific values.
