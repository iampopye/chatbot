/**
 * Lazy loader for the Pyodide runtime used to execute Python in code artifacts.
 *
 * Upstream loaded Pyodide from a CDN with `strategy="beforeInteractive"` on
 * every page, so every visitor hit jsDelivr whether or not they ever ran any
 * Python. It is now fetched only when code is actually run, and the base URL is
 * configurable so an air-gapped deployment can serve its own copy.
 */

const DEFAULT_PYODIDE_BASE_URL =
  "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/";

export function getPyodideBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_PYODIDE_BASE_URL?.trim();
  const base = configured || DEFAULT_PYODIDE_BASE_URL;

  return base.endsWith("/") ? base : `${base}/`;
}

let loader: Promise<void> | null = null;

/** Injects the Pyodide script once, resolving when `loadPyodide` is available. */
export function loadPyodideScript(): Promise<void> {
  if (loader) {
    return loader;
  }

  loader = new Promise<void>((resolve, reject) => {
    if ("loadPyodide" in globalThis) {
      resolve();
      return;
    }

    const script = document.createElement("script");

    script.src = `${getPyodideBaseUrl()}pyodide.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Allow a retry rather than caching the failure forever.
      loader = null;
      reject(
        new Error(
          `Could not load the Python runtime from ${getPyodideBaseUrl()}. Set NEXT_PUBLIC_PYODIDE_BASE_URL to a reachable copy if this deployment has no internet access.`
        )
      );
    };

    document.head.appendChild(script);
  });

  return loader;
}
