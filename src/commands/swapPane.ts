import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Swap two panes (`tmux swap-pane`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.swapPane({ sourcePane: "%0", targetPane: "%1" });
 *
 * await tmux.swapPane({ down: true, detached: true, targetPane: "work:1" });
 * ```
 */
export const swapPane = TmuxCommand.make("swapPane", {
	cmd: "swap-pane",
	flags: Schema.Struct({
		/** Do not change the active pane (`-d`). */
		detached: TmuxFlag("-d", Schema.Boolean),
		/** Swap with the next pane when no source is given (`-D`). */
		down: TmuxFlag("-D", Schema.Boolean),
		/** Swap with the previous pane when no source is given (`-U`). */
		up: TmuxFlag("-U", Schema.Boolean),
		/** Keep the window zoomed if it was zoomed (`-Z`). */
		keepZoomed: TmuxFlag("-Z", Schema.Boolean),
		/** Source pane; defaults to the marked pane, else current (`-s`). */
		sourcePane: TmuxFlag("-s", Schema.NonEmptyString),
		/** Destination pane to swap with (`-t`). */
		targetPane: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
