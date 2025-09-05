import { useAtom } from "jotai";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { useLoadApps } from "@/hooks/useLoadApps";
import { useRouter, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
// @ts-ignore
import logo from "../../assets/logo.svg";
import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { IpcClient } from "@/ipc/ipc_client";
import { useTernaryAccount } from "@/hooks/useTernaryAccount";
import { WEBSITE_BASE } from "@/constants/website";

import { PreviewHeader } from "@/components/preview_panel/PreviewHeader";

export const TitleBar = () => {
  const [selectedAppId] = useAtom(selectedAppIdAtom);
  const { apps } = useLoadApps();
  const { navigate } = useRouter();
  const location = useLocation();
  const [showWindowControls, setShowWindowControls] = useState(false);

  useEffect(() => {
    // Check if we're running on Windows
    const checkPlatform = async () => {
      try {
        const platform = await IpcClient.getInstance().getSystemPlatform();
        setShowWindowControls(platform !== "darwin");
      } catch (error) {
        console.error("Failed to get platform info:", error);
      }
    };

    checkPlatform();
  }, []);

  // Get selected app name
  const selectedApp = apps.find((app) => app.id === selectedAppId);
  const displayText = selectedApp
    ? `App: ${selectedApp.name}`
    : "(no app selected)";

  const handleAppClick = () => {
    if (selectedApp) {
      navigate({ to: "/app-details", search: { appId: selectedApp.id } });
    }
  };

  return (
    <>
      <div className="@container z-11 w-full h-11 bg-(--sidebar) absolute top-0 left-0 app-region-drag flex items-center">
        <div className={`${showWindowControls ? "pl-2" : "pl-18"}`}></div>

        <img src={logo} alt="Ternary Logo" className="w-6 h-6 mr-0.5" />
        <Button
          data-testid="title-bar-app-name-button"
          variant="outline"
          size="sm"
          className={`hidden @2xl:block no-app-region-drag text-xs max-w-38 truncate font-medium ${
            selectedApp ? "cursor-pointer" : ""
          }`}
          onClick={handleAppClick}
        >
          {displayText}
        </Button>
        {/* Pro UI removed */}

        {/* Right side content */}
        {location.pathname === "/chat" ? (
          <div className="flex-1 flex items-center justify-end gap-3">
            <PreviewHeader />
            <AccountBar />
            <UpgradeBanner />
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-3">
            <AccountBar />
            <UpgradeBanner />
          </div>
        )}

        {showWindowControls && <WindowsControls />}
      </div>
    </>
  );
};

function AccountBar() {
  const { loading, linked, me, signIn, signOutLocal, linkWithCode } =
    useTernaryAccount();
  const ipc = IpcClient.getInstance();

  const manage = () => ipc.openExternalUrl(`${WEBSITE_BASE}/dashboard`);
  const planLower = (me?.plan || "free").toLowerCase();
  const upgradeVisible = !loading && (!linked || planLower === "free");

  return (
    <div className="no-app-region-drag flex items-center gap-2 text-xs">
      {loading ? (
        <span className="opacity-70">Account…</span>
      ) : !linked ? (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={signIn}
            className="h-7 py-1"
          >
            Sign in
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={linkWithCode}
            className="h-7 py-1"
          >
            Link with code
          </Button>
        </div>
      ) : (
        <>
          <div className="max-w-48 truncate" title={me?.email || "Linked"}>
            {me?.email || "Linked"}
          </div>
          {/* Only show plan badge here when the UpgradeBanner is NOT visible to avoid duplication */}
          {!upgradeVisible && (
            <span className="px-2 py-0.5 rounded bg-zinc-800/60 text-zinc-200">
              {me?.plan || "free"}
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 py-1"
            onClick={manage}
          >
            Manage
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 py-1"
            onClick={signOutLocal}
          >
            Sign out
          </Button>
        </>
      )}
    </div>
  );
}

function UpgradeBanner() {
  const { loading, linked, me } = useTernaryAccount();
  const ipc = IpcClient.getInstance();
  const plan = (me?.plan || "free").toLowerCase();
  const planLabel = me?.plan ? String(me.plan) : "Free";
  // Show only for unsigned or free users. Hide for Pro and Team plans.
  const shouldShow = !loading && (!linked || plan === "free");
  const goPricing = () => ipc.openExternalUrl(`${WEBSITE_BASE}/#pricing`);

  if (!shouldShow) return null;

  return (
    <div className="no-app-region-drag hidden sm:flex items-center gap-2 text-xs">
      <span className="text-zinc-400">Plan:</span>
      <button
        className="px-2 py-1 rounded bg-zinc-800/60 hover:bg-zinc-700 text-zinc-200"
        onClick={goPricing}
        title="View plans"
      >
        {planLabel}
      </button>
      <span className="text-zinc-500">→</span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 py-1"
        onClick={goPricing}
      >
        Upgrade to Pro
      </Button>
    </div>
  );
}

function WindowsControls() {
  const { isDarkMode } = useTheme();
  const ipcClient = IpcClient.getInstance();

  const minimizeWindow = () => {
    ipcClient.minimizeWindow();
  };

  const maximizeWindow = () => {
    ipcClient.maximizeWindow();
  };

  const closeWindow = () => {
    ipcClient.closeWindow();
  };

  return (
    <div className="ml-auto flex no-app-region-drag">
      <button
        className="w-10 h-10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        onClick={minimizeWindow}
        aria-label="Minimize"
      >
        <svg
          width="12"
          height="1"
          viewBox="0 0 12 1"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            width="12"
            height="1"
            fill={isDarkMode ? "#ffffff" : "#000000"}
          />
        </svg>
      </button>
      <button
        className="w-10 h-10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        onClick={maximizeWindow}
        aria-label="Maximize"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="0.5"
            y="0.5"
            width="11"
            height="11"
            stroke={isDarkMode ? "#ffffff" : "#000000"}
          />
        </svg>
      </button>
      <button
        className="w-10 h-10 flex items-center justify-center hover:bg-red-500 transition-colors"
        onClick={closeWindow}
        aria-label="Close"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 1L11 11M1 11L11 1"
            stroke={isDarkMode ? "#ffffff" : "#000000"}
            strokeWidth="1.5"
          />
        </svg>
      </button>
    </div>
  );
}
