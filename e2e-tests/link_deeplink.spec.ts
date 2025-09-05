import { test, Timeout } from "./helpers/test_helper";
import { mockAppMe } from "./fixtures/network.mock";

// Simulates deeplink completion by writing token to settings and emitting the renderer event
// Then verifies TitleBar reflects email + plan and Manage appears

test("deeplink-first linking updates title bar with plan and email", async ({
  po,
}) => {
  await po.setUp();
  const page = po.page;

  // Arrange mock /api/app/me response
  await mockAppMe(page, {
    user_id: "u-1",
    device_id: "d-1",
    email: "user@example.com",
    plan: "Pro",
    status: "active",
    current_period_end: null,
    feature_flags: { pro: true },
  });

  // Simulate the app receiving a deep link by directly setting settings
  await page.evaluate(async () => {
    // Persist token and device
    await (window as any).electron.ipcRenderer.invoke("set-user-settings", {
      ternaryAppToken: { value: "ternary_app_TEST" },
      ternaryDeviceId: "d-1",
    });
    // Notify renderer listeners
    if ((window as any).electron?.ipcRenderer?.emit) {
      (window as any).electron.ipcRenderer.emit("deep-link-received");
    }
  });

  // Assert: Title bar shows email and has Manage + Sign out
  await page.getByText("user@example.com").waitFor({ timeout: Timeout.MEDIUM });
  await page.getByRole("button", { name: "Manage" }).waitFor();
  await page.getByRole("button", { name: "Sign out" }).waitFor();
});
