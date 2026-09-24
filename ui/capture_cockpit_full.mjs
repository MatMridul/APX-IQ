import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Take full dashboard screenshot
  await page.screenshot({ path: "screenshot_dashboard_full.png" });
  console.log("Saved screenshot_dashboard_full.png");

  // Take screenshot of center section (wheel + ribbon)
  const centerRegion = page.locator(".bg-carbon-twill");
  if (await centerRegion.count() > 0) {
    await centerRegion.screenshot({ path: "screenshot_dashboard_canvas.png" });
    console.log("Saved screenshot_dashboard_canvas.png");
  }

  await browser.close();
}

main().catch(console.error);
