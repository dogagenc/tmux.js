import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Rename a tmux window (`tmux rename-window`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.renameWindow("editor", { targetWindow: "0" });
 * ```
 */
export const renameWindow = TmuxCommand.make("renameWindow", {
	cmd: "rename-window",
	flags: Schema.Struct({
		/** Target window to rename (`-t`). */
		targetWindow: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	args: TmuxCommand.args(
		1,
		Schema.Tuple([Schema.NonEmptyString]),
		(newName) => [newName],
	),
	output: TmuxOutput.string(),
});
