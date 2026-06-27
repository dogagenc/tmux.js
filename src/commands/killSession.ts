import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Kill a tmux session (`tmux kill-session`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.killSession({ targetSession: "work" });
 *
 * await tmux.killSession({ killOthers: true, targetSession: "work" });
 * ```
 */
export const killSession = TmuxCommand.make("killSession", {
	cmd: "kill-session",
	flags: Schema.Struct({
		/** Kill all sessions except the target session (`-a`). */
		killOthers: TmuxFlag("-a", Schema.Boolean),
		/** Clear alert flags for all windows instead of killing the session (`-C`). */
		clearAlerts: TmuxFlag("-C", Schema.Boolean),
		/** Target session to kill, or to keep when `killOthers` is set (`-t`). */
		targetSession: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
