import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Move a pane into another window (`tmux move-pane`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.movePane({ sourcePane: "work:1.0", targetPane: "work:2.0" });
 *
 * await tmux.movePane({ horizontal: true, size: "50%", targetPane: "work:2" });
 * ```
 */
export const movePane = TmuxCommand.make("movePane", {
	cmd: "move-pane",
	flags: Schema.Struct({
		/** Move the source pane to the left of or above the target pane (`-b`). */
		before: TmuxFlag("-b", Schema.Boolean),
		/** Do not make the moved pane the active pane (`-d`). */
		detached: TmuxFlag("-d", Schema.Boolean),
		/** Span the full window height or width instead of the target size (`-f`). */
		full: TmuxFlag("-f", Schema.Boolean),
		/** Split horizontally (left/right) instead of vertically (`-h`). */
		horizontal: TmuxFlag("-h", Schema.Boolean),
		/** Split vertically (top/bottom); the default (`-v`). */
		vertical: TmuxFlag("-v", Schema.Boolean),
		/** Size in lines/columns, or a percentage string ending in `%` (`-l`). */
		size: TmuxFlag("-l", Schema.Union([Schema.Int, Schema.NonEmptyString])),
		/** Source pane to move; defaults to the marked pane (`-s`). */
		sourcePane: TmuxFlag("-s", Schema.NonEmptyString),
		/** Destination pane to move into (`-t`). */
		targetPane: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
