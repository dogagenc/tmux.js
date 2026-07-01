import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Apply a layout to a window (`tmux select-layout`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.selectLayout("tiled", { targetPane: "work:1" });
 *
 * await tmux.selectLayout(undefined, { next: true });
 * ```
 */
export const selectLayout = TmuxCommand.make("selectLayout", {
	cmd: "select-layout",
	flags: Schema.Struct({
		/** Spread the current pane and its neighbours out evenly (`-E`). */
		spreadEvenly: TmuxFlag("-E", Schema.Boolean),
		/** Equivalent to next-layout (`-n`). */
		next: TmuxFlag("-n", Schema.Boolean),
		/** Reapply the last set layout, undoing the most recent change (`-o`). */
		undo: TmuxFlag("-o", Schema.Boolean),
		/** Equivalent to previous-layout (`-p`). */
		previous: TmuxFlag("-p", Schema.Boolean),
		/** Target pane whose window layout is changed (`-t`). */
		targetPane: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	args: TmuxCommand.args(
		1,
		Schema.Tuple([Schema.optionalKey(Schema.NonEmptyString)]),
		(layoutName) => (layoutName === undefined ? [] : [layoutName]),
	),
	output: TmuxOutput.string(),
});
