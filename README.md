# English Practice

A static student-facing exercise page backed by the published Google Apps Script API.

## Privacy and answer-key rules

- The site contains no Google account credentials or API secrets.
- The browser receives only published exercise prompts.
- Correct answers must stay in the private Google Sheet / Apps Script project and must never be returned by the API.
- Submissions are sent as browser-safe `text/plain` POST requests. The browser cannot read the response, so it confirms only that the request was sent.

## Publish with GitHub Pages

Push these files to the repository root, then choose **Settings → Pages → Deploy from a branch → main → /(root)**.
