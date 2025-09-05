import { useCallback, useEffect, useMemo, useState } from "react";
import { WEBSITE_BASE, RETURN_SCHEME } from "@/constants/website";
import { buildLinkStartUrl, fetchAppMe } from "@/lib/websiteClient";

export type AppMe = {
  user_id: string;
  device_id: string | null;
  email: string | null;
  plan: string;
  status: string;
  current_period_end: string | null;
  feature_flags: Record<string, any>;
};

function randomState() {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID)
    return (crypto as any).randomUUID();
  return Math.random().toString(36).slice(2);
}

export function useTernaryAccount() {
  const [loading, setLoading] = useState(true);
  const [linked, setLinked] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [me, setMe] = useState<AppMe | null>(null);

  const refreshFromSettings = useCallback(async () => {
    // Read token from settings via IPC
    const settings = await (window as any).electron.ipcRenderer.invoke(
      "get-user-settings",
    );
    const secretRaw = settings?.ternaryAppToken as any;
    const t =
      typeof secretRaw === "string" ? secretRaw : secretRaw?.value || null;
    const d = (settings?.ternaryDeviceId as string) || null;
    setToken(t);
    setDeviceId(d);
    setLinked(!!t);
    setLoading(false);
    if (t) {
      try {
        const profile = await fetchAppMe(t);
        if (!profile) {
          // Treat as unauthorized or network error: keep token but no profile
          setMe(null);
        } else {
          setMe(profile);
        }
      } catch {
        setMe(null);
      }
    } else {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    refreshFromSettings();
    const off = (window as any).electron.ipcRenderer.on(
      "deep-link-received",
      () => {
        refreshFromSettings();
      },
    );
    // Additionally, perform a short retry loop to catch freshly written settings
    // in test or edge environments where the event might be missed.
    let cancelled = false;
    (async () => {
      const start = Date.now();
      while (!cancelled && Date.now() - start < 5000) {
        await new Promise((r) => setTimeout(r, 300));
        if ((window as any).__ternary_link_checked__) break;
        await refreshFromSettings();
        try {
          const settings = await (window as any).electron.ipcRenderer.invoke(
            "get-user-settings",
          );
          const hasToken = !!(settings?.ternaryAppToken as any)?.value;
          if (hasToken) {
            (window as any).__ternary_link_checked__ = true;
            break;
          }
        } catch {}
      }
    })();
    return () => {
      cancelled = true;
      if (off) off();
    };
  }, [refreshFromSettings]);

  const signIn = useCallback(async () => {
    try {
      const state = randomState();
      // Persist state (best-effort)
      try {
        if ((window as any).electron?.ipcRenderer) {
          await (window as any).electron.ipcRenderer.invoke(
            "set-user-settings",
            { ternaryLinkState: state },
          );
        }
      } catch {}
      const url = buildLinkStartUrl({
        state,
        return_uri: RETURN_SCHEME,
        platform:
          (navigator as any).userAgentData?.platform ||
          navigator.platform ||
          "unknown",
        app_version: (window as any).APP_VERSION || "0.0.0",
      });
      if ((window as any).electron?.ipcRenderer) {
        await (window as any).electron.ipcRenderer.invoke(
          "open-external-url",
          url,
        );
      } else {
        // Fallback for environments without preload bridge
        window.open(url, "_blank", "noopener,noreferrer");
      }
      // Small breadcrumb for debugging
      console.log("Opened link/start:", url);
    } catch (e) {
      console.error("Failed to open sign-in flow", e);
      alert("Failed to open sign-in flow. See console for details.");
    }
  }, []);

  const signOutLocal = useCallback(async () => {
    await (window as any).electron.ipcRenderer.invoke("set-user-settings", {
      ternaryAppToken: undefined,
      ternaryDeviceId: undefined,
    });
    setLinked(false);
    setToken(null);
    setDeviceId(null);
    setMe(null);
  }, []);

  const linkWithCode = useCallback(async () => {
    try {
      // 1) init
      const res = await fetch(`${WEBSITE_BASE}/api/link/init`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to start link");
      const { verify_url, polling_token } = await res.json();
      if (!verify_url || !polling_token)
        throw new Error("Invalid init response");
      // 2) open verify page
      if ((window as any).electron?.ipcRenderer) {
        await (window as any).electron.ipcRenderer.invoke(
          "open-external-url",
          verify_url,
        );
      } else {
        window.open(verify_url, "_blank", "noopener,noreferrer");
      }
      // 3) poll status
      const deadline = Date.now() + 10 * 60 * 1000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        const sres = await fetch(`${WEBSITE_BASE}/api/link/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ polling_token }),
        });
        if (!sres.ok) continue;
        const json = await sres.json();
        if (json.status === "confirmed" && json.token) {
          // Persist securely via settings (will encrypt)
          await (window as any).electron.ipcRenderer.invoke(
            "set-user-settings",
            {
              ternaryAppToken: { value: json.token },
              ternaryDeviceId: json.device_id || undefined,
            },
          );
          await refreshFromSettings();
          return;
        }
      }
      alert("Linking timed out. Please try again.");
    } catch (e) {
      console.error(e);
      alert("Failed to link with code. Please try again.");
    }
  }, [refreshFromSettings]);

  return useMemo(
    () => ({
      loading,
      linked,
      token,
      deviceId,
      me,
      signIn,
      signOutLocal,
      linkWithCode,
    }),
    [loading, linked, token, deviceId, me, signIn, signOutLocal, linkWithCode],
  );
}
