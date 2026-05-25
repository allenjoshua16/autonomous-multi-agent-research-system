# Autonomous Multi-agent Research System

A React and TypeScript prototype for AI agents that collaborate with RAG retrieval, shared memory, tool-calling traces, and decision synthesis to automate research and analysis workflows.

## Features

- Multi-agent team controls for retrieval, analysis, risk review, and strategy.
- Local RAG simulation over a typed knowledge corpus.
- Shared memory entries for goals, source context, and decision confidence.
- Tool-call audit trail for vector search, ROI scoring, risk checks, and decision writing.
- Decision brief with confidence score, agent findings, recommendation logic, and recent run history.
- Responsive operational dashboard built with React, TypeScript, Vite, and lucide-react.

## Project Structure

- `src/App.tsx` contains the research console UI and interactive workflow state.
- `src/lib/researchSystem.ts` contains the deterministic agent orchestration, retrieval, memory, tools, and recommendation logic.
- `src/lib/researchSystem.test.ts` covers the core workflow generation behavior.
- `src/App.css` and `src/index.css` define the responsive interface system.

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
