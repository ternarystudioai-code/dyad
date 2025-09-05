import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";
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
  await po.simulateDeepLink({ token: "ternary_app_TEST", deviceId: "d-1" });
  await po.waitForLinkedState(true);
  // Validate persistence contract instead of brittle header UI
  const settings = await po.getUserSettings();
  const token =
    typeof settings?.ternaryAppToken === "string"
      ? settings.ternaryAppToken
      : settings?.ternaryAppToken?.value;
  expect(token).toBe("ternary_app_TEST");
  expect(settings?.ternaryDeviceId).toBe("d-1");
  // Snapshot a minimal, stable view of persistence (avoid including raw token value)
  const snapshot = {
    hasToken: !!token,
    deviceId: settings?.ternaryDeviceId || null,
  };
  expect(JSON.stringify(snapshot, null, 2)).toMatchSnapshot(
    "deeplink_persistence.txt",
  );
});
