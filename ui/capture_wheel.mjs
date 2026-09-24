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
  // Click DRS button to activate aerodynamic halo
  const drsBtn = wheel.locator("text=DRS");
  await drsBtn.click();
  await page.waitForTimeout(500);

  // Screenshot 1: RACE Mode with new paddles & DRS halo
  await wheel.screenshot({ path: "screenshot_wheel_focused.png" });
  console.log("Saved screenshot_wheel_focused.png");

  // Click MFD to switch to QUALY mode
  const mfdRotary = wheel.locator("text=MFD");
  await mfdRotary.click();
  await page.waitForTimeout(300);
  await wheel.screenshot({ path: "screenshot_wheel_qualy.png" });
  console.log("Saved screenshot_wheel_qualy.png");

  // Click MFD to switch to TYRES mode
  await mfdRotary.click();
  await page.waitForTimeout(300);
  await wheel.screenshot({ path: "screenshot_wheel_tyres.png" });
  console.log("Saved screenshot_wheel_tyres.png");

  // Click MFD to switch to CHASSIS mode
  await mfdRotary.click();
  await page.waitForTimeout(300);
  await wheel.screenshot({ path: "screenshot_wheel_chassis.png" });
  console.log("Saved screenshot_wheel_chassis.png");

  // Click PL to test Pit Limiter overlay
  const plBtn = wheel.locator("text=PL");
  await plBtn.click();
  await page.waitForTimeout(300);
  await wheel.screenshot({ path: "screenshot_wheel_pitlimiter.png" });
  console.log("Saved screenshot_wheel_pitlimiter.png");

  await browser.close();
}

main().catch(console.error);
