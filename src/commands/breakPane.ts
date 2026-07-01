import { Schema, Tuple } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Break a pane off into a new window (`tmux break-pane`).
 *
 * @returns The `-P` formatted line when `{ print: true }`, otherwise an empty string.
 *
 * @example
 * ```ts
 * await tmux.breakPane({ srcPane: "work:1.0", detached: true });
 *
 * const line = await tmux.breakPane({ srcPane: "work:1.0", print: true });
 * ```
 */
export const breakPane = TmuxCommand.make("breakPane", {
	cmd: "break-pane",
	/** after (`-a`) and before (`-b`) are mutually exclusive */
	flags: Schema.Union([
		Schema.Struct({
			/** Move the new window to the index after `dstWindow` (`-a`). */
			after: TmuxFlag("-a", Schema.Boolean),
			before: Schema.optional(Schema.Literal(false)),
		}),
		Schema.Struct({
			/** Move the new window to the index before `dstWindow` (`-b`). */
			before: TmuxFlag("-b", Schema.Boolean),
			after: Schema.optional(Schema.Literal(false)),
		}),
	]).mapMembers(
		Tuple.map(
			Schema.fieldsAssign({
				/** Do not make the new window the current window (`-d`). */
				detached: TmuxFlag("-d", Schema.Boolean),
				/** Print information about the new window (`-P`). */
				print: TmuxFlag("-P", Schema.Boolean),
				/** Format for `-P` output; default `#{session_name}:#{window_index}.#{pane_index}` (`-F`). */
				format: TmuxFlag("-F", Schema.NonEmptyString),
				/** Name for the new window (`-n`). */
				windowName: TmuxFlag("-n", Schema.NonEmptyString),
				/** Source pane to break off (`-s`). */
				srcPane: TmuxFlag("-s", Schema.NonEmptyString),
				/** Destination window location (`-t`). */
				dstWindow: TmuxFlag("-t", Schema.NonEmptyString),
			}),
		),
	),
	output: TmuxOutput.string({ stripTrailingNewline: true }),
});
