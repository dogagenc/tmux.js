import { Schema, Tuple } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Link a window into another session (`tmux link-window`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.linkWindow({ sourceWindow: "work:1", targetWindow: "other:2" });
 *
 * await tmux.linkWindow({ after: true, detached: true, targetWindow: "other:2" });
 * ```
 */
export const linkWindow = TmuxCommand.make("linkWindow", {
	cmd: "link-window",
	/** after (`-a`) and before (`-b`) are mutually exclusive */
	flags: Schema.Union([
		Schema.Struct({
			/** Link to the index after `targetWindow`, moving later windows up (`-a`). */
			after: TmuxFlag("-a", Schema.Boolean),
			before: Schema.optional(Schema.Literal(false)),
		}),
		Schema.Struct({
			/** Link to the index before `targetWindow`, moving later windows up (`-b`). */
			before: TmuxFlag("-b", Schema.Boolean),
			after: Schema.optional(Schema.Literal(false)),
		}),
	]).mapMembers(
		Tuple.map(
			Schema.fieldsAssign({
				/** Do not make the linked window the current window (`-d`). */
				detached: TmuxFlag("-d", Schema.Boolean),
				/** Destroy an existing window at the target index instead of failing (`-k`). */
				destroyExisting: TmuxFlag("-k", Schema.Boolean),
				/** Source window to link from (`-s`). */
				sourceWindow: TmuxFlag("-s", Schema.NonEmptyString),
				/** Destination window/index to link into (`-t`). */
				targetWindow: TmuxFlag("-t", Schema.NonEmptyString),
			}),
		),
	),
	output: TmuxOutput.string(),
});
