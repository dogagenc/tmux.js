import { Schema, Tuple } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Move a window to another index or session (`tmux move-window`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.moveWindow({ sourceWindow: "work:1", targetWindow: "other:2" });
 *
 * await tmux.moveWindow({ renumber: true, sourceWindow: "work" });
 * ```
 */
export const moveWindow = TmuxCommand.make("moveWindow", {
	cmd: "move-window",
	/** after (`-a`) and before (`-b`) are mutually exclusive */
	flags: Schema.Union([
		Schema.Struct({
			/** Move to the index after `targetWindow`, moving later windows up (`-a`). */
			after: TmuxFlag("-a", Schema.Boolean),
			before: Schema.optional(Schema.Literal(false)),
		}),
		Schema.Struct({
			/** Move to the index before `targetWindow`, moving later windows up (`-b`). */
			before: TmuxFlag("-b", Schema.Boolean),
			after: Schema.optional(Schema.Literal(false)),
		}),
	]).mapMembers(
		Tuple.map(
			Schema.fieldsAssign({
				/** Do not make the moved window the current window (`-d`). */
				detached: TmuxFlag("-d", Schema.Boolean),
				/** Destroy an existing window at the target index instead of failing (`-k`). */
				destroyExisting: TmuxFlag("-k", Schema.Boolean),
				/** Renumber windows sequentially, respecting base-index; ignores -s/-t (`-r`). */
				renumber: TmuxFlag("-r", Schema.Boolean),
				/** Source window to move (`-s`). */
				sourceWindow: TmuxFlag("-s", Schema.NonEmptyString),
				/** Destination window/index to move into (`-t`). */
				targetWindow: TmuxFlag("-t", Schema.NonEmptyString),
			}),
		),
	),
	output: TmuxOutput.string(),
});
