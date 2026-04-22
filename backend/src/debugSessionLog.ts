import { appendFileSync } from "fs";
import path from "path";

/** Repo-root `debug-d76cee.log` when `cwd` is `backend/` (npm `--prefix backend`). */
const LOG_FILE = path.resolve(process.cwd(), "..", "debug-d76cee.log");

export function appendDebugNdjson(payload: Record<string, unknown>): void {
  try {
    appendFileSync(
      LOG_FILE,
      JSON.stringify({ ...payload, timestamp: Date.now() }) + "\n",
      { flag: "a" },
    );
  } catch {
    /* avoid crashing the API on log I/O failure */
  }
}
