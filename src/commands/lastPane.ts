import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Select the previously selected pane (`tmux last-pane`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.lastPane({ targetWindow: "work:1" });
 *
 * await tmux.lastPane({ keepZoomed: true, targetWindow: "work:1" });
 * ```
 */
export const lastPane = TmuxCommand.make("lastPane", {
	cmd: "last-pane",
	flags: Schema.Struct({
		/** Disable input to the pane (`-d`). */
		disableInput: TmuxFlag("-d", Schema.Boolean),
		/** Enable input to the pane (`-e`). */
		enableInput: TmuxFlag("-e", Schema.Boolean),
		/** Keep the window zoomed if it was zoomed (`-Z`). */
		keepZoomed: TmuxFlag("-Z", Schema.Boolean),
		/** Target window whose last (previously selected) pane is selected (`-t`). */
		targetWindow: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
