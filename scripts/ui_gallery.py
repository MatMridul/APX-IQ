"""
APX IQ — UI review gallery generator.

Captures every route (full page) into a timestamped folder for
design review. Compare against the frozen baseline:

    git checkout ui/legacy-baseline   # baseline UI
    python scripts/ui_gallery.py      # capture "before"
    git checkout main                 # current UI
    python scripts/ui_gallery.py      # capture "after"

Requires: pip install playwright && playwright install chromium
Requires: dev server on :3000 (npm run dev in ui/)
"""

import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
ROUTES = [
    ("home", "/"),
    ("dashboard", "/dashboard"),
    ("intelligence", "/dashboard/intelligence"),
    ("debug", "/debug"),
]


def main() -> int:
    label = sys.argv[1] if len(sys.argv) > 1 else time.strftime("%Y%m%d-%H%M%S")
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path.cwd() / "ui-gallery" / label
    out.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)[:200]))

        for name, route in ROUTES:
            page.goto(BASE + route, wait_until="networkidle", timeout=90_000)
            page.wait_for_timeout(5000)
            shot = out / f"{name}.png"
            page.screenshot(path=str(shot), full_page=(name == "home"))
            print(f"[ok] {name} -> {shot}")

        browser.close()

    if errors:
        print("[pageerrors]")
        for e in errors:
            print("  ", e)
    print(f"Gallery: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
