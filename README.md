# Autonomous Multi-agent Research System

A React and TypeScript prototype for AI agents that collaborate with RAG retrieval, shared memory, tool-calling traces, and decision synthesis to automate research and analysis workflows.

## Features

- Multi-agent team controls for retrieval, analysis, risk review, and strategy.
- Local RAG simulation over a typed knowledge corpus.
- Shared memory entries for goals, source context, and decision confidence.
- Tool-call audit trail for vector search, ROI scoring, risk checks, and decision writing.
- Decision brief with confidence score, agent findings, recommendation logic, and recent run history.
- Optional OpenAI-backed research endpoint for real LLM-generated agent reasoning.
- Responsive operational dashboard built with React, TypeScript, Vite, and lucide-react.

## Project Structure

- `src/App.tsx` contains the research console UI and interactive workflow state.
- `src/lib/researchSystem.ts` contains the deterministic agent orchestration, retrieval, memory, tools, and recommendation logic.
- `src/lib/researchSystem.test.ts` covers the core workflow generation behavior.
- `api/research.ts` contains the secure server-side OpenAI Responses API integration.
- `src/App.css` and `src/index.css` define the responsive interface system.

## OpenAI Setup

The app works without an API key by using the local simulation fallback. To enable real LLM reasoning:

1. Copy `.env.example` to `.env`.
2. Set `OPENAI_API_KEY` to your OpenAI API key.
3. Optionally change `OPENAI_MODEL`.
4. Run `npm run dev`.

The React app calls `/api/research`. The Vite dev server handles that endpoint locally, and Vercel can run `api/research.ts` as a serverless function after deployment.

## Development

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

The development server starts with Vite. By default, it is available at `http://localhost:5173`.

## Next Steps

- Replace the local sample corpus with a vector database-backed RAG index.
- Connect tool calls to real services behind scoped permissions and audit logging.
- Persist memory with provenance, expiry, and user/workspace boundaries.
- Add model-backed agent execution with structured response validation.
