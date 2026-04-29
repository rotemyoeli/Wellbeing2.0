"""
Shared pytest fixtures.

Two app fixtures:
    `app`           - testing config; DEV_MODE off; real auth path exercised.
    `dev_mode_app`  - testing config + DEV_MODE on; auth bypassed.

Most endpoint tests use `dev_mode_client` since real auth is Sprint 3.
"""

from __future__ import annotations

import os

import pytest

from app import create_app
from app.extensions import db as _db
from app.models.user import User


@pytest.fixture
def app():
    """Flask app with testing config and DEV_MODE OFF."""
    # Make sure no leftover env var enables DEV_MODE during this fixture
    os.environ.pop("WELLBEING_DEV_MODE", None)
    app = create_app("testing")
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def dev_mode_app():
    """Flask app with testing config + DEV_MODE forced ON, with synthetic user seeded."""
    app = create_app("testing")
    # TestingConfig hard-codes DEV_MODE_ENABLED=False; override for this fixture.
    app.config["DEV_MODE_ENABLED"] = True
    with app.app_context():
        _db.create_all()
        # Seed the synthetic dev-mode user manually since the seed in
        # create_app() ran before we toggled DEV_MODE_ENABLED to True.
        from app.middleware.dev_mode import DEV_MODE_USER_ID

        if _db.session.get(User, DEV_MODE_USER_ID) is None:
            _db.session.add(
                User(
                    user_id=DEV_MODE_USER_ID,
                    display_name="DEV_MODE Admin",
                    role="admin",
                    is_active=True,
                )
            )
            _db.session.commit()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    """Test client for the standard (auth-required) app."""
    return app.test_client()


@pytest.fixture
def dev_mode_client(dev_mode_app):
    """Test client for the DEV_MODE app — auth bypassed."""
    return dev_mode_app.test_client()


@pytest.fixture
def db(app):
    """DB session bound to the standard app."""
    return _db


@pytest.fixture
def seed_user(app):
    """Insert a basic user and return it."""
    user = User(
        user_id="11111111-1111-1111-1111-111111111111",
        display_name="Test User",
        role="employee",
        is_active=True,
    )
    _db.session.add(user)
    _db.session.commit()
    return user
