import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Move a window to its previous layout (`tmux previous-layout`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.previousLayout({ targetWindow: "work:1" });
 * ```
 */
export const previousLayout = TmuxCommand.make("previousLayout", {
	cmd: "previous-layout",
	flags: Schema.Struct({
		/** Target window to move to its previous layout (`-t`). */
		targetWindow: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
