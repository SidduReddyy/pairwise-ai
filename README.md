# Pairwise AI — Intelligent Dating Compatibility Platform

> **Internship Challenge Prototype** — A fully functional end-to-end dating compatibility platform powered by Google Gemini AI.

![Pairwise AI Demo](https://img.shields.io/badge/Status-Production%20Prototype-coral?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square)
![Gemini AI](https://img.shields.io/badge/AI-Google%20Gemini-orange?style=flat-square)

---

## ✨ Features

- **25 Synthetic Demo Profiles** — Seed instantly, complete workflow in minutes
- **Social Media Retrieval** — LinkedIn and Instagram adapters with transparent limitations
- **Gemini AI Profile Analysis** — Structured profiles with evidence attribution and confidence scores
- **AI Dating Agents** — Per-person agents simulate multi-turn first-date conversations
- **Compatibility Scoring** — Transparent, configurable scores with full explanation
- **Live Dashboard** — Overview, profiles, sessions, rankings, and run history

---

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+
- A Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### 2. Installation

```bash
git clone https://github.com/SidduReddyy/pairwise-ai
cd pairwise-ai
npm install
```

### 3. Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```bash
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="your-gemini-api-key-here"
NEXT_PUBLIC_APP_MODE="demo"
AI_REQUESTS_PER_MINUTE=10
AI_MAX_CONCURRENCY=3
```

### 4. Database Setup

```bash
npx prisma db push
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Seed Demo Data

```bash
npm run seed
# or in the browser: click "Seed Demo Data" on the Overview page
```

---

## 🗂️ Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── people/          # Person CRUD with validation
│   │   ├── analyze/[id]/    # Profile retrieval + AI analysis
│   │   ├── sessions/        # Dating agent sessions
│   │   ├── rankings/        # Compatibility scoring + ranking
│   │   ├── seed/            # Demo data seed endpoint
│   │   ├── stats/           # Dashboard statistics
│   │   └── logs/            # Run history
│   └── dashboard/           # All UI pages
├── lib/
│   ├── ai/
│   │   ├── gemini.ts        # Gemini provider adapter
│   │   ├── profile-analyzer.ts  # Structured profile generation
│   │   └── dating-agent.ts  # Multi-turn conversation agents
│   ├── adapters/
│   │   ├── linkedin.ts      # LinkedIn data retrieval
│   │   └── instagram.ts     # Instagram data retrieval
│   ├── db.ts                # Prisma singleton
│   ├── scoring.ts           # Compatibility scoring engine
│   ├── rate-limiter.ts      # Token bucket rate limiter
│   ├── url-validation.ts    # LinkedIn/Instagram URL validation
│   └── demo-data.ts         # 25 synthetic profiles
└── tests/
    └── core.test.ts          # URL, scoring, ranking tests
```

---

## 🔄 Workflow

```
Add Person → Retrieve Social Data → AI Profile Analysis → Dating Session → Compatibility Ranking
```

1. **Add Person** — Submit LinkedIn/Instagram URLs (validated client + server)
2. **Retrieve Data** — LinkedIn and Instagram adapters fetch public Open Graph data
3. **AI Analysis** — Gemini generates structured profiles with evidence attribution
4. **Dating Session** — Two AI agents conduct a simulated date conversation (8 turns)
5. **Ranking** — Compatibility scores computed across 4 dimensions for all pairs

---

## 🤖 AI Agents

Each dating agent:
- Has access **only** to its own person's analyzed profile and the other person's profile
- Generates responses consistent with documented interests and preferences
- Does NOT invent biographical details
- Is clearly labeled as an AI simulation

---

## 📊 Compatibility Scoring

| Dimension | Weight | How It's Computed |
|-----------|--------|-------------------|
| Shared Interests | 30% | Jaccard similarity + confirmed overlap bonus |
| Preference Alignment | 25% | Explicit preference matching |
| Lifestyle Compatibility | 20% | Industry overlap + skill similarity |
| Date Outcome | 25% | Simulated date compatibility + recommendation |
| Uncertainty Penalty | -0 to -30 | Applied when data is missing/low confidence |

> **Disclaimer:** These scores are algorithmic similarity indicators. They do not scientifically predict romantic success.

---

## ⚠️ Data Retrieval Limitations

### LinkedIn
LinkedIn **requires authentication** to view full profiles and prohibits automated access (ToS §8.2). This adapter:
- Attempts Open Graph meta tags (limited: name + headline if publicly visible)
- Returns `manual_required` status when full data cannot be retrieved
- Supports manual import via LinkedIn's "Download Your Data" export

### Instagram
Instagram **restricts automated access** to profile data. This adapter:
- Attempts Open Graph meta tags (display name, bio, follower counts)
- Does not use private APIs or bypass authentication
- For full post data, Instagram Basic Display API OAuth is required

---

## 🎭 Demo Mode

25 synthetic fictional profiles are available for full end-to-end demonstration:
- All profiles are clearly labeled as **Synthetic Demo Profile**
- Synthetic data is never mixed with real-person data
- Seed via the dashboard button or `npm run seed`

---

## 🧪 Running Tests

```bash
npm test
```

Tests cover:
- URL validation (LinkedIn and Instagram)
- Compatibility scoring edge cases
- Ranking logic (self-exclusion, order correctness)

---

## 🚢 Deployment (Vercel)

1. Push to GitHub
2. Connect repo in Vercel dashboard
3. Add environment variables:
   - `DATABASE_URL` — Use Vercel Postgres or Neon for production
   - `GEMINI_API_KEY` — Your Google Gemini API key
4. Add `npx prisma db push` as a build command prefix
5. Deploy

### Vercel `vercel.json`
```json
{
  "buildCommand": "npx prisma db push && next build"
}
```

### For production, use Vercel Postgres:
```bash
# Change schema.prisma provider to "postgresql"
# Set DATABASE_URL to your Postgres connection string
```

---

## 🔐 Security

- **API keys never exposed to client** — All AI calls are server-side only
- **Server-side validation** — All inputs validated before processing
- **Rate limiting** — Token bucket algorithm prevents AI API abuse
- **Bounded concurrency** — Maximum 3 simultaneous AI requests

---

## 🏗️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | SQLite file path or Postgres URL |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `NEXT_PUBLIC_APP_MODE` | ❌ | Set to `"demo"` to highlight demo mode |
| `AI_REQUESTS_PER_MINUTE` | ❌ | Rate limit (default: 10) |
| `AI_MAX_CONCURRENCY` | ❌ | Max concurrent AI requests (default: 3) |

---

## 📝 Known Limitations & Incomplete Items

1. **LinkedIn/Instagram retrieval** — Full data requires login (platform restriction). Real-world deployment needs OAuth integration with the platforms.
2. **Database** — SQLite is used for local dev. Switch to Postgres for production scale.
3. **Avatar images** — Currently uses initial-based avatars. Could be enhanced with profile picture retrieval.
4. **Session streaming** — Dating conversations are generated server-side then returned. Real-time streaming would improve UX.
5. **Bulk operations** — Analyzing all profiles requires clicking per-person or "Analyze All". A queue-based batch processor would be more robust.

---

## 📄 License

MIT — Free for educational and demonstration purposes.
