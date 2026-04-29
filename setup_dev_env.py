"""
wellbeing-app — Development Environment Bootstrap
==================================================

Run this once to set up your local dev env.

USAGE
-----
    python setup_dev_env.py
    python setup_dev_env.py --zip path/to/wellbeing-app-v0.1.zip
    python setup_dev_env.py --dest C:\\Users\\Rotem\\projects
    python setup_dev_env.py --skip-frontend   # backend only
    python setup_dev_env.py --skip-backend    # frontend only

DEFAULTS
--------
    --zip     ./wellbeing-app-v0.1.zip   (next to this script)
    --dest    .                           (current working directory)

WHAT IT DOES
------------
    1. Verifies Python 3.11+ and Node 20+ are installed
    2. Extracts the zip into <dest>/wellbeing-app/
    3. Creates a Python virtualenv at wellbeing-app/backend/venv
    4. Installs backend deps (requirements.txt + requirements-dev.txt)
    5. Runs `npm install` inside wellbeing-app/frontend/
    6. Copies .env.example to .env if .env does not yet exist
    7. Prints next steps for PyCharm + running the app

SAFETY
------
    * Idempotent — safe to re-run.
    * Refuses to overwrite an existing .env (your values won't be lost).
    * Fails fast and loud on any prerequisite issue.
    * No external pip dependencies (stdlib only).

PLATFORM
--------
    Tested target: Windows 11 + PowerShell + Python 3.11+.
    Should work on macOS / Linux too. Path differences are handled.
"""

from __future__ import annotations

import argparse
import os
import platform
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PROJECT_DIR_NAME = "wellbeing-app"
DEFAULT_ZIP_NAME = "wellbeing-app-v0.4.zip"

MIN_PYTHON = (3, 11)
MIN_NODE = 20  # major version

IS_WINDOWS = platform.system() == "Windows"

# ---------------------------------------------------------------------------
# Console helpers
# ---------------------------------------------------------------------------

class _C:
    """Minimal ANSI colour codes. Disabled if stdout isn't a TTY or on old Windows."""

    if IS_WINDOWS or not sys.stdout.isatty():
        # Best-effort; modern Windows terminals support ANSI but old ones don't.
        # We try to enable VT mode on Windows 10+.
        try:
            import ctypes

            kernel32 = ctypes.windll.kernel32
            kernel32.SetConsoleMode(
                kernel32.GetStdHandle(-11), 7  # ENABLE_VIRTUAL_TERMINAL_PROCESSING
            )
            BLUE = "\033[94m"
            GREEN = "\033[92m"
            YELLOW = "\033[93m"
            RED = "\033[91m"
            BOLD = "\033[1m"
            DIM = "\033[2m"
            END = "\033[0m"
        except Exception:
            BLUE = GREEN = YELLOW = RED = BOLD = DIM = END = ""
    else:
        BLUE = "\033[94m"
        GREEN = "\033[92m"
        YELLOW = "\033[93m"
        RED = "\033[91m"
        BOLD = "\033[1m"
        DIM = "\033[2m"
        END = "\033[0m"


def info(msg: str) -> None:
    print(f"{_C.BLUE}>>{_C.END} {msg}")


def ok(msg: str) -> None:
    print(f"{_C.GREEN}OK{_C.END} {msg}")


def warn(msg: str) -> None:
    print(f"{_C.YELLOW}!!{_C.END} {msg}")


def die(msg: str, exit_code: int = 1) -> None:
    print(f"{_C.RED}ERROR{_C.END} {msg}", file=sys.stderr)
    sys.exit(exit_code)


def step_header(text: str) -> None:
    line = "=" * 70
    print()
    print(_C.BOLD + line + _C.END)
    print(_C.BOLD + f"  {text}" + _C.END)
    print(_C.BOLD + line + _C.END)


# ---------------------------------------------------------------------------
# Subprocess helpers
# ---------------------------------------------------------------------------

def run(
    cmd: list[str],
    cwd: Path | None = None,
    check: bool = True,
    capture: bool = False,
) -> subprocess.CompletedProcess:
    """
    Run a subprocess with sensible defaults.

    On Windows, subprocess.run with a list-cmd doesn't go through a shell —
    which is what we want, EXCEPT for `npm` which is `npm.cmd` on Windows.
    Callers should pass the resolved executable name (we resolve it below
    via shutil.which).
    """
    pretty = " ".join(cmd)
    print(f"{_C.DIM}  $ {pretty}{_C.END}")
    try:
        result = subprocess.run(
            cmd,
            cwd=str(cwd) if cwd else None,
            check=check,
            capture_output=capture,
            text=True,
        )
        return result
    except subprocess.CalledProcessError as e:
        if capture and e.stdout:
            print(e.stdout)
        if capture and e.stderr:
            print(e.stderr, file=sys.stderr)
        die(f"command failed (exit {e.returncode}): {pretty}")
        raise  # unreachable, satisfies type checkers


