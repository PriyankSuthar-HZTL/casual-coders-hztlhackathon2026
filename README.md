# MigrateX

**Lift and shift, minus the shift** — migrate live-page content into [Contentstack](https://www.contentstack.com/) with a single URL.

MigrateX is a Next.js 16 web wizard that scrapes any public webpage, detects reusable page sections, maps them to Contentstack content types, and creates entries through the Stack Management API. It supports heuristic detection by default and optional Gemini-powered AI detection for richer extraction.

---

## Prerequisites

- **Node.js** `>=20.9.0`
- **npm** (included with Node.js)
- A [Contentstack](https://www.contentstack.com/) account with access to a stack
- Google Gemini API Key: a [Google AI Studio](https://aistudio.google.com/apikey) Gemini API key for AI detection

##CotentStack Credential
Link: https://app.contentstack.com/#!/stacks
Stack Name: Hacka-26
Email: Hackathon.Committee@horizontal.com
Password: Hackathon@2026
Stack API Key: blt8676802c42cf92c0

Check your local versions:

```bash
node --version
npm --version
```

---

## Local Setup

```bash
# Clone the repository
git clone <repo-url>
cd casual-coders-hztlhackathon2026

# Install dependencies
npm install

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## First-Time App Configuration

1. Start the dev server with `npm run dev`.
2. Open the local URL in your browser.
3. Sign in with your Contentstack account credentials.
4. Enter your stack API key.
5. Choose the correct region and environment.
6. Verify the Contentstack connection.
7. Optional: open the AI/Gemini settings panel, enter a Gemini API key, verify it, choose a model, and enable AI detection.

Once connected, the normal workflow is:

```text
URL -> Detect -> Match -> Page -> Preview -> Done
```

---

## Development Commands

```bash
npm run dev        # Start the Next.js dev server
npm run build      # Create a production build
npm run start      # Start the production server after 
```

## License

Private — Hackathon project HZTL.