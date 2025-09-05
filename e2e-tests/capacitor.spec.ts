import { testSkipIfWindows, Timeout } from "./helpers/test_helper";

testSkipIfWindows(
  "capacitor upgrade and sync works",
  async ({ po }, testInfo) => {
    // Capacitor operations can take longer; extend timeout for this test.
    // Playwright allows changing per-test timeout at runtime.
    testInfo.setTimeout(Timeout.EXTRA_LONG);
    await po.setUp();
    await po.sendPrompt("hi");
    await po.getTitleBarAppNameButton().click();
    await po.clickAppUpgradeButton({ upgradeId: "capacitor" });
    await po.expectNoAppUpgrades();
    await po.snapshotAppFiles({ name: "upgraded-capacitor" });

    await po.page
      .getByTestId("capacitor-controls")
      .waitFor({ state: "visible" });

    // Test sync & open iOS functionality - the button contains "Sync & Open iOS"
    const iosButton = po.page.getByRole("button", { name: /Sync & Open iOS/i });
    await iosButton.click();

    // In test mode, this should complete without error and return to idle state
    // Wait for the button to be enabled again (not in loading state). If the app closes early
    // during teardown, ignore the context-closed error.
    try {
      await po.page.waitForFunction(
        (needle: string) => {
          const buttons = Array.from(
            document.querySelectorAll<HTMLButtonElement>("button"),
          );
          return buttons.some((b) => {
            const text = (b.textContent || "").toLowerCase();
            return text.includes(needle) && !b.hasAttribute("disabled");
          });
        },
        "sync & open ios",
        { timeout: Timeout.EXTRA_LONG },
      );
    } catch (e: any) {
      if (!String(e?.message || e).includes("closed")) throw e;
    }

    // Test sync & open Android functionality - the button contains "Sync & Open Android"
    const androidButton = po.page.getByRole("button", {
      name: /Sync & Open Android/i,
    });
    await androidButton.click();

    // In test mode, this should complete without error and return to idle state
    // Wait for the button to be enabled again (not in loading state). If the app closes early
    // during teardown, ignore the context-closed error.
    try {
      await po.page.waitForFunction(
        (needle: string) => {
          const buttons = Array.from(
            document.querySelectorAll<HTMLButtonElement>("button"),
          );
          return buttons.some((b) => {
            const text = (b.textContent || "").toLowerCase();
            return text.includes(needle) && !b.hasAttribute("disabled");
          });
        },
        "sync & open android",
        { timeout: Timeout.EXTRA_LONG },
      );
    } catch (e: any) {
      if (!String(e?.message || e).includes("closed")) throw e;
    }
  },
);
