import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Select a pane, or change pane state (`tmux select-pane`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.selectPane({ targetPane: "work:1.0" });
 *
 * await tmux.selectPane({ down: true, keepZoomed: true });
 * ```
 */
export const selectPane = TmuxCommand.make("selectPane", {
	cmd: "select-pane",
	flags: Schema.Struct({
		/** Select the pane above the target pane (`-U`). */
		up: TmuxFlag("-U", Schema.Boolean),
		/** Select the pane below the target pane (`-D`). */
		down: TmuxFlag("-D", Schema.Boolean),
		/** Select the pane to the left of the target pane (`-L`). */
		left: TmuxFlag("-L", Schema.Boolean),
		/** Select the pane to the right of the target pane (`-R`). */
		right: TmuxFlag("-R", Schema.Boolean),
		/** Keep the window zoomed if it was zoomed (`-Z`). */
		keepZoomed: TmuxFlag("-Z", Schema.Boolean),
		/** Select the last (previously active) pane (`-l`). */
		last: TmuxFlag("-l", Schema.Boolean),
		/** Enable input to the pane (`-e`). */
		enableInput: TmuxFlag("-e", Schema.Boolean),
		/** Disable input to the pane (`-d`). */
		disableInput: TmuxFlag("-d", Schema.Boolean),
		/** Mark the target pane (`-m`). */
		mark: TmuxFlag("-m", Schema.Boolean),
		/** Clear the marked pane (`-M`). */
		clearMarked: TmuxFlag("-M", Schema.Boolean),
		/** Set the pane title (`-T`). */
		title: TmuxFlag("-T", Schema.NonEmptyString),
		/** Target pane to make active (`-t`). */
		targetPane: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
