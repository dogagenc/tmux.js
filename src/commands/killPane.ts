import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Kill a tmux pane (`tmux kill-pane`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.killPane({ targetPane: "work:1.0" });
 *
 * await tmux.killPane({ killOthers: true, targetPane: "work:1.0" });
 * ```
 */
export const killPane = TmuxCommand.make("killPane", {
	cmd: "kill-pane",
	flags: Schema.Struct({
		/** Kill all panes except the target pane (`-a`). */
		killOthers: TmuxFlag("-a", Schema.Boolean),
		/** Target pane to kill, or to keep when `killOthers` is set (`-t`). */
		targetPane: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
