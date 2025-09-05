import { test, Timeout } from "./helpers/test_helper";
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

  // Upgrade banner should be visible for free users
  await page
    .getByRole("button", { name: "Upgrade to Pro" })
    .waitFor({ timeout: Timeout.MEDIUM });

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

  // Banner hidden for Pro
  await page
    .getByRole("button", { name: "Upgrade to Pro" })
    .waitFor({ state: "detached" });
  // Account still shows email + Manage
  await page.getByText("free@example.com").waitFor();
  await page.getByRole("button", { name: "Manage" }).waitFor();
});
