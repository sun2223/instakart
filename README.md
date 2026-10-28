# InstaKart 🛒 — Full-stack AI Grocery App

**A functioning portfolio demo** of a grocery shopping app with catalog-grounded generative AI, personalized suggestions, safe COD checkout, and real-time order progress. Built independently as an educational project inspired by the capabilities described in [Sachin-K13Y/Hackon](https://github.com/Sachin-K13Y/Hackon); **not an official fork, production grocery business, or real delivery service**.

> **Transparency:** The catalog and prices are synthetic. Orders, COD payment and courier status are simulated. With a Groq key, ingredient extraction and contextual recommendation reranking call a real hosted LLaMA model. Without a Groq key, AI features run an explicitly labeled deterministic demo. Real delivery, payment settlement and performance guarantees are **not** implemented.

## Included features

| Feature | Implementation |
| --- | --- |
| Responsive, modern store | React 19 + TypeScript + Vite; mobile layouts |
| 280+ items in 10 categories | **384 demo product listings** (generated from catalog source) with INR prices, 3 branded variants and stock counts |
| Search | Indexed-by-application catalog retrieval, word/phrase matching, synonyms and intelligent fallback |
| AI Cart Builder | Groq (`llama-3.1-8b-instant`) ingredient extraction returning constrained JSON; local no-key mode |
| Hinglish | Recognizes examples such as `pasta ka saman`, `dahi`, `poha`, `pyaz`; LLaMA expands coverage with a key |
| Category safety | Separate food, personal care and household contexts; `onion` ≠ `onion hair oil` |
| Catalog grounding | Model never decides product IDs, prices or quantities; backend resolves real catalog products and reports missing items |
| Recommendations | Purchase history, household settings, dietary preference, cart items, hour in India and user-provided festival; Groq rerank with fallback |
| Smart reorder | Previous purchase list ranked by time since order and purchase frequency |
| Zap Mode | Input → AI matches → **8-second cancellable countdown** → server-side verified COD order; pauses until address entered |
| Authentication | Real email/password registration and login, bcrypt hashes, signed 7-day JWT, user-owned orders and profiles |
| Checkout | Server-side prices and totals, inventory validation, idempotent duplicate-order protection, COD only |
| Order status | Authenticated Socket.io updates, a five-stage order timeline and demo status simulation |
| Voice input | Browser SpeechRecognition (Chrome, browser permitting) |
| PWA | Installable shell, precached build assets via Workbox (not a full offline checkout) |
| Tests + CI | Unit tests, integration smoke test, TypeScript builds, GitHub Actions |

## Run on Windows (PowerShell)

**Requirements:** Node.js 20.19+ (22 LTS recommended), npm, a modern browser. You do **not** need MongoDB or a Groq key for the first demo run.

1. Extract `instakart-fullstack.zip` and open the **instakart-fullstack** folder in VS Code.
2. Open a PowerShell terminal in that folder and enter:

   ```powershell
   Copy-Item backend/.env.example backend/.env
   npm install
   npm run dev
   ```

3. Open **http://localhost:5173** in Chrome or Edge.
4. Tap **Sign in → Explore with demo account**, or register a new account. The seeded demo is `demo@instakart.local` / `Demo@12345` (local mode only).
5. Open **AI Cart Builder**, type `pasta ka saman`, click **Generate cart**, add products, open Cart, enter a **fictional test address** of at least 8 characters, place COD order, then open My orders to watch status updates. For Zap, sign in first, enter an AI prompt and an address, and watch the 8-second countdown.
6. Stop both servers with `Ctrl + C`.

If PowerShell blocks `npm`, run the commands in the VS Code **Command Prompt** terminal, or use `npm.cmd` instead.

### Enable actual Groq / LLaMA

Get a server-side key from https://console.groq.com/keys. In `backend/.env`, set:

```env
GROQ_API_KEY=gsk_your_real_secret_here
GROQ_MODEL=llama-3.1-8b-instant
```

Restart the backend (`Ctrl+C`, then `npm run dev`). The AI Cart Builder now calls the real model. The AI-result label distinguishes `groq`, `demo` and `fallback` modes. API errors fall back to a deterministic interpreter, not a hidden mock result. Model names and availability can change; verify the current choices on Groq's console if a particular model is retired. **Never put the key in `frontend/`, `.env` files named `VITE_*`, browser code, or a public GitHub commit.**

### Enable real MongoDB persistence

Use a local `mongod` server or a MongoDB Atlas cluster. Edit `backend/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/instakart
# Or an Atlas URI (never commit credentials)
```

Restart the backend. If the product collection is empty, it automatically seeds all 384 demo products. Accounts and orders now persist in MongoDB instead of a local JSON file. With no `MONGO_URI`, local accounts/orders persist to the ignored `backend/.data/local-store.json`. **Switching between modes does not migrate users/orders.**

**For production:** set a long, random `JWT_SECRET`, `NODE_ENV=production`, a trustworthy `FRONTEND_URL` and MongoDB URI. Disable simulated deliveries for real deployments. Additional security and operational work is needed before accepting real customers. Without a JWT secret, the development server creates a new ephemeral one each startup.

### Commands

```powershell
npm run dev             # Vite :5173 + Express/Socket.io :3001
npm test                # Build backend and run unit + integration tests
npm run typecheck       # Typecheck both workspaces
npm run build           # Compile backend and build frontend PWA
npm run start           # Serve built app from Express (after npm run build)
```

**Health check:** http://localhost:3001/api/health tells you `catalogCount`, `dbMode`, `aiMode`, and notes delivery simulation.

## Architecture

```text
React 19 + TypeScript + Zustand (browser)
    |  HTTP (Vite /api proxy)                 | Socket.io authenticated JWT
    v                                         v
Express API + validation + rate limiting + Socket.io
    |-- /api/auth/*   → bcrypt registration, login, profiles, JWT
    |-- /api/products → ten-category demo catalog
    |-- /api/ai/build-cart
    |     ├─ Groq/LLaMA JSON ingredient extraction (or explicit demo fallback)
    |     └─ Context-aware synonym + product matcher → verified product IDs
    |-- /api/ai/search → lexical multi-strategy product retrieval
    |-- /api/ai/recommendations → heuristic ranking → optional Groq rerank
    |-- /api/ai/reorder → history-based replenishment priority
    └-- /api/orders → idempotent COD orders + simulated order events
                |
                ├─ MongoDB via Mongoose when MONGO_URI is configured
                └─ Local JSON persistence when MONGO_URI is empty
```

**Why this split matters:** The model interprets natural language but is *not* allowed to invent purchasable SKUs. Catalog retrieval is a deterministic backend step. The cart-builder path is **not traditional vector RAG** and the LLM does not autonomously call MongoDB tools. Optional recommendation reranking is retrieval-augmented by candidate product data.

## Useful API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Runtime mode/count |
| GET | `/api/categories` | Category metadata |
| GET | `/api/products?category=produce&limit=24` | Catalog browsing |
| GET | `/api/ai/search?q=onion%20hair%20oil` | Context-aware product search |
| POST | `/api/ai/build-cart` | Body: `{"query":"pasta ka saman"}` |
| POST | `/api/ai/recommendations` | Body: `{"cartIds":[]}`, Bearer optional |
| GET | `/api/ai/reorder` | Authenticated order history ranking |
| POST | `/api/auth/register` | Name/email/password |
| POST | `/api/auth/login` | Email/password |
| POST | `/api/auth/demo` | Local development only |
| GET/PATCH | `/api/auth/me` | Authenticated account and preferences |
| POST | `/api/orders` | Authenticated idempotent COD checkout |
| GET | `/api/orders` | Current user's orders |
| GET | `/api/orders/:id` | Protected order detail |
| POST | `/api/orders/:id/cancel` | Cancels within initial 8-second placed window |

## How to publish on GitHub

**Do not clone and reupload the linked author's repository while presenting it as original work.** This project uses independently written implementation and documents inspiration. Modify the features, inspect the code and describe your actual contribution accurately.

Once it runs on your PC and `npm test` / `npm run build` pass:

```powershell
# Run from the folder containing package.json (with "workspaces")
git init
git add .
git commit -m "feat: build AI-powered grocery app with auth and COD tracking"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/instakart-ai.git
git push -u origin main
```

Create the **empty** `instakart-ai` GitHub repository before `git remote add`. Replace `YOUR_USERNAME` with your GitHub username, authenticate via Git Credential Manager or GitHub CLI, and keep `.env` and `.data` untracked. Never commit your Groq key, MongoDB password, `node_modules` or local store containing account data. Add real screenshots from *your running application*, and a short demo video showing the LLM mode and the local order simulation.

## Interview / portfolio honesty

- Say **384 synthetic demo catalog listings**, not 384 actual retail SKUs.
- Say **9-minute delivery UI/target with simulated tracking**, not actual 9-minute fulfilment.
- Say **Groq LLaMA inference when configured**, not custom training or fine-tuning.
- Say **Hinglish intent understanding and catalog-grounded retrieval**, not a vector database or tool-calling agent.
- Do not claim that a target like `under 15 seconds` has been benchmarked until you test and record full round-trip timing on your own PC/API key.
- The current matcher scans a cached catalog; for large catalogs, add database indexes, dedicated candidate search and measured latency. Additional hardening: HTTPS, refresh tokens/cookie sessions, email verification, reserved inventory/transactions, audit logging, monitoring, true payment provider integration, and a real delivery backend.

## Limitations

- The sandbox that generated this source did not have npm registry network access, so **the full React/Express application could not be installed or browser-tested there**. Source transpilation and catalog-matching tests were checked; **run `npm install`, `npm test`, `npm run typecheck`, and `npm run build` on your machine** and address any environment-specific errors.
- Product visuals are emoji placeholders, not unauthorized scraped retailer photography. You can replace them with licensed product photos later.
- Voice input depends on browser permissions and API support.
- Order events are time-compressed demo transitions; restart during a transition stops the in-memory demo timer, although order records stay in the database.
- Do not use this demo for medical recommendations, real orders, or payment collection.
