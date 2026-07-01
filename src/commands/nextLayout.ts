import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Move a window to its next layout (`tmux next-layout`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.nextLayout({ targetWindow: "work:1" });
 * ```
 */
export const nextLayout = TmuxCommand.make("nextLayout", {
	cmd: "next-layout",
	flags: Schema.Struct({
		/** Target window to move to its next layout (`-t`). */
		targetWindow: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
