# English Practice

A static student-facing exercise page backed by the published Google Apps Script API.

## Current status and limits

The website repository is public for GitHub Pages hosting. API version 2 includes the safeguards below; the original unsafe deployment remains archived. No Google credentials, answer keys, or student records belong in this repository.

- Answers: 1–500 characters, English letters, digits, spaces, and common punctuation. Formula markers and markup are rejected; leading formula-sensitive text is also escaped before spreadsheet writes.
- Browser: one submission attempt per 60 seconds, remembered locally. This can be bypassed by clearing browser storage.
- Backend: at most 10 valid-shaped POST attempts per UTC minute and 200 per UTC day, shared by all students. Uses a script lock and persistent counters. Rejected malformed requests still consume Apps Script execution resources; these controls are not DDoS protection or authentication.
- Hard storage cap: 1,000 data rows each in Submissions and Student Answers (headers excluded). Checks room for the entire submission under the same lock before any row write. Existing data counts; nothing is deleted automatically. The answer-row cap may be reached first for multi-question exercises.
- Persistent kill switch: the first POST that would exceed a rate, daily, or row limit sets `API_STOPPED_REASON`. Later GET/POST requests return a closed message before sheet access. It stays stopped across time-window resets. This means a student can deliberately trigger closure; the switch favors containment over availability.
- Manual stop: in Apps Script → Project Settings → Script properties, set `API_DISABLED` to `true`. To reopen after review, clear `API_STOPPED_REASON` and remove `API_DISABLED` (or set it to `false`). Reset `submission-limits-v1` only if intentionally resetting counters; otherwise wait for the applicable time window. Full tabs must have capacity before reopening. No HTTP route resets the switch.
- Apps Script still starts incoming requests and reads switch properties. This is not a network-level block; archive the deployment to stop serving the endpoint.
- Exactly one answer per exercise question is required; duplicate or unknown IDs and bodies over 32,000 characters are rejected.
- The browser cannot read the POST response, so it cannot confirm acceptance or explain a server-side rejection. Keep answers on screen until a teacher confirms receipt.

The local `backend/guard.gs` contains the replacement handlers and helpers. The existing exercise reader is renamed `publishedExercises_`; `getRows`, sheet constants, and `jsonResponse` remain in the private Apps Script Code.gs. Backend code is maintained separately from the public student website.

## Privacy and answer-key rules

- The site contains no Google account credentials or API secrets.
- The browser receives only published exercise prompts.
- Correct answers must stay in the private Google Sheet / Apps Script project and must never be returned by the API.
- Submissions are sent as browser-safe `text/plain` POST requests. The browser cannot read the response, so it confirms only that the request was sent.

## Publish with GitHub Pages

Push these files to the repository root, then choose **Settings → Pages → Deploy from a branch → main → /(root)**.
