# Umpire Assignment

A full-stack web application for managing umpire availability and game assignments, with a companion MCP server for AI-agent access.

---

## Architecture

```
+---------------------+     HTTP/REST     +----------------------+
|   React Frontend    | <---------------> |  FastAPI Backend     |
|  (Vite + TypeScript)|                   |  (Python 3.11)       |
|   Port 3000         |                   |  Port 8000           |
+---------------------+                   +-----------+----------+
                                                       | SQLAlchemy
                                           +-----------v----------+
                                           |   PostgreSQL 16      |
                                           |   Port 5432          |
                                           +----------------------+

+---------------------+     HTTP/REST
|   MCP Server        | <---------------> FastAPI Backend
|  (TypeScript/stdio) |
+---------------------+
```

---

## Project Structure

```
umpire-assignment/
├── backend/                  # FastAPI Python app
│   ├── app/
│   │   ├── main.py           # App entry point + CORS + lifespan
│   │   ├── config.py         # Settings (pydantic-settings)
│   │   ├── models.py         # SQLAlchemy ORM models
│   │   ├── database.py       # DB engine + session
│   │   ├── auth.py           # JWT auth helpers
│   │   ├── email_service.py  # SMTP email sending
│   │   ├── scheduler.py      # APScheduler background tasks
│   │   └── routers/
│   │       ├── auth.py       # POST /auth/register, /auth/login, /auth/me
│   │       ├── availability.py
│   │       ├── preferences.py
│   │       ├── games.py
│   │       ├── assignments.py
│   │       └── umpires.py
│   ├── migrations/           # Alembic database migrations
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                 # React + Vite + TypeScript
│   ├── src/
│   │   ├── api/index.ts
│   │   ├── context/AuthContext.tsx
│   │   ├── components/ProtectedRoute.tsx
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       ├── RegisterPage.tsx
│   │       ├── UmpireDashboard.tsx
│   │       ├── AvailabilityTab.tsx
│   │       ├── PreferencesTab.tsx
│   │       ├── AssignmentsTab.tsx
│   │       ├── AdminDashboard.tsx
│   │       ├── AdminGamesTab.tsx
│   │       └── AdminUmpiresTab.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env.example
│
├── mcp-server/               # MCP server (TypeScript)
│   ├── src/index.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Local Development Setup

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Node.js 20+ (for frontend and MCP server dev)
- Python 3.11+ (for backend dev)

### Quick Start with Docker Compose

```bash
# 1. Copy environment files
cp .env.example .env

# 2. (Optional) Edit .env with your SMTP config and iCal feed URL

# 3. Start all services
docker compose up --build

# 4. Open the app
open http://localhost:3000
```

The backend API docs are at http://localhost:8000/docs

### Local Backend Development

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and edit env
cp .env.example .env

# Run migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload
```

### Local Frontend Development

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173

### Creating the First Admin User

Register a user normally, then promote them via SQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://umpire:umpire@localhost:5432/umpire_db` | PostgreSQL connection string |
| `SECRET_KEY` | `changeme-secret-key` | JWT signing secret — change in production |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` | Token expiry (7 days) |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USERNAME` | *(empty)* | SMTP username; if empty, emails print to stdout |
| `SMTP_PASSWORD` | *(empty)* | SMTP password |
| `SMTP_FROM` | `noreply@umpire.local` | From address |
| `ICAL_FEED_URL` | *(empty)* | External iCal feed URL for game import |
| `APP_BASE_URL` | `http://localhost:3000` | Frontend URL (used in email links) |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend API base URL |

---

## API Reference

Full interactive docs at http://localhost:8000/docs

### Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register a new umpire |
| POST | `/auth/login` | Login (returns JWT) |
| GET | `/auth/me` | Get current user |

### Availability

| Method | Path | Description |
|---|---|---|
| GET | `/availability` | List slots (`?user_id=&month=YYYY-MM`) |
| POST | `/availability` | Create a slot |
| DELETE | `/availability/{slot_id}` | Delete a slot |

### Division Preferences

| Method | Path | Description |
|---|---|---|
| GET | `/preferences` | Get current user's preferences |
| PUT | `/preferences` | Set preferences `{"divisions": ["rookies"]}` |

### Games (Admin Only)

| Method | Path | Description |
|---|---|---|
| GET | `/games` | List games (`?month=YYYY-MM`) |
| POST | `/games/sync` | Re-import games from iCal feed |
| GET | `/games/{id}/eligible-umpires` | Eligible umpires for a game |

### Assignments

| Method | Path | Description |
|---|---|---|
| POST | `/assignments` | Assign umpire to game (admin; sends email) |
| GET | `/assignments` | List assignments |
| PATCH | `/assignments/{id}` | Accept or decline `{"action": "accept"}` |
| POST | `/assignments/respond-by-token` | Accept/decline via email link token |
| GET | `/assignments/{id}/ical` | Download .ics file (accepted only) |

### Umpires (Admin Only)

| Method | Path | Description |
|---|---|---|
| GET | `/umpires` | List all umpires with preferences |

---

## Division Selection Logic

Three divisions: **Rookies**, **Int I**, **Int II**.

Auto-select rules (enforced client-side in the Divisions tab):

- Selecting **Int II** => selects Int I and Rookies
- Selecting **Int I** => selects Rookies (and vice versa — they are always paired)
- Deselecting **Int I** => deselects Rookies and Int II
- Deselecting **Rookies** => deselects Int I and Int II
- Deselecting **Int II** => deselects only Int II

When the admin assigns a game, eligible umpires must:
1. Have an availability slot on the game's date covering the game start time
2. Have the game's division in their preferences

---

## Assignment Workflow

1. Admin syncs the iCal feed — games appear on the admin calendar
2. Admin clicks a game — sees eligible umpires — assigns one
3. Umpire receives an email with Accept / Decline links
4. Umpire can also respond in-app under the Assignments tab
5. If the umpire declines, the admin is notified immediately by email
6. If no response within 24 hours, assignment becomes `expired` and admin is notified (background task runs hourly)
7. Once accepted, the umpire can download a .ics calendar file

---

## MCP Server

The MCP server exposes the backend API as tools for AI agents (Claude, GPT-4, etc.) using the Model Context Protocol.

### Setup

```bash
cd mcp-server
npm install
npm run build
cp .env.example .env
# Edit .env: set UMPIRE_API_URL, UMPIRE_ADMIN_EMAIL, UMPIRE_ADMIN_PASSWORD
```

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "umpire-assignment": {
      "command": "node",
      "args": ["/path/to/umpire-assignment/mcp-server/dist/index.js"],
      "env": {
        "UMPIRE_API_URL": "http://localhost:8000",
        "UMPIRE_ADMIN_EMAIL": "admin@example.com",
        "UMPIRE_ADMIN_PASSWORD": "yourpassword"
      }
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|---|---|
| `get_umpire_availability` | Get availability slots for a user |
| `set_availability` | Add an availability slot |
| `get_division_preferences` | Get current user's division preferences |
| `set_division_preferences` | Set division preferences |
| `list_games` | List imported games |
| `get_eligible_umpires` | Get eligible umpires for a game |
| `assign_game` | Assign umpire to game |
| `list_assignments` | List assignments |
| `respond_to_assignment` | Accept or decline an assignment |
| `list_umpires` | List all umpires with preferences |
| `sync_games` | Trigger iCal feed re-sync |
