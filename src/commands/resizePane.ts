import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Resize a pane (`tmux resize-pane`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.resizePane(5, { down: true, targetPane: "work:1.0" });
 *
 * await tmux.resizePane(undefined, { width: 80, height: 24 });
 * ```
 */
export const resizePane = TmuxCommand.make("resizePane", {
	cmd: "resize-pane",
	flags: Schema.Struct({
		/** Resize the pane upward by adjustment (`-U`). */
		up: TmuxFlag("-U", Schema.Boolean),
		/** Resize the pane downward by adjustment (`-D`). */
		down: TmuxFlag("-D", Schema.Boolean),
		/** Resize the pane left by adjustment (`-L`). */
		left: TmuxFlag("-L", Schema.Boolean),
		/** Resize the pane right by adjustment (`-R`). */
		right: TmuxFlag("-R", Schema.Boolean),
		/** Toggle the active pane between zoomed and unzoomed (`-Z`). */
		zoom: TmuxFlag("-Z", Schema.Boolean),
		// ponytail: -M (mouse resizing) only valid in a mouse key binding, no
		// headless effect — defer until interactive support lands.
		// mouse: TmuxFlag("-M", Schema.Boolean),
		// ponytail: -T (trim below cursor) affects copy-mode/history only, no
		// headless-observable stdout — defer until copy-mode support lands.
		// trim: TmuxFlag("-T", Schema.Boolean),
		/** Set absolute width in columns, or a percentage string ending in `%` (`-x`). */
		width: TmuxFlag("-x", Schema.Union([Schema.Int, Schema.NonEmptyString])),
		/** Set absolute height in lines, or a percentage string ending in `%` (`-y`). */
		height: TmuxFlag("-y", Schema.Union([Schema.Int, Schema.NonEmptyString])),
		/** Target pane to resize (`-t`). */
		targetPane: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	args: TmuxCommand.args(
		1,
		Schema.Tuple([Schema.optionalKey(Schema.Int)]),
		(adjustment) => (adjustment === undefined ? [] : [String(adjustment)]),
	),
	output: TmuxOutput.string(),
});
