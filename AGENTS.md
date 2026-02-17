# Repository Guidelines

## Project Structure & Module Organization
- Entry: `index.html`; open directly or via local server.
- Frontend: `src/app.js` (UI/PDF/AI), `src/dictionaryService.js` (lookup/cache), `src/storage.js` (localStorage), `src/styles.css`.
- Data: `data/ecdict-dictionary.json` (generated) with fallback `data/sample-dictionary.json`; source CSV `ecdict.csv` at repo root.
- Server: `server/index.js` serves static assets and proxies `/api/assistant` using `.env`.
- Tools: `scripts/build-dictionary.js` converts ECDICT CSV to JSON; `node_modules/` holds runtime deps only.

## Build, Test, and Development Commands
- `npm install` — install dependencies.
- `npm run dev:server` — start static server + DeepSeek proxy on `http://localhost:4173` (needed for AI assistant).
- `npm run build:dictionary [<csvPath> <outputPath>]` — create `data/ecdict-dictionary.json` from `ecdict.csv` (defaults shown).
- Quick preview without proxy: open `index.html` in browser (AI calls will fail without server).

## Coding Style & Naming Conventions
- JavaScript: ES modules, 2-space indentation, semicolons, single quotes, prefer `const`/`let`.
- Keep functions small and pure; return explicit objects (see `buildEntry` in `scripts/build-dictionary.js`).
- Align DOM IDs/classes with `index.html` and `src/styles.css`; avoid introducing new globals.
- Do not commit `.env`; copy from `.env.example` when configuring local keys.

## Testing Guidelines
- No automated suite yet; run manual checks:
  - Start `npm run dev:server`, ensure assets load and `/api/assistant` responds (with valid `DEEPSEEK_API_KEY`).
  - Upload `.txt` and PDF samples; verify click-to-define, audio, tooltips, sidebar, and CSV/XLSX exports.
  - After `npm run build:dictionary`, confirm `data/ecdict-dictionary.json` exists and is used by the UI.
- Add lightweight tests around dictionary parsing if you extend `scripts/build-dictionary.js`.

## Commit & Pull Request Guidelines
- History shows conventional-type prefix (`feat：第一版本`); continue with concise type prefixes (`feat:`, `fix:`, `chore:`) plus a short summary.
- PRs should explain what/why, list manual test commands/browsers, and include screenshots or GIFs for UI changes.
- Link issues, note new env vars, and mention if dictionary assets or sample data need regeneration.

## Security & Configuration Tips
- Keep `.env` local; set `DEEPSEEK_API_KEY`, optional `DEEPSEEK_BASE_URL`, and `PORT`.
- Proxy allows CORS; avoid public deployment without auth or rate limits.
