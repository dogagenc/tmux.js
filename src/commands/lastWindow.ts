import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Select the previously selected window (`tmux last-window`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.lastWindow({ targetSession: "work" });
 * ```
 */
export const lastWindow = TmuxCommand.make("lastWindow", {
	cmd: "last-window",
	flags: Schema.Struct({
		/** Target session whose last (previously selected) window is selected (`-t`). */
		targetSession: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
