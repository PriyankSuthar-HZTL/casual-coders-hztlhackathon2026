# Stackshift

**Lift and shift, minus the shift** — migrate live-page content into [Contentstack](https://www.contentstack.com/) with a single URL.

Stackshift is a web-based wizard that scrapes any public webpage, detects its structural components using AI-powered heuristics, maps them to Contentstack content types, and creates entries via the Management API — all from your browser.

---

### Prerequisites

- **Node.js** >= 20.9.0
- A [Contentstack](https://www.contentstack.com/) account with a stack

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd stackshift

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

```bash
npm run build
npm run start
```

### Other Commands

```bash
npm run lint        # Run ESLint
npm run typecheck   # Run TypeScript type-checking
```

## License

Private — Hackathon project.
