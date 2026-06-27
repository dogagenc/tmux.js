import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * List tmux panes (`tmux list-panes`).
 *
 * @returns One record per pane.
 *
 * @example
 * ```ts
 * const panes = await tmux.listPanes({ targetWindow: "work:1" });
 * const allPanes = await tmux.listPanes({ all: true, includeVariables: ["session_name", "window_name"] });
 * ```
 */
export const listPanes = TmuxCommand.make("listPanes", {
	cmd: "list-panes",
	flags: Schema.Struct({
		/** List all panes on the server; target is ignored (`-a`). */
		all: TmuxFlag("-a", Schema.Boolean),
		/** Treat target as a session and list all its panes (`-s`). */
		session: TmuxFlag("-s", Schema.Boolean),
		/** Filter panes by tmux format expression (`-f`). */
		filter: TmuxFlag("-f", Schema.NonEmptyString),
		/** Target window whose panes are listed (`-t`). */
		targetWindow: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.formattedLines([
		"pane_index",
		"pane_width",
		"pane_height",
		"history_size",
		"history_limit",
		"history_bytes",
		"pane_id",
		"pane_active",
		"pane_dead",
	]),
});
