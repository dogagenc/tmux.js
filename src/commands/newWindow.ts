import { Schema, Tuple } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Create a new tmux window (`tmux new-window`).
 *
 * @returns The `-P` formatted line when `{ print: true }`, otherwise an empty string.
 *
 * @example
 * ```ts
 * await tmux.newWindow(undefined, { targetWindow: "work", detached: true });
 *
 * const line = await tmux.newWindow("htop", { windowName: "mon", print: true });
 * ```
 */
export const newWindow = TmuxCommand.make("newWindow", {
	cmd: "new-window",
	/** after (`-a`) and before (`-b`) are mutually exclusive */
	flags: Schema.Union([
		Schema.Struct({
			/** Insert the new window after `targetWindow`, moving later windows up (`-a`). */
			after: TmuxFlag("-a", Schema.Boolean),
			before: Schema.optional(Schema.Literal(false)),
		}),
		Schema.Struct({
			/** Insert the new window before `targetWindow`, moving later windows up (`-b`). */
			before: TmuxFlag("-b", Schema.Boolean),
			after: Schema.optional(Schema.Literal(false)),
		}),
	]).mapMembers(
		Tuple.map(
			Schema.fieldsAssign({
				/** Do not make the new window the current window (`-d`). */
				detached: TmuxFlag("-d", Schema.Boolean),
				/** Destroy an existing window at the target index instead of failing (`-k`). */
				destroyExisting: TmuxFlag("-k", Schema.Boolean),
				/** Print information about the new window after it is created (`-P`). */
				print: TmuxFlag("-P", Schema.Boolean),
				/** Select an existing window with the same `windowName` instead of creating one (`-S`). */
				selectExisting: TmuxFlag("-S", Schema.Boolean),
				/** Working directory for the new window (`-c`). */
				startDirectory: TmuxFlag("-c", Schema.NonEmptyString),
				/** Set an environment variable as `VARIABLE=value` (`-e`). */
				environment: TmuxFlag("-e", Schema.NonEmptyString),
				/** Format for `-P` output; default `#{session_name}:#{window_index}.#{pane_index}` (`-F`). */
				format: TmuxFlag("-F", Schema.NonEmptyString),
				/** Name for the new window (`-n`). */
				windowName: TmuxFlag("-n", Schema.NonEmptyString),
				/** Target window location, or insertion reference with `after`/`before` (`-t`). */
				targetWindow: TmuxFlag("-t", Schema.NonEmptyString),
			}),
		),
	),
	// single shell-command string; the multi-arg argv form (`argument ...`)
	// is intentionally not exposed — the shell string covers the common case.
	args: TmuxCommand.args(
		1,
		Schema.Tuple([Schema.optionalKey(Schema.String)]),
		(shellCommand) => (shellCommand === undefined ? [] : [shellCommand]),
	),
	output: TmuxOutput.string({ stripTrailingNewline: true }),
});
