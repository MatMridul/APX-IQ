"""
Element-level UI inspection — screenshots a single component (by
data-testid) at 2x scale so fine details are actually reviewable.

Usage:
    python scripts/ui_element_shot.py <route> <testid> [name]

Example:
    python scripts/ui_element_shot.py /dashboard wheel-cluster wheel
"""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"


def main() -> int:
    route = sys.argv[1] if len(sys.argv) > 1 else "/dashboard"
    testid = sys.argv[2] if len(sys.argv) > 2 else "wheel-cluster"
    name = sys.argv[3] if len(sys.argv) > 3 else testid

    out = Path.cwd() / "ui-gallery" / "elements"
    out.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=2,  # 2x detail for component review
        )
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)[:200]))

        page.goto(BASE + route, wait_until="networkidle", timeout=90_000)
        page.wait_for_timeout(5000)

        el = page.locator(f'[data-testid="{testid}"]')
        if el.count() == 0:
            print(f"[fail] no element with data-testid={testid!r} on {route}")
            return 1

        shot = out / f"{name}.png"
        el.screenshot(path=str(shot))
        print(f"[ok] {route} #{testid} -> {shot}")
        for e in errors:
            print("  [pageerror]", e)
        browser.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
