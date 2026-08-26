"""Stress the canvas mount/unmount path (IndexSizeError regression test)."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1920, "height": 1080})
    errors: list[str] = []
    pg.on("pageerror", lambda e: errors.append(str(e)[:160]))
    pg.on(
        "console",
        lambda m: errors.append(m.text[:160]) if m.type == "error" and "radius" in m.text.lower() else None,
    )

    # Cycle: dashboard -> home -> dashboard -> intelligence -> dashboard
    for route in ("/dashboard", "/", "/dashboard", "/dashboard/intelligence", "/dashboard"):
        pg.goto("http://localhost:3000" + route, wait_until="networkidle", timeout=90_000)
        pg.wait_for_timeout(1200)
        # viewport resize mid-mount (triggers zero-box frames)
        pg.set_viewport_size({"width": 1400, "height": 900})
        pg.wait_for_timeout(400)
        pg.set_viewport_size({"width": 1920, "height": 1080})
        pg.wait_for_timeout(400)

    radius_errors = [e for e in errors if "radius" in e.lower()]
    print("radius errors:", len(radius_errors))
    for e in radius_errors[:5]:
        print("  ", e)
    print("other page errors:", len([e for e in errors if "radius" not in e.lower()]))
    b.close()
