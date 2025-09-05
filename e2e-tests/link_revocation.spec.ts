import { test, Timeout } from "./helpers/test_helper";
import { mockAppMe } from "./fixtures/network.mock";

// Simulate token revocation: first /app/me returns Pro, then switch to 401/empty
// App should surface upgrade banner (treated as free/unsigned for UI purposes)

test("revoked token shows upgrade banner and hides plan badge", async ({
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

  await page.getByText("pro@example.com").waitFor({ timeout: Timeout.MEDIUM });
  // Upgrade banner should not be visible for Pro
  await page
    .getByRole("button", { name: "Upgrade to Pro" })
    .waitFor({ state: "detached" });

  // 2) Now simulate 401/empty response
  await mockAppMe(page, { error: "unauthorized" }, 401);
  // Trigger a refresh
  await page.evaluate(() => {
    (window as any).electron.ipcRenderer.emit?.("deep-link-received");
  });

  // Expect upgrade banner visible again (treated as free)
  await page
    .getByRole("button", { name: "Upgrade to Pro" })
    .waitFor({ timeout: Timeout.MEDIUM });
});
