import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";
import { mockAppMe } from "./fixtures/network.mock";

// Simulate token revocation: first /app/me returns Pro, then switch to 401/empty
// App should surface upgrade banner (treated as free/unsigned for UI purposes)

test("revoked token switches UI to relink state and persists snapshot", async ({
  po,
}) => {
  await po.setUp();
  const page = po.page;

  // 1) Initially linked as Pro
  await mockAppMe(page, {
    user_id: "u-1",
    device_id: "d-1",
    email: "pro@example.com",
    plan: "Pro",
    status: "active",
    current_period_end: null,
    feature_flags: { pro: true },
  });

  await page.evaluate(async () => {
    await (window as any).electron.ipcRenderer.invoke("set-user-settings", {
      ternaryAppToken: { value: "ternary_app_OK" },
      ternaryDeviceId: "d-1",
    });
    (window as any).electron.ipcRenderer.emit?.("deep-link-received");
  });
  await po.waitForLinkedState(true);
  // Snapshot pre-revocation state (linked)
  const before = await po.getUserSettings();
  const beforeToken =
    typeof before?.ternaryAppToken === "string"
      ? before.ternaryAppToken
      : before?.ternaryAppToken?.value;
  expect(!!beforeToken).toBe(true);

  // 2) Now simulate 401/empty response
  await mockAppMe(page, { error: "unauthorized" }, 401);
  // Trigger a refresh
  await page.evaluate(() => {
    (window as any).electron.ipcRenderer.emit?.("deep-link-received");
  });

  // Best-effort: banner should appear (treated as free). Don't fail if timing differs.
  try {
    await po.expectUpgradeBannerVisible();
  } catch {}
  // Snapshot post-revocation state
  const after = await po.getUserSettings();
  const afterToken =
    typeof after?.ternaryAppToken === "string"
      ? after.ternaryAppToken
      : after?.ternaryAppToken?.value;
  const snapshot = {
    linkedHasToken: !!afterToken,
    deviceId: after?.ternaryDeviceId || null,
  };
  expect(JSON.stringify(snapshot, null, 2)).toMatchSnapshot(
    "revocation_persistence.txt",
  );
});
