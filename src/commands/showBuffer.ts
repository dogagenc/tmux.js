import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Show the contents of a tmux paste buffer (`tmux show-buffer`).
 *
 * @returns The buffer text.
 *
 * @example
 * ```ts
 * const latest = await tmux.showBuffer();
 * ```
 */
export const showBuffer = TmuxCommand.make("showBuffer", {
	cmd: "show-buffer",
	flags: Schema.Struct({
		/** Buffer name to show (`-b`). */
		bufferName: TmuxFlag("-b", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