def which_or_die(name: str, hint: str = "") -> str:
    """Return absolute path to an executable on PATH, or die with a hint."""
    path = shutil.which(name)
    if not path:
        suffix = f" {hint}" if hint else ""
        die(f"'{name}' not found on PATH.{suffix}")
    return path


# ---------------------------------------------------------------------------
# Prerequisite checks
# ---------------------------------------------------------------------------

def check_python_version() -> None:
    if sys.version_info < MIN_PYTHON:
        die(
            f"Python {MIN_PYTHON[0]}.{MIN_PYTHON[1]}+ required, found "
            f"{sys.version_info.major}.{sys.version_info.minor}. "
            "Install from python.org and re-run."
        )
    ok(f"Python {sys.version.split()[0]}")


def check_node_version() -> None:
    node = which_or_die(
        "node",
        hint="Install Node.js LTS from https://nodejs.org/",
    )
    result = run([node, "--version"], capture=True)
    raw = result.stdout.strip().lstrip("v")
    try:
        major = int(raw.split(".")[0])
    except (ValueError, IndexError):
        die(f"could not parse node version output: {raw!r}")
        return  # unreachable
    if major < MIN_NODE:
        die(
            f"Node {MIN_NODE}+ required, found {raw}. "
            "Install Node.js LTS from https://nodejs.org/"
        )
    ok(f"Node v{raw}")


def check_npm_available() -> str:
    npm_name = "npm.cmd" if IS_WINDOWS else "npm"
    npm = which_or_die(
        npm_name,
        hint="npm should ship with Node. Reinstall Node from nodejs.org.",
    )
    ok(f"npm at {npm}")
    return npm


# ---------------------------------------------------------------------------
# Steps
# ---------------------------------------------------------------------------

def extract_zip(zip_path: Path, dest_dir: Path) -> Path:
    """
    Extract <zip_path> into <dest_dir>. Returns the path to wellbeing-app/.

    Idempotent: if wellbeing-app/ already exists, we DO NOT overwrite.
    The caller can delete it manually if a fresh extract is desired.
    """
    target = dest_dir / PROJECT_DIR_NAME

    if target.exists():
        warn(f"{target} already exists — skipping extraction.")
        warn("  (delete the folder if you want a fresh extract)")
        return target

    if not zip_path.exists():
        die(
            f"zip file not found: {zip_path}\n"
            f"  Place {DEFAULT_ZIP_NAME} next to this script, or use --zip <path>."
        )

    info(f"Extracting {zip_path.name} → {dest_dir}/")
    with zipfile.ZipFile(zip_path) as zf:
        # Sanity: ensure the zip top-level is wellbeing-app/
        names = zf.namelist()
        top_levels = {n.split("/")[0] for n in names if n}
        if PROJECT_DIR_NAME not in top_levels:
            die(
                f"zip does not contain a top-level '{PROJECT_DIR_NAME}/' directory. "
                f"Got: {sorted(top_levels)}"
            )
        zf.extractall(dest_dir)

    if not target.is_dir():
        die(f"expected {target} to exist after extract, but it doesn't.")

    ok(f"Extracted to {target}")
    return target


def make_venv(backend_dir: Path) -> Path:
    """
    Create a Python venv at backend/venv. Returns the path to the venv's python.
    Idempotent — if venv already exists, just returns its python path.
    """
    venv_dir = backend_dir / "venv"
    if IS_WINDOWS:
        venv_python = venv_dir / "Scripts" / "python.exe"
    else:
        venv_python = venv_dir / "bin" / "python"

    if venv_python.exists():
        ok(f"venv already exists at {venv_dir}")
        return venv_python

    info(f"Creating Python venv at {venv_dir}")
    run([sys.executable, "-m", "venv", str(venv_dir)])

    if not venv_python.exists():
        die(f"venv created but {venv_python} not found")

    ok(f"venv ready: {venv_python}")
    return venv_python


def install_backend_deps(venv_python: Path, backend_dir: Path) -> None:
    info("Upgrading pip in venv")
    run([str(venv_python), "-m", "pip", "install", "--upgrade", "pip"])

    info("Installing backend dependencies (requirements.txt)")
    run(
        [
            str(venv_python),
            "-m",
            "pip",
            "install",
            "-r",
            str(backend_dir / "requirements.txt"),
        ]
    )

    info("Installing backend dev dependencies (requirements-dev.txt)")
    run(
        [
            str(venv_python),
            "-m",
            "pip",
            "install",
            "-r",
            str(backend_dir / "requirements-dev.txt"),
        ]
    )

    ok("Backend dependencies installed")


def install_frontend_deps(npm_path: str, frontend_dir: Path) -> None:
    info(f"Running npm install in {frontend_dir}")
    info("  (this will take a minute — npm is downloading ~300MB of packages)")
    run([npm_path, "install"], cwd=frontend_dir)
    ok("Frontend dependencies installed")


