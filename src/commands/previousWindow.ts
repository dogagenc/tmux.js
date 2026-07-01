import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Select the previous window (`tmux previous-window`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.previousWindow({ targetSession: "work" });
 * ```
 */
export const previousWindow = TmuxCommand.make("previousWindow", {
	cmd: "previous-window",
	flags: Schema.Struct({
		/** Move to the previous window with an alert instead of simply the previous window (`-a`). */
		alert: TmuxFlag("-a", Schema.Boolean),
		/** Target session whose previous window is selected (`-t`). */
		targetSession: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
