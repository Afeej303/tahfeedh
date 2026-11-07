# Tahfeedh

Tahfeedh is a responsive, local-first memorization workspace for learning exact passages by heart. It combines progressive hiding, first-letter prompts, cloze practice, typing recall, token-level comparison, a personal library, review queue, learning dashboard, and section editor.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Local setup

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Passages and practice progress are saved in the browser's local storage on this device. No account or server is required for this MVP.

## Production build

```bash
npm run build
npm run preview
```

Vite outputs the static site to `dist/`. TypeScript is checked as part of the production build.

## Vercel deployment

Import this Git repository in Vercel and keep the detected Vite defaults:

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`

Or install the Vercel CLI and run `vercel` from the project directory. No environment variables are needed for the local-first MVP.

## Features and boundaries

- Add or edit passages by typing, pasting, or importing a `.txt` file.
- Preserve original source text and adjust auto-split learning sections independently.
- Practice with progressive word hiding, first letters, cloze prompts, and full typing recall.
- Compare recall by Unicode word tokens; view correct and missed source words.
- Use Arabic and Urdu passages with automatic right-to-left presentation in reading and recall fields.
- Review passages due for practice and see basic session and accuracy summaries.

The MVP stores data in the browser only. Cross-device sync, accounts, teacher and classroom workflows, PDF/DOCX import, and speech scoring need a backend and are not included yet. Flexible text normalization is deliberately conservative: exact Unicode text is preserved instead of stripping Arabic marks or changing letter forms.
