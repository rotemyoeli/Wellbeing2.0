# wellbeing-app

> Employee well-being pulse-check web app for medical ward staff.
> Pilot site: Internal Medicine Ward B, Soroka University Medical Center.
> Owner: Machava Association.

This is the developer README. For project context, decisions, and conventions read **`CLAUDE.md`** first.

---

## Quick start

### Prerequisites

- **Python 3.11+**
- **Node.js 20+** (LTS recommended)
- **Git**
- (Optional) **Docker Desktop** if you want PostgreSQL locally for RLS testing

### Bootstrap (one command)

If you received `wellbeing-app-v0.1.zip` and `setup_dev_env.py` together:

```powershell
# Place both files in the directory where you want the project to live
# e.g., C:\Users\Rotem\projects\

cd C:\Users\Rotem\projects\
python setup_dev_env.py
```

The script will:

1. Verify your Python and Node versions
2. Extract the zip into `wellbeing-app/`
3. Create a Python virtualenv at `wellbeing-app/backend/venv`
4. Install backend dependencies
5. Install frontend dependencies (npm)
6. Copy `.env.example` to `.env` if not already present
7. Print next steps

It is idempotent — safe to re-run.

### Manual setup (if the bootstrap script fails)

```powershell
# 1. Extract the zip
Expand-Archive wellbeing-app-v0.1.zip .

cd wellbeing-app

# 2. Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -r requirements-dev.txt
copy ..\.env.example ..\.env
cd ..

# 3. Frontend
cd frontend
npm install
cd ..
```

---

## Run the app

You'll need two terminals.

### Terminal 1 — Backend

```powershell
cd wellbeing-app\backend
.\venv\Scripts\Activate.ps1
$env:WELLBEING_DEV_MODE="true"
python run.py
```

Open http://127.0.0.1:5000/api/v1/health — you should see:

```json
{ "status": "ok", "version": "0.1.0", "dev_mode": true }
```

### Terminal 2 — Frontend

```powershell
cd wellbeing-app\frontend
npm run dev
```

Open http://127.0.0.1:5173 — you should see the Battery Check-in screen.

---

## PyCharm setup

1. Open `wellbeing-app/` as the project root (not `backend/` alone — you want the docs visible).
2. **Settings → Project → Python Interpreter:** set to `wellbeing-app/backend/venv/Scripts/python.exe`.
3. **Right-click `backend/`** → Mark Directory as → Sources Root.
4. **Right-click `backend/tests/`** → Mark Directory as → Test Sources Root.
5. **Run/Debug Configurations:**
   - New → Python → Script path: `wellbeing-app/backend/run.py`
   - Working directory: `wellbeing-app/backend`
   - Environment variables: `WELLBEING_DEV_MODE=true;FLASK_ENV=development`
6. For the frontend, use PyCharm's built-in Terminal pane and run `npm run dev` — or open `frontend/` in a separate IDE window.

---

## Project structure (high level)

```
wellbeing-app/
├── CLAUDE.md           ← project context, conventions, gotchas
├── HANDOFF.md          ← current sprint status
├── README.md           ← this file
├── docs/               ← strategy, technical, project docs
├── backend/            ← Flask app
└── frontend/           ← React + Vite + TS PWA
```

Full structure documented in `CLAUDE.md`.

---

## Environment variables

See `.env.example` for the full list with comments. The most important:

| Variable | Required | Default | Notes |
|---|---|---|---|
| `WELLBEING_DEV_MODE` | No | `false` | If `true`, bypass auth and grant admin role. **MUST be `false` in production.** |
| `FLASK_ENV` | No | `development` | `development` / `testing` / `production` |
| `DATABASE_URL` | No | `sqlite:///dev.db` | SQLite for dev; PostgreSQL connection string for prod |
| `JWT_SECRET_KEY` | **Yes for prod** | (random in dev) | 256-bit random string |
| `ANON_TOKEN_SALT` | **Yes** | (default in dev only) | The salt for the anonymity hash. **Rotate periodically per Spec v2 §8.** |
| `CORS_ORIGINS` | No | `http://127.0.0.1:5173,http://localhost:5173` | Comma-separated origins for production |

---

## Testing

### Backend

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pytest
```

Coverage target per Spec v2 §18: ≥60% for unit tests. Currently we have one smoke test.

### Frontend

```powershell
cd frontend
npm test
```

(Vitest config exists; no tests yet — Sprint 2.)

---

## Common pitfalls on Windows

1. **PowerShell execution policy may block `Activate.ps1`.** Run as admin once: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`.
2. **`bcrypt` install errors** on Windows usually mean missing build tools. Install Microsoft C++ Build Tools or use a wheel-only install: `pip install --only-binary :all: bcrypt`.
3. **Long path errors** during `npm install`. Enable long paths in Windows: `git config --system core.longpaths true` (run PowerShell as admin first).
4. **Port already in use.** Backend defaults to 5000; frontend to 5173. If conflicts, change with env vars (see `.env.example`).

---

## Where to ask things

- **Project context, conventions:** `CLAUDE.md`
- **Current sprint status:** `HANDOFF.md`
- **Why we picked this stack:** `docs/04_technical/01_ADR_Stack_Decision.md`
- **Open organisational questions:** `docs/07_project/01_Open_Questions_Log.md`
- **Competitive context, positioning:** `docs/01_strategy/`
- **Original spec:** `docs/00_existing/Wellbeing_Spec_v2_EN.docx` (provided separately)

---

## License

To be determined. Not yet open-source. Internal Machava Association project until further notice.
