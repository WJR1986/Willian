# Starbound — the rare-answer ascent

A space-themed rebuild of your supplied Krillion-style prototype. Choose a pilot, answer seven prompts and climb away from Earth. No build step, accounts, API keys or paid services are required.

## Start on GitHub Pages

1. Unzip this package.
2. Open your GitHub repository and upload the **contents** of the `starbound` folder. `index.html` should sit at the repository root, beside `styles.css`, `js` and `data` — not inside another enclosing folder.
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, select **Deploy from a branch**, then **main** and **/(root)**. Save.
4. Wait for GitHub’s deployment to finish, then open the URL shown in Pages settings. A typical address is `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.
5. Add your pilot names and launch a mission. Share the site URL with workmates.

Hosting has not been configured or published for you. This package is ready to upload. GitHub documentation: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## Run on your own PC first

Use VS Code’s Live Server extension, or open a terminal in this folder and run:

```sh
python -m http.server 8000
```

On Windows, `py -m http.server 8000` may be the appropriate command. Open `http://localhost:8000`. Do not double-click `index.html`: browsers normally block the question JSON request from a `file://` page.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Screens, forms and accessible structure |
| `styles.css` | Space visuals, responsive layout and reduced-motion support |
| `js/app.js` | Game flow, timer, profile UI, stats, backups and result sharing |
| `js/core.js` | Answer matching, shuffle/deck logic, match codes and validation |
| `data/questions.json` | Editable prompts, scores and alternative answer spellings |
| `tests/*.test.js` | Node tests for data, core behaviour and game flow |
| `package.json` | Runs the tests; no production dependencies |
| `.nojekyll` | Tells GitHub Pages to serve these static files directly |

## Profiles: what is and is not saved

This version implements your **select player** option, rather than a password login. Each browser saves its own names, completed-flight count, best score, total score, correct-answer total, daily results and separate practice decks for each difficulty using localStorage. Average score is calculated from the totals. The selected pilot is remembered after a reload.

- Profiles on a shared PC can be selected by anyone using that browser.
- Another PC, browser profile or phone does not automatically have the same names or stats.
- Both leaderboards are local to that browser, not shared online leaderboards. Different computers get the same daily questions, but their scores do not sync.
- Clearing site data, private browsing or workplace cleanup policies may remove records.
- Changing the site origin changes which browser data is available. Sites sharing the same GitHub Pages origin can access that origin’s localStorage; this is not suitable for confidential data.
- Keep one game tab open at a time. A detected change from another tab disables further saves in this tab to reduce accidental overwrites. Export new results and reload if warned.
- Use **How to play & save your progress → Export backup** regularly. Importing a backup replaces the current browser’s profiles after confirmation. It does not merge independent scores from multiple devices.
- A blocked/full storage warning means progress is only in memory; export before leaving.
- In-progress flights are not resumed after a refresh. Only completed flights count. Abandoned free flights still consume their drawn prompts, to avoid seeing the same prompts immediately again.

Adding a password field or a PIN to this static app would not create secure authentication. GitHub Pages serves the app; it is not a shared database. For shared accounts and stats, the next version needs an external authentication service and database with enforced per-user access rules. Anyone can inspect the published question bank and edit local scores, so this edition is intended for friendly, trust-based play.

## Daily game, difficulty and unlimited practice

**Daily** is the default mode. Every pilot gets the same seven **General knowledge** prompts for that UK calendar date (Europe/London, including British summer time). The selection favours seven different topics. No match code is needed. Players on separate PCs must use the same bank version to get identical questions.

Each local pilot can record **one completed daily per date**. The daily button then becomes unavailable for that pilot, and the result screen offers unlimited practice instead. The recorded date is the date the flight started, even if it finishes after midnight. Unfinished daily flights may be restarted; this is deliberately a first-completed-result rule, not a locked first-start rule. This browser-only limit can be bypassed by clearing data or using a new profile/device, so it remains a friendly competition rather than enforced online ranking.

