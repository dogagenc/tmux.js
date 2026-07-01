import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Resize a window (`tmux resize-window`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.resizeWindow(5, { down: true, targetWindow: "work:1" });
 *
 * await tmux.resizeWindow(undefined, { width: 120, height: 40 });
 * ```
 */
export const resizeWindow = TmuxCommand.make("resizeWindow", {
	cmd: "resize-window",
	flags: Schema.Struct({
		/** Set the window to the smallest attached client size (`-a`). */
		smallest: TmuxFlag("-a", Schema.Boolean),
		/** Set the window to the largest attached client size (`-A`). */
		largest: TmuxFlag("-A", Schema.Boolean),
		/** Resize the window upward by adjustment (`-U`). */
		up: TmuxFlag("-U", Schema.Boolean),
		/** Resize the window downward by adjustment (`-D`). */
		down: TmuxFlag("-D", Schema.Boolean),
		/** Resize the window left by adjustment (`-L`). */
		left: TmuxFlag("-L", Schema.Boolean),
		/** Resize the window right by adjustment (`-R`). */
		right: TmuxFlag("-R", Schema.Boolean),
		/** Set the absolute width in columns (`-x`). */
		width: TmuxFlag("-x", Schema.Int),
		/** Set the absolute height in lines (`-y`). */
		height: TmuxFlag("-y", Schema.Int),
		/** Target window to resize (`-t`). */
		targetWindow: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	args: TmuxCommand.args(
		1,
		Schema.Tuple([Schema.optionalKey(Schema.Int)]),
		(adjustment) => (adjustment === undefined ? [] : [String(adjustment)]),
	),
	output: TmuxOutput.string(),
});
