import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Clear a tmux pane's scrollback history (`tmux clear-history`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.clearHistory({ targetPane: "work:1.0" });
 *
 * await tmux.clearHistory({ clearHyperlinks: true, targetPane: "work:1.0" });
 * ```
 */
export const clearHistory = TmuxCommand.make("clearHistory", {
	cmd: "clear-history",
	flags: Schema.Struct({
		/** Also remove all hyperlinks in addition to the pane history (`-H`). */
		clearHyperlinks: TmuxFlag("-H", Schema.Boolean),
		/** Pane whose scrollback history is removed and freed (`-t`). */
		targetPane: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
