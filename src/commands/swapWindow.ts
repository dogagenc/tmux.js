import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Swap two windows (`tmux swap-window`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.swapWindow({ sourceWindow: "work:1", targetWindow: "work:2" });
 *
 * await tmux.swapWindow({ detached: true, sourceWindow: "work:1", targetWindow: "work:2" });
 * ```
 */
export const swapWindow = TmuxCommand.make("swapWindow", {
	cmd: "swap-window",
	flags: Schema.Struct({
		/** Do not make the swapped window the active window (`-d`). */
		detached: TmuxFlag("-d", Schema.Boolean),
		/** Source window; defaults to the marked window (`-s`). */
		sourceWindow: TmuxFlag("-s", Schema.NonEmptyString),
		/** Destination window to swap with (`-t`). */
		targetWindow: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
