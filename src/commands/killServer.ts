import { TmuxCommand } from "../internal/Command.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Kill the tmux server and all sessions (`tmux kill-server`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.killServer();
 * ```
 */
export const killServer = TmuxCommand.make("killServer", {
	cmd: "kill-server",
	output: TmuxOutput.string(),
});
