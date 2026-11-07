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

Open the local URL printed by Vite. Without cloud configuration, passages and progress are saved in this browser on this device.

## Enable cross-device sync

Sync uses Supabase Auth and a private Postgres table with row-level security. Each device signs in to the same Tahfeedh account.

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) once in that project's SQL Editor.
3. Copy `.env.example` to `.env.local` and enter the Project URL and publishable key from Supabase. Keep the key's `sb_publishable_` value; never put a `service_role` or `sb_secret_` key in the browser app.
4. Restart the local dev server. For Vercel, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under the project's environment variables, then redeploy.
5. In Tahfeedh, choose **Connect sync**, create an account or sign in, then sign in with the same account on the other device.

Changes sync automatically while connected and when the app becomes active. Deletions are recorded as sync tombstones so a passage deleted on one device is removed from the others. Built-in demo passages are not uploaded and are removed from the library the first time cloud sync is used. Existing custom passages are merged by their last modification time.

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

Teacher and classroom workflows, PDF/DOCX import, and speech scoring are not included. Flexible text normalization is deliberately conservative: exact Unicode text is preserved instead of stripping Arabic marks or changing letter forms.
