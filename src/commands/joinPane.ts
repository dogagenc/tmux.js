import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Move a pane into another window (`tmux join-pane`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.joinPane({ sourcePane: "work:1.0", targetPane: "work:2.0" });
 *
 * await tmux.joinPane({ horizontal: true, size: "50%", targetPane: "work:2" });
 * ```
 */
export const joinPane = TmuxCommand.make("joinPane", {
	cmd: "join-pane",
	flags: Schema.Struct({
		/** Join the source pane to the left of or above the target pane (`-b`). */
		before: TmuxFlag("-b", Schema.Boolean),
		/** Do not make the joined pane the active pane (`-d`). */
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
		/** Destination pane to join into (`-t`). */
		targetPane: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
