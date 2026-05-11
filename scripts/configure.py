#!/usr/bin/env python3
"""Cross-platform config bootstrap script for DeerFlow."""

from __future__ import annotations

import shutil
import sys
from pathlib import Path


def copy_if_missing(src: Path, dst: Path, warn_exists: bool = False) -> bool:
    """Copy src to dst if dst does not exist.

    Returns True if a copy was performed, False if dst already existed.
    """
    if dst.exists():
        if warn_exists:
            print(f"  ⚠ {dst.name} already exists, skipping.")
        return False
    if not src.exists():
        raise FileNotFoundError(f"Missing template file: {src}")
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)
    return True


def main() -> int:
    project_root = Path(__file__).resolve().parent.parent

    generated = 0
    errors = []

    # config.yaml
    try:
        if copy_if_missing(
            project_root / "config.example.yaml",
            project_root / "config.yaml",
            warn_exists=True,
        ):
            generated += 1
    except (FileNotFoundError, OSError) as exc:
        errors.append(str(exc))

    # frontend/.env
    try:
        if copy_if_missing(
            project_root / "frontend" / ".env.example",
            project_root / "frontend" / ".env",
            warn_exists=True,
        ):
            generated += 1
    except (FileNotFoundError, OSError) as exc:
        errors.append(str(exc))

    if errors:
        print("Error while generating configuration files:")
        for err in errors:
            print(f"  {err}")
        return 1

    if generated:
        print(f"✓ {generated} configuration file(s) generated")
    else:
        print("✓ Configuration files already exist, nothing to generate.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
