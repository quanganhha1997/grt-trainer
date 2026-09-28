# Grt

Grt is an AI-assisted personal training web app. The current prototype includes personalized onboarding, workout routines, and a browser-based squat form checker with pose landmarks, joint angles, phase detection, repetition counting, and per-repetition coaching.

Exercise videos are analyzed in the browser and are not uploaded by the app.

## Requirements

- macOS, Linux, or Windows with a Bash-compatible terminal
- Node.js 22.13.0 or newer
- npm
- Internet access the first time the MediaPipe model loads

If you use `nvm`, the repository includes an `.nvmrc` file:

```bash
nvm install
nvm use
```

## Run locally

Install the locked dependencies:

```bash
npm ci --include=dev
```

Start the development server:

```bash
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

For form-check testing, use a 5–15 second side-view bodyweight squat video with the full body visible. Chrome is recommended for the most predictable MediaPipe behavior.

## Validation commands

```bash
npm test
npm run build:pages
```

- `npm test` validates the existing Cloudflare/Sites build and unit tests.
- `npm run build:pages` creates a static GitHub Pages export in `dist-pages`.

To inspect the exported site locally:

```bash
npx serve dist-pages
```

The static preview uses the repository root. GitHub Actions supplies the correct repository base path during deployment.

## Deploy to GitHub Pages

The workflow at `.github/workflows/deploy-pages.yml` automatically builds and deploys the app whenever the `main` branch is pushed. It supports both:

- Project Pages: `https://USERNAME.github.io/REPOSITORY/`
- User Pages repositories named `USERNAME.github.io`: `https://USERNAME.github.io/`

After pushing the repository to GitHub:

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select **GitHub Actions** as the source.
4. Open the **Actions** tab and wait for **Deploy Grt to GitHub Pages** to complete.
5. Open the URL shown in the completed deployment.

The workflow uses GitHub's official Pages actions and publishes only the generated `dist-pages` directory. The separate output prevents a GitHub Pages build from being packaged accidentally for the Sites host.

## Important limitations

- GitHub Pages is static hosting. Server-only routes, secrets, databases, and Cloudflare Worker code will not run there.
- The current Grt experience is compatible because user state is session-based and pose analysis runs locally in the browser.
- The MediaPipe model and WebAssembly runtime are loaded from their configured remote sources, so the form checker needs network access when those assets are not cached.
- Form feedback is educational and is not medical advice or a guarantee that an exercise is safe.

## Project structure

- `app/` — pages and feature components
- `components/` — shared interface components
- `public/` — static assets
- `tests/` — movement-analysis tests
- `.github/workflows/` — GitHub Pages deployment
- `.openai/hosting.json` — existing Sites deployment identity; keep this file when using the Sites-hosted version
