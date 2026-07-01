import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Split a tmux pane into a new pane (`tmux split-window`).
 *
 * @returns The `-P` formatted line when `{ print: true }`, otherwise an empty string.
 *
 * @example
 * ```ts
 * await tmux.splitWindow(undefined, { horizontal: true, detached: true });
 *
 * const line = await tmux.splitWindow("htop", { print: true, size: "30%" });
 * ```
 */
export const splitWindow = TmuxCommand.make("splitWindow", {
	cmd: "split-window",
	flags: Schema.Struct({
		/** Create the new pane to the left of or above the target pane (`-b`). */
		before: TmuxFlag("-b", Schema.Boolean),
		/** Do not make the new pane the active pane (`-d`). */
		detached: TmuxFlag("-d", Schema.Boolean),
		/** Set an environment variable as `NAME=value` (`-e`). */
		environment: TmuxFlag("-e", Schema.NonEmptyString),
		/** Create a full-height (or full-width with `horizontal`) pane (`-f`). */
		full: TmuxFlag("-f", Schema.Boolean),
		/** Split horizontally (left/right) instead of vertically (`-h`). */
		horizontal: TmuxFlag("-h", Schema.Boolean),
		/** Split vertically (top/bottom); the default (`-v`). */
		vertical: TmuxFlag("-v", Schema.Boolean),
		/** Print information about the new pane after it is created (`-P`). */
		print: TmuxFlag("-P", Schema.Boolean),
		/** Zoom the resulting pane (`-Z`). */
		zoom: TmuxFlag("-Z", Schema.Boolean),
		/** Working directory for the new pane (`-c`). */
		startDirectory: TmuxFlag("-c", Schema.NonEmptyString),
		/** Format for `-P` output; default `#{session_name}:#{window_index}.#{pane_index}` (`-F`). */
		format: TmuxFlag("-F", Schema.NonEmptyString),
		/** Size in lines/columns, or a percentage string ending in `%` (`-l`). */
		size: TmuxFlag("-l", Schema.Union([Schema.Int, Schema.NonEmptyString])),
		/** Target pane to split (`-t`). */
		targetPane: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	// single shell-command string; the multi-arg argv form (`argument ...`)
	// is intentionally not exposed — the shell string covers the common case.
	// -I (empty pane + stdin forwarding) needs interactive stdin IO — deferred.
	args: TmuxCommand.args(
		1,
		Schema.Tuple([Schema.optionalKey(Schema.String)]),
		(shellCommand) => (shellCommand === undefined ? [] : [shellCommand]),
	),
	output: TmuxOutput.string({ stripTrailingNewline: true }),
});
