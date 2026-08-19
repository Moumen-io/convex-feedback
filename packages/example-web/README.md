# convex-feedback React demo

A real Vite + Convex application that exercises the bundled `convex-feedback` and `convex-feedback-ui` workspaces.

## First run

From the monorepo root:

```bash
npm install
cd packages/example-web
npm run setup
npm run dev
```

`setup` creates/selects the example's Convex development deployment, generates its app API, and configures the JWT signing keys required by the anonymous Convex Auth provider. Each browser session then receives its own feedback actor without a login UI.

## Production backend + frontend build

Configure production auth keys once, then deploy:

```bash
npm run auth:init -- --prod
npm run deploy
```

The deploy script first builds both library workspaces, then runs `convex deploy --cmd 'vite build'`. Convex supplies `VITE_CONVEX_URL` to the Vite build. Upload the resulting `dist/` directory to Vercel, Netlify, Cloudflare Pages, GitHub Pages, or another static host.

The example is intentionally a workspace package under `/packages` so npm links `convex-feedback` and `convex-feedback-ui` locally.
