"""
Shared Flask extension instances + engine event listeners.

The SQLite FK pragma listener is critical: SQLite ships with foreign-key
enforcement OFF by default. Without this listener, dev environments would
silently allow rows that violate referential integrity — and Sprint 2's
test suite would not have caught the DEV_MODE synthetic-user FK gap.
"""

from sqlalchemy import event
from sqlalchemy.engine import Engine

from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cors = CORS()


@event.listens_for(Engine, "connect")
def _set_sqlite_pragmas(dbapi_connection, connection_record):
    """
    Enable foreign-key enforcement and other safety pragmas on SQLite.
    No-op for non-SQLite engines (PostgreSQL enforces FKs by default).
    """
    # Cheap duck-typed dialect detection — sqlite3 connections have an
    # `execute` method that accepts PRAGMA statements directly.
    cls_name = dbapi_connection.__class__.__module__
    if "sqlite" not in cls_name:
        return

    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON")
    finally:
        cursor.close()
