import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Select the next window (`tmux next-window`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.nextWindow({ targetSession: "work" });
 * ```
 */
export const nextWindow = TmuxCommand.make("nextWindow", {
	cmd: "next-window",
	flags: Schema.Struct({
		/** Move to the next window with an alert instead of simply the next window (`-a`). */
		alert: TmuxFlag("-a", Schema.Boolean),
		/** Target session whose next window is selected (`-t`). */
		targetSession: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
