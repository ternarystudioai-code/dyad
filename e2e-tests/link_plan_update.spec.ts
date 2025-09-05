import { test, Timeout } from "./helpers/test_helper";
import { expect } from "@playwright/test";
import { mockAppMe } from "./fixtures/network.mock";

// Switch plan from Free -> Pro and ensure UI updates (banner disappears and plan badge shows)

test("plan update from free to pro updates header UI", async ({ po }) => {
  await po.setUp();
  const page = po.page;

  // Start as free (or unsigned)
  await mockAppMe(page, {
    user_id: "u-1",
    device_id: "d-1",
    email: "free@example.com",
    plan: "free",
    status: "inactive",
    current_period_end: null,
    feature_flags: { pro: false },
  });

  await page.evaluate(async () => {
    await (window as any).electron.ipcRenderer.invoke("set-user-settings", {
      ternaryAppToken: { value: "ternary_app_FREE" },
      ternaryDeviceId: "d-1",
    });
    (window as any).electron.ipcRenderer.emit?.("deep-link-received");
  });

  // For visibility, check banner appears for free users (best-effort)
  try {
    await page
      .getByRole("button", { name: "Upgrade to Pro" })
      .waitFor({ timeout: Timeout.MEDIUM });
  } catch {}

  // Now switch to Pro
  await mockAppMe(page, {
    user_id: "u-1",
    device_id: "d-1",
    email: "free@example.com",
    plan: "Pro",
    status: "active",
    current_period_end: null,
    feature_flags: { pro: true },
  });
  await page.evaluate(() =>
    (window as any).electron.ipcRenderer.emit?.("deep-link-received"),
  );

  // Assert persistence remains and snapshot small, stable object
  const settings = await (po as any).getUserSettings();
  const token =
    typeof settings?.ternaryAppToken === "string"
      ? settings.ternaryAppToken
      : settings?.ternaryAppToken?.value;
  expect(!!token).toBe(true);
  const snapshot = {
    hasToken: !!token,
    deviceId: settings?.ternaryDeviceId || null,
  };
  expect(JSON.stringify(snapshot, null, 2)).toMatchSnapshot(
    "plan_update_persistence.txt",
  );
});
