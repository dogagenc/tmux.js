import { NodeServices } from "@effect/platform-node";
import { makePromiseClient } from "../internal/PromiseClient.js";

export * from "../Errors.js";
export type { TmuxClientConfig } from "../internal/Config.js";

/**
 * Promise-based tmux client for Node-compatible runtimes.
 *
 * Construct once with optional {@link TmuxClientConfig}, then call any command as
 * a method — each returns a `Promise` that resolves with the command's result or
 * rejects with a tagged error (`TmuxServerNotRunning`, `TmuxTargetNotFound`,
 * `TmuxCommandError`, `TmuxParseError`, `TmuxCommandOptionsError`,
 * `TmuxClientConfigError`, …). The constructor itself never throws; invalid
 * config surfaces as a `TmuxClientConfigError` rejection on the first command.
 *
 * For the Effect-native API (no Promise boundary, typed error channel), use
 * `TmuxClient.layer` from `tmux-js/effect` instead.
 *
 * @example
 * ```ts
 * import { TmuxClient } from "tmux-js";
 *
 * const tmux = new TmuxClient();
 * const sessions = await tmux.listSessions();
 * const pane = await tmux.capturePane({ print: true, targetPane: "0" });
 * ```
 */
export const TmuxClient = makePromiseClient(NodeServices.layer);
