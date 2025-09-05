import { Page } from "@playwright/test";

export function mockAppMe(page: Page, payload: any, status = 200) {
  return page.route(/\/api\/app\/me$/, async (route) => {
    await route.fulfill({ status, json: payload });
  });
}

export function mockLinkInit(
  page: Page,
  { verify_url, polling_token }: { verify_url: string; polling_token: string },
) {
  return page.route(/\/api\/link\/init$/, async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        code: "ABC123",
        verify_url,
        polling_token,
        expires_at: new Date(Date.now() + 600000).toISOString(),
      },
    });
  });
}

export function mockLinkStatus(
  page: Page,
  { token, device_id }: { token: string; device_id?: string },
) {
  let called = false;
  return page.route(/\/api\/link\/status$/, async (route) => {
    if (!called) {
      called = true;
      await route.fulfill({ status: 200, json: { status: "pending" } });
    } else {
      await route.fulfill({
        status: 200,
        json: { status: "confirmed", token, device_id: device_id || null },
      });
    }
  });
}
