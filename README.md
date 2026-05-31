# AI Study Planner

A full-stack web application for organizing study goals, plans, and tasks — enhanced with AI features for automatic task generation, document chat (RAG), and intelligent planning.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2 |
| Frontend | React 18, TypeScript, Vite, Mantine 7 |
| Database | PostgreSQL 16 |
| Container | Docker Compose |
| AI | Groq (llama-3.3-70b), ChromaDB |

## Quick Start

### 1. Environment Variables

Create a `.env` file in the root directory (next to `docker-compose.yml`):

```env
GROQ_API_KEY=your_groq_api_key_here
```

You can get a free Groq API key at https://console.groq.com

### 2. Run the project

```bash
docker compose up --build
```

On first boot, migrations run automatically and the database is seeded with sample data.

### 3. Access the app

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

### Seed credentials

| Field | Value |
|---|---|
| Username | admin |
| Password | admin123 |

---

## AI Features Implemented

### Story 1 — Task Generation with Structured Output

**Endpoint:** `POST /plans/{id}/generate-tasks`

Automatically generates study tasks from a plan's goal, hours per week, and due date using an LLM. Output is strictly structured JSON, validated with Pydantic, and persisted in the database.

**How it works:**
1. Fetches the plan from DB
2. Sends goal + constraints to Groq LLM
3. LLM responds with structured JSON
4. Tasks are validated and saved to DB

In the frontend, click **"Generate with AI"** inside any plan detail view.

---

### Story 2 — Document Chat (RAG)

**Endpoints:**
- `POST /plans/{id}/documents` — upload a PDF or text file
- `POST /plans/{id}/chat` — ask a question about uploaded documents

Users can upload documents associated with a study plan and ask questions about them. Documents are chunked, stored in ChromaDB (isolated per plan), and retrieved semantically to ground LLM answers.

**How it works:**
1. Document is uploaded and split into ~500 character chunks
2. Chunks are stored in a ChromaDB collection namespaced by plan ID
3. On question, top 3 relevant chunks are retrieved
4. LLM answers based only on retrieved context

In the frontend, use the **"Document Chat"** section at the bottom of any plan detail view.

---

### Story 3 — Planning Agent (Documented)

See [`docs/planning-agent-approach.md`](docs/planning-agent-approach.md) for the full architectural approach, tool design, agent loop, and trade-offs.

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/routers/     # FastAPI endpoints
│   │   ├── core/            # Config, DB, security
│   │   ├── models/          # SQLAlchemy models
│   │   ├── repositories/    # DB access layer
│   │   ├── schemas/         # Pydantic schemas
│   │   └── services/        # Business logic + AI services
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── api/             # API client
│       ├── components/      # Reusable components
│       └── pages/           # Page components
├── docs/
│   └── planning-agent-approach.md
├── docker-compose.yml
└── README.md
```

---

## Notes

- If port 8000 is already in use, change `"8000:8000"` to `"8001:8000"` in `docker-compose.yml`
- ChromaDB runs in-memory, so document uploads reset on container restart
- The Groq API key is free at https://console.groq.com with generous rate limits