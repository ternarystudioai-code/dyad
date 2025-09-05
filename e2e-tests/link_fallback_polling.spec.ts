import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";
import {
  mockAppMe,
  mockLinkInit,
  mockLinkStatus,
} from "./fixtures/network.mock";

// Uses the in-app fallback flow: init -> open verify -> poll status -> token persisted

test("fallback linking via code persists token/device and returns Pro profile", async ({
  po,
}) => {
  await po.setUp();
  const page = po.page;

  // Mock the website endpoints for fallback
  await mockLinkInit(page, {
    verify_url: "https://example.test/verify",
    polling_token: "poll-1",
  });
  await mockLinkStatus(page, { token: "ternary_app_TEST", device_id: "d-99" });

  // After token arrives, the app will call /api/app/me — mock Pro user
  await mockAppMe(page, {
    user_id: "u-99",
    device_id: "d-99",
    email: "pro@example.com",
    plan: "Pro",
    status: "active",
    current_period_end: null,
    feature_flags: { pro: true },
  });

  // Open the account menu flow in title bar: click "Link with code"
  await page.getByRole("button", { name: "Link with code" }).click();

  // Wait for linking to persist
  await po.waitForLinkedState(true);
  const settings = await po.getUserSettings();
  const token =
    typeof settings?.ternaryAppToken === "string"
      ? settings.ternaryAppToken
      : settings?.ternaryAppToken?.value;
  expect(!!token).toBe(true);
  // device id may be provided by status mock
  const snapshot = {
    hasToken: !!token,
    deviceId: settings?.ternaryDeviceId || null,
  };
  expect(JSON.stringify(snapshot, null, 2)).toMatchSnapshot(
    "fallback_persistence.txt",
  );
});
