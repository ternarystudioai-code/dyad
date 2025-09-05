import { test, Timeout } from "./helpers/test_helper";
import {
  mockAppMe,
  mockLinkInit,
  mockLinkStatus,
} from "./fixtures/network.mock";

// Uses the in-app fallback flow: init -> open verify -> poll status -> token persisted

test("fallback linking via code shows account + hides upgrade banner for Pro", async ({
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

  // Wait until title bar reflects the email
  await page.getByText("pro@example.com").waitFor({ timeout: Timeout.LONG });

  // Upgrade banner should be hidden for Pro
  await page
    .getByRole("button", { name: "Upgrade to Pro" })
    .waitFor({ state: "detached" });
});