The new **Daily leaderboard** shows only that date's completed daily scores, with the bank version for comparison. Existing lifetime totals are preserved in a separate **All-time flight totals** table, which mixes all modes and difficulties and is not the daily competition ranking.

Practice and crew challenges offer:

| Difficulty | Prompts | Intended style |
| --- | --- | --- |
| Easy | 14 | Everyday basics such as days, seasons, senses and card suits |
| General knowledge | 33 | Familiar food, animals, music, television, sport and geography; used for the daily |
| Hard / specialist | 16 | The more specialist science, history and terminology questions |

All three keep seven rounds, 25 seconds per round and a maximum score of 700. Difficulty changes the question pool, not the scoring scale. These are editorial difficulty labels, not measured ratings; adjust them based on your group's feedback.

**Practice has no daily limit.** Each pilot has a separate shuffled deck for each difficulty. A flight never repeats a prompt within itself, and each deck runs through its pool before replenishing. Questions eventually repeat; unlimited games does not mean infinitely many unique questions. Existing old mixed-difficulty decks are retained in backups but new practice decks start fresh after this update.

**Crew challenge** makes a deterministic seven-question selection from a match code, chosen difficulty and bank version. Use the same three settings on every device. It does not create a live room or sync scores. Replays are allowed and contribute to all-time totals, but not the Daily leaderboard. Agree separately if you only want to compare first attempts in custom challenges.

Avoid changing the question bank during the workday: it changes the date's selection. Deploy content updates before the group's first daily attempt. A bank-version label appears on daily records and copied results to identify different editions.

## Rules and scoring

- Seven prompts, 25 seconds each, one accepted answer per prompt.
- Invalid/unlisted answers can be retried until the deadline. Empty submissions are ignored.
- The timer starts when a prompt opens. Choose **Next prompt** to begin the next round, giving you time to read feedback.
- Switching tabs does not pause the deadline. Skipping or timing out awards zero.
- Each accepted answer has 10–100 curated points. These are game-design weights, not surveyed rarity or live player popularity.
- Every current prompt includes a 100-point answer. A perfect mission is 700 points / 7,000 fictional game kilometres.
- Case, spacing, punctuation and accents are ignored. Exact answers and explicit aliases are checked first, then distinctive whole-word shortened forms (such as `Boleyn`), then cautious typo matching.
- Typo matching allows one insertion, deletion, substitution or adjacent letter swap for names of 4–7 characters, and up to two for names of 8 or more characters (using the shorter string length). Names shorter than four characters require an exact answer or alias.
- If more than one accepted answer is plausible, no points are awarded yet: the player is asked for more detail while the timer continues. Successful typo/short-form matches show the canonical answer with “Accepted as”.
- The matcher only searches the current prompt’s bank. It cannot judge unlisted correct answers, understand every paraphrase or reliably infer every intended word. Explicit aliases remain the best way to support unusual shortened forms. Arbitrary prefixes are not automatically accepted.
- Some prompts have a curated rather than exhaustive list, especially pasta. An unlisted answer is not automatically factually wrong; the interface says so.
- The space zones are illustrative game milestones, not a physical simulation.

## Expand the JSON question bank

Add an object inside the `questions` array. Use a unique permanent `id`. Example:

```json
{
  "id": "sample-instruments",
  "category": "Music",
  "difficulty": "general",
  "text": "Name an instrument in this example’s curated bank.",
  "answers": [
    { "text": "Guitar", "points": 10 },
    { "text": "Violin", "points": 30, "aliases": ["Fiddle"] },
    { "text": "Bassoon", "points": 100 }
  ],
  "note": "Illustrative example only: expand and review this list before publishing."
}
```

The example is documentation only, not a shipped prompt. Include common alternatives and factual edge cases. Do not add an alias that normalises to the same value as another answer or alias within that prompt (for example `X ray` and `X-ray` already match).

Keep JSON valid: double quotes, commas between objects, no comments or trailing commas. Bump the top-level `version` whenever questions, order, answers or scores change, so challenge players can tell whether they are comparing the same bank. Use stable IDs even when editing wording. New questions enter existing pilots’ decks when those decks refill; removed IDs are filtered out.

