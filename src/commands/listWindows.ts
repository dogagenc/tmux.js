import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * List tmux windows (`tmux list-windows`).
 *
 * @returns One record per window.
 *
 * @example
 * ```ts
 * const windows = await tmux.listWindows({ targetSession: "work" });
 * ```
 */
export const listWindows = TmuxCommand.make("listWindows", {
	cmd: "list-windows",
	flags: Schema.Struct({
		/** List windows from all sessions (`-a`). */
		all: TmuxFlag("-a", Schema.Boolean),
		/** Filter windows by tmux format expression (`-f`). */
		filter: TmuxFlag("-f", Schema.NonEmptyString),
		/** Target session whose windows are listed (`-t`). */
		targetSession: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.formattedLines([
		"window_id",
		"window_index",
		"window_name",
		"window_raw_flags",
		"window_panes",
		"window_width",
		"window_height",
		"window_layout",
		"window_active",
	]),
});
