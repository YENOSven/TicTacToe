# Tic Tac Toe Web Port

This is a browser-based Tic Tac Toe variant inspired by the original Java Swing assignment. You place pieces until the configured number of empty cells remains, then slide tiles into adjacent empty cells. Three in a row wins; if no legal moves remain, the game is a draw.

## Project Layout

- `index.html` - app shell.
- `css/main.css` - page and board styling.
- `js/main.js` - game state, rules, and computer move search.
- `assets/` - GIF sprites for empty, human, computer, and selected cells.
- `vercel.json` - static deployment settings for Vercel.

## Running Locally

Open `index.html` directly in a browser, or serve the repo root with any static server:

```bash
python -m http.server
```

Then visit `http://localhost:8000/`.

## Deploying to Vercel

This repo deploys as a static site from the repository root. No build step is required.

```bash
vercel
vercel --prod
```

Vercel should serve `index.html` at `/` and the static assets from `/css`, `/js`, and `/assets`.

## Vercel 404 Checklist

- Keep `index.html` at the repository root unless the Vercel project settings are changed to match a different output directory.
- Do not add a catch-all route that points every request to a missing file or API handler.
- Confirm `vercel.json` stays valid JSON and does not set an output directory for a folder that does not exist.