Run `npm test` from this directory with Node installed after editing. The app also validates the bank before enabling play and shows an error if it cannot load it. There must be at least seven prompts in each difficulty. Use `easy`, `general` or `hard` in each question’s `difficulty` field. Only `general` enters the daily pool.

## Recommended next steps, in order

1. **Grow and review the answer bank.** Aim for 100–200 well-defined prompts, with source checks and realistic alternative answers. Test with workmates and collect disputed answers. This improves variety more than adding more modes.
2. **Add shared profiles if you need multiple PCs.** Decide between an informal shared roster and real sign-in. Real sign-in needs authentication, a database and access rules. Keep secret admin/service credentials out of GitHub and browser code. Keep the current local version as a fallback.
3. **Separate practice and competition.** Store per-match first attempts, bank version and completed results. Use server-side answer checking for any meaningful anti-cheat protection. Track league standings by a shared match, not best-of-unlimited-retries.
4. **Add an answer-review/editor workflow.** Validate new questions automatically, flag ambiguous wording and store answer suggestions for review; do not silently award points for every disputed answer.
5. **Consider optional relaxed play and topic filters.** Difficulty choices are implemented; a later untimed mode should keep separate records. Topic filters need enough prompts for a complete game.
6. **Consider install/offline support later.** The app has no third-party fonts or runtime libraries, but this release has no service-worker offline cache. Explicit versioned caching is important so everyone gets the same question bank.

## Verification

Eighteen automated tests pass. Daily tests cover UK midnight and British summer time, deterministic questions, topic variety, separate difficulty pools, one completed daily per pilot, cross-midnight completion and backup preservation. Core tests cover valid data, normalisation/aliases, deterministic challenges, non-repeating decks and malformed backups. Matching tests cover spelling mistakes, transposed letters, shortened names, ambiguity, short-answer safeguards, all existing answers/aliases and irrelevant inputs. A lightweight DOM fixture checks a full seven-round game, duplicate submissions, replay, timeout, skip, player isolation, reload persistence and backup restore. The app has responsive CSS, labelled controls, keyboard form submission, live feedback and reduced-motion support.

A real browser could not launch in the build environment, so visual layout, actual downloads/clipboard, and browser-specific behaviour have **not** been visually verified. Before sharing, try this short Microsoft Edge checklist:

1. Create two pilots and complete a game for one. Reload; check only that pilot's stats changed.
2. Play the same challenge code as the other pilot and confirm the prompts match.
3. Let one prompt time out, try an unlisted answer and skip a prompt.
4. Export a backup, add a temporary pilot, then import the backup and confirm the temporary pilot disappears.
5. Copy a result and paste into a plain text editor.
6. Resize to a phone-width window and check inputs, buttons and the flight report remain usable.

This is an independent hobby-game implementation. It uses its own Starbound branding and space presentation; no original game artwork was included.

## Update 1.1 — forgiving answers

Replace the existing site files with this package, including `js/core.js`, `js/app.js`, `index.html` and `data/questions.json`. Profile storage uses the same key and schema, so existing local profiles and stats are preserved. Export a backup before uploading as a precaution. Refresh the browser after GitHub finishes deployment; use Ctrl+F5 if old behaviour remains. This historical update was Bank 1.1.0; use the latest version below when comparing results.

## Update 1.2 — daily general knowledge and difficulty choices

Replace the existing site files with this package, including `index.html`, both files in `js`, and `data/questions.json`. The latest bank is **1.2.0**. Existing profiles and all-time stats are compatible; export a backup before updating. Daily records begin with this release. Refresh with Ctrl+F5 after deployment.

Edge checklist additions: confirm Daily is selected on arrival, play the same daily as two pilots, confirm the questions match and both appear on today's board, then confirm a completed pilot can still play unlimited practice at each difficulty. The daily button refreshes while the lobby is open and when returning to the tab.
