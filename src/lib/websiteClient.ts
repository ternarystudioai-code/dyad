import { WEBSITE_BASE } from "@/constants/website";

export async function fetchAppMe(token: string): Promise<{
  user_id: string;
  device_id: string | null;
  email: string | null;
  plan: string;
  status: string;
  current_period_end: string | null;
  feature_flags: Record<string, any>;
} | null> {
  try {
    const res = await fetch(`${WEBSITE_BASE}/api/app/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function buildLinkStartUrl(params: {
  return_uri?: string;
  state: string;
  device_name?: string;
  platform?: string;
  app_version?: string;
}): string {
  const url = new URL(`${WEBSITE_BASE}/link/start`);
  url.searchParams.set("state", params.state);
  url.searchParams.set(
    "return_uri",
    params.return_uri || "ternary://link/callback",
  );
  if (params.device_name)
    url.searchParams.set("device_name", params.device_name);
  if (params.platform) url.searchParams.set("platform", params.platform);
  if (params.app_version)
    url.searchParams.set("app_version", params.app_version);
  return url.toString();
}
