import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" });
  const wheel = page.locator("[data-testid='wheel-cluster']");
  
  // Click BB+ twice
  const bbPlus = wheel.locator("text=BB+");
  await bbPlus.click();
  await page.waitForTimeout(200);
  await bbPlus.click();
  await page.waitForTimeout(200);

  // Click DRS button
  const drsBtn = wheel.locator("text=DRS");
  await drsBtn.click();
  await page.waitForTimeout(300);
  await wheel.screenshot({ path: "screenshot_wheel_focused.png" });
  console.log("Saved screenshot_wheel_focused.png after click interactions");
  await browser.close();
}

main().catch(console.error);