def copy_env_file(project_root: Path) -> None:
    src = project_root / ".env.example"
    dst = project_root / ".env"
    if dst.exists():
        ok(f".env already exists — leaving it alone")
        return
    if not src.exists():
        warn(f"{src} not found — skipping .env creation")
        return
    shutil.copyfile(src, dst)
    ok(f"Copied .env.example → .env")
    warn(
        "  Default secrets are NOT safe for production. Edit .env and "
        "regenerate SECRET_KEY, JWT_SECRET_KEY, ANON_TOKEN_SALT, "
        "COMMENT_ENCRYPTION_KEY before any non-local deploy."
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Bootstrap the wellbeing-app development environment.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--zip",
        type=Path,
        default=Path(__file__).resolve().parent / DEFAULT_ZIP_NAME,
        help=f"path to the project zip (default: ./{DEFAULT_ZIP_NAME})",
    )
    parser.add_argument(
        "--dest",
        type=Path,
        default=Path.cwd(),
        help="parent directory to extract into (default: current dir)",
    )
    parser.add_argument(
        "--skip-backend",
        action="store_true",
        help="skip Python venv + pip install",
    )
    parser.add_argument(
        "--skip-frontend",
        action="store_true",
        help="skip npm install",
    )
    return parser.parse_args()


def print_next_steps(project_root: Path) -> None:
    backend = project_root / "backend"
    frontend = project_root / "frontend"

    if IS_WINDOWS:
        activate = backend / "venv" / "Scripts" / "Activate.ps1"
        run_backend = (
            f'cd "{backend}"; .\\venv\\Scripts\\Activate.ps1; '
            f'$env:WELLBEING_DEV_MODE="true"; python run.py'
        )
    else:
        activate = backend / "venv" / "bin" / "activate"
        run_backend = (
            f'cd "{backend}" && source venv/bin/activate && '
            f'WELLBEING_DEV_MODE=true python run.py'
        )

    print()
    step_header("DONE — Next steps")
    print(
        f"""
1. {_C.BOLD}Open the project in PyCharm{_C.END}:
   File → Open → select {_C.BLUE}{project_root}{_C.END}
   Settings → Project → Python Interpreter →
   set to {_C.BLUE}{backend / "venv" / ("Scripts/python.exe" if IS_WINDOWS else "bin/python")}{_C.END}
   Right-click {_C.BLUE}backend/{_C.END} → Mark Directory as → Sources Root

2. {_C.BOLD}Run the backend{_C.END} (Terminal 1):
   {_C.DIM}{run_backend}{_C.END}
   → http://127.0.0.1:5000/api/v1/health

3. {_C.BOLD}Run the frontend{_C.END} (Terminal 2):
   {_C.DIM}cd "{frontend}" && npm run dev{_C.END}
   → http://127.0.0.1:5173

4. {_C.BOLD}Read the project context{_C.END}:
   - {_C.BLUE}{project_root / "CLAUDE.md"}{_C.END} (project root context)
   - {_C.BLUE}{project_root / "HANDOFF.md"}{_C.END} (current sprint state)
   - {_C.BLUE}{project_root / "README.md"}{_C.END} (this content + more)

5. {_C.BOLD}Verify the test suite{_C.END} (optional):
   {_C.DIM}cd "{backend}" && {activate.parent / "pytest" if not IS_WINDOWS else "venv\\Scripts\\pytest.exe"}{_C.END}
"""
    )


def main() -> None:
    args = parse_args()

    step_header("wellbeing-app dev env bootstrap")
    info(f"Platform: {platform.system()} {platform.release()}")
    info(f"Working dir: {Path.cwd()}")
    info(f"Zip path: {args.zip}")
    info(f"Destination: {args.dest}")

    # ---- Prereqs ------------------------------------------------------------
    step_header("1/5  Checking prerequisites")
    check_python_version()
    if not args.skip_frontend:
        check_node_version()
        npm_path = check_npm_available()
    else:
        npm_path = ""

    # ---- Extract ------------------------------------------------------------
    step_header("2/5  Extracting project")
    args.dest.mkdir(parents=True, exist_ok=True)
    project_root = extract_zip(args.zip, args.dest)
    backend_dir = project_root / "backend"
    frontend_dir = project_root / "frontend"

    # ---- Backend ------------------------------------------------------------
    if args.skip_backend:
        warn("Skipping backend setup (--skip-backend)")
    else:
        step_header("3/5  Setting up backend (Python venv + pip)")
        if not backend_dir.is_dir():
            die(f"backend directory not found: {backend_dir}")
        venv_python = make_venv(backend_dir)
        install_backend_deps(venv_python, backend_dir)

    # ---- Frontend -----------------------------------------------------------
    if args.skip_frontend:
        warn("Skipping frontend setup (--skip-frontend)")
    else:
        step_header("4/5  Setting up frontend (npm install)")
        if not frontend_dir.is_dir():
            die(f"frontend directory not found: {frontend_dir}")
        install_frontend_deps(npm_path, frontend_dir)

    # ---- .env ---------------------------------------------------------------
    step_header("5/5  Configuring environment (.env)")
    copy_env_file(project_root)

    # ---- Done ---------------------------------------------------------------
    print_next_steps(project_root)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        die("Interrupted by user.", exit_code=130)
