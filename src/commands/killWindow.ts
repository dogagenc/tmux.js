import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Kill a tmux window (`tmux kill-window`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.killWindow({ targetWindow: "work:1" });
 *
 * await tmux.killWindow({ killOthers: true, targetWindow: "work:1" });
 * ```
 */
export const killWindow = TmuxCommand.make("killWindow", {
	cmd: "kill-window",
	flags: Schema.Struct({
		/** Kill all windows except the target window (`-a`). */
		killOthers: TmuxFlag("-a", Schema.Boolean),
		/** Target window to kill, or to keep when `killOthers` is set (`-t`). */
		targetWindow: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
