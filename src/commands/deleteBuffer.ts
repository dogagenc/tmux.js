import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Delete a tmux paste buffer (`tmux delete-buffer`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.deleteBuffer({ bufferName: "probe" });
 * ```
 */
export const deleteBuffer = TmuxCommand.make("deleteBuffer", {
	cmd: "delete-buffer",
	flags: Schema.Struct({
		/** Buffer name to delete (`-b`); if omitted, the most recent automatically-named buffer is deleted. */
		bufferName: TmuxFlag("-b", Schema.NonEmptyString),
	}),
	output: TmuxOutput.string(),
});
