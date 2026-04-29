"""
Backend entry point.

Usage:
    python run.py

Reads configuration from .env (in project root) via python-dotenv,
which is loaded inside `app.config`.
"""

from app import create_app

# Flask app instance — exported so `flask` CLI can also discover it
# (e.g., `flask db migrate`, `flask shell`).
app = create_app()


if __name__ == "__main__":
    # Note: the dev server below is for local development only.
    # In production, gunicorn (or the platform's runtime) loads the `app`
    # symbol directly. See README.md.
    host = app.config.get("HOST", "127.0.0.1")
    port = int(app.config.get("PORT", 5000))
    debug = app.config.get("DEBUG", False)

    app.run(host=host, port=port, debug=debug)
