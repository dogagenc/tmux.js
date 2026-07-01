import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Select a window (`tmux select-window`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.selectWindow({ targetWindow: "work:1" });
 *
 * await tmux.selectWindow({ next: true });
 * ```
 */
export const selectWindow = TmuxCommand.make("selectWindow", {
	cmd: "select-window",
	flags: Schema.Struct({
		/** Select the last (previously current) window (`-l`). */
		last: TmuxFlag("-l", Schema.Boolean),
		/** Select the next window (`-n`). */
		next: TmuxFlag("-n", Schema.Boolean),
		/** Select the previous window (`-p`). */
		previous: TmuxFlag("-p", Schema.Boolean),
		/** Toggle to the last window when the target is already current (`-T`). */
		toggle: TmuxFlag("-T", Schema.Boolean),
		/** Target window to select (`-t`). */
		targetWindow: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
