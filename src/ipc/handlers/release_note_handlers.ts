import log from "electron-log";
import fetch from "node-fetch";
import { createLoggedHandler } from "./safe_handle";
import { DoesReleaseNoteExistParams } from "../ipc_types";
import { IS_TEST_BUILD } from "../utils/test_utils";

const logger = log.scope("release_note_handlers");

const handle = createLoggedHandler(logger);

// Base URL where docs are served. Use env override if provided; default to local dev site.
// We intentionally default to http for localhost to avoid SSL errors.
const DOCS_BASE_URL =
  process.env.WEBSITE_BASE_URL?.replace(/\/$/, "") ||
  "http://ternary-pre-domain.vercel.app";

function versionToSlug(version: string): string {
  // Normalize common prerelease patterns like beta.1 -> beta-1, rc.1 -> rc-1, alpha.1 -> alpha-1
  // Also ensure lowercase and replace spaces with dashes
  return version
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/(beta|rc|alpha)\.(\d+)/gi, "$1-$2");
}

export function registerReleaseNoteHandlers() {
  handle(
    "does-release-note-exist",
    async (_, params: DoesReleaseNoteExistParams) => {
      const { version } = params;

      if (!version || typeof version !== "string") {
        throw new Error("Invalid version provided");
      }

      // For E2E tests, we don't want to check for release notes
      // or show release notes, as it interferes with the tests.
      if (IS_TEST_BUILD) {
        return { exists: false };
      }
      const slug = versionToSlug(version);
      const releaseNoteUrl = `${DOCS_BASE_URL}/docs/releases/${encodeURIComponent(
        slug,
      )}?embed=1`;

      logger.debug(`Checking for release note at: ${releaseNoteUrl}`);

      try {
        const response = await fetch(releaseNoteUrl, { method: "HEAD" }); // Use HEAD to check existence without downloading content
        if (response.ok) {
          logger.debug(
            `Release note found for version ${version} at ${releaseNoteUrl}`,
          );
          return { exists: true, url: releaseNoteUrl };
        } else if (response.status === 404) {
          logger.debug(
            `Release note not found for version ${version} at ${releaseNoteUrl}`,
          );
          return { exists: false };
        } else {
          // Log other non-404 errors but still treat as "not found" for the client,
          // as the primary goal is to check existence.
          logger.warn(
            `Unexpected status code ${response.status} when checking for release note: ${releaseNoteUrl}`,
          );
          return { exists: false };
        }
      } catch (error) {
        logger.error(
          `Error fetching release note for version ${version} at ${releaseNoteUrl}:`,
          error,
        );
        // In case of network errors, etc., assume it doesn't exist or is inaccessible.
        // Throwing an error here would propagate to the client and might be too disruptive
        // if the check is just for UI purposes (e.g., showing a link).
        // Consider if specific errors should be thrown based on requirements.
        return { exists: false };
      }
    },
  );

  logger.debug("Registered release note IPC handlers");
}
