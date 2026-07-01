import { Schema, Tuple } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Rotate the panes in a window (`tmux rotate-window`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.rotateWindow({ down: true, targetWindow: "work:1" });
 *
 * await tmux.rotateWindow({ up: true, keepZoomed: true, targetWindow: "work:1" });
 * ```
 */
export const rotateWindow = TmuxCommand.make("rotateWindow", {
	cmd: "rotate-window",
	/** down (`-D`) and up (`-U`) are mutually exclusive */
	flags: Schema.Union([
		Schema.Struct({
			/** Rotate panes downward, to numerically higher positions (`-D`). */
			down: TmuxFlag("-D", Schema.Boolean),
			up: Schema.optional(Schema.Literal(false)),
		}),
		Schema.Struct({
			/** Rotate panes upward, to numerically lower positions (`-U`). */
			up: TmuxFlag("-U", Schema.Boolean),
			down: Schema.optional(Schema.Literal(false)),
		}),
	]).mapMembers(
		Tuple.map(
			Schema.fieldsAssign({
				/** Keep the window zoomed if it was zoomed (`-Z`). */
				keepZoomed: TmuxFlag("-Z", Schema.Boolean),
				/** Target window whose panes are rotated (`-t`). */
				targetWindow: TmuxFlag("-t", Schema.NonEmptyString),
			}),
		),
	),
	output: TmuxOutput.string(),
});
