# Apple-style Gift Card Balance Checker (Demo)

This is a minimal Next.js demo that presents a polished, Apple-like UI to check an Apple gift card balance. It uses a mock API route to simulate balance lookups for demo and development purposes.

## What I added

- `pages/index.js` — Main UI page with inputs for card number and PIN and a polished result card.
- `pages/api/check-balance.js` — Mock API route that validates input and returns a deterministic fake balance.
- `pages/_app.js` — Global styles included.
- `styles/globals.css` — Apple-like styling.
- `package.json` — Minimal scripts to run the app.

## Local development

1. Install dependencies:

```bash
cd /Users/mac/cardBalance
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open `http://localhost:3000` in your browser.

## Notes
- This is a demo/mock implementation — it does not connect to Apple's backend. For production, replace the API route with a secure backend integration following Apple's terms of service.
- The mock API returns a deterministic balance based on the card number so results are repeatable.

If you'd like, I can:
- Add TypeScript support and stricter validations.
- Add accessibility improvements and keyboard handling.
- Hook this up to a real back-end (if you have access to an API).
