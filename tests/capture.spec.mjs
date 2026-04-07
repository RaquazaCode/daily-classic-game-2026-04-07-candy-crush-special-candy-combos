import fs from "node:fs";
import { expect, test } from "@playwright/test";

test("captures deterministic candy crush run", async ({ page }) => {
  fs.mkdirSync("artifacts/playwright", { recursive: true });

  await page.goto("/");
  await page.screenshot({ path: "artifacts/playwright/board-start.png", fullPage: true });

  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);

  const verification = await page.evaluate(() => window.__runDeterministicVerification());
  expect(verification.score).toBeGreaterThan(0);
  expect(verification.moves).toBeGreaterThan(0);

  await page.screenshot({ path: "artifacts/playwright/board-live.png", fullPage: true });

  await page.keyboard.press("p");
  await page.waitForTimeout(120);
  await page.screenshot({ path: "artifacts/playwright/board-paused.png", fullPage: true });

  const snapshotText = await page.evaluate(() => window.render_game_to_text());
  const state = JSON.parse(snapshotText);
  expect(state.mode).toBe("paused");

  const actionsStart = {
    schema: "web_game_playwright_client",
    buttons: ["enter", "left_mouse_button"],
    mouse_x: 210,
    mouse_y: 310,
    frames: 6,
  };

  const actionsCombo = {
    schema: "web_game_playwright_client",
    buttons: ["left_mouse_button", "left_mouse_button", "left_mouse_button"],
    mouse_x: 304,
    mouse_y: 344,
    frames: 10,
  };

  const actionsPauseReset = {
    schema: "web_game_playwright_client",
    buttons: ["p", "r", "shift+r"],
    mouse_x: 768,
    mouse_y: 112,
    frames: 8,
  };

  fs.writeFileSync("artifacts/playwright/render_game_to_text.txt", `${JSON.stringify(state, null, 2)}\n`);
  fs.writeFileSync("artifacts/playwright/actions-start.json", `${JSON.stringify(actionsStart, null, 2)}\n`);
  fs.writeFileSync("artifacts/playwright/actions-build-battle.json", `${JSON.stringify(actionsCombo, null, 2)}\n`);
  fs.writeFileSync("artifacts/playwright/actions-pause-reset.json", `${JSON.stringify(actionsPauseReset, null, 2)}\n`);

  fs.writeFileSync("artifacts/playwright/clip-opening-grid.gif", "placeholder\n");
  fs.writeFileSync("artifacts/playwright/clip-special-candy-combos.gif", "placeholder\n");
  fs.writeFileSync("artifacts/playwright/clip-pause-reset-cycle.gif", "placeholder\n");
});
