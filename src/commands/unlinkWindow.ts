import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Unlink a window from a session (`tmux unlink-window`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.unlinkWindow({ targetWindow: "other:2" });
 *
 * await tmux.unlinkWindow({ destroy: true, targetWindow: "other:2" });
 * ```
 */
export const unlinkWindow = TmuxCommand.make("unlinkWindow", {
	cmd: "unlink-window",
	flags: Schema.Struct({
		/** Destroy the window if it is linked to only one session (`-k`). */
		destroy: TmuxFlag("-k", Schema.Boolean),
		/** Target window to unlink (`-t`). */
		targetWindow: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
