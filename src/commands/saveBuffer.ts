import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Save a tmux paste buffer to a file (`tmux save-buffer`).
 *
 * @returns The buffer contents when path is `-`, otherwise an empty string.
 *
 * @example
 * ```ts
 * await tmux.saveBuffer("./notes.txt", { bufferName: "notes" });
 * ```
 */
export const saveBuffer = TmuxCommand.make("saveBuffer", {
	cmd: "save-buffer",
	flags: Schema.Struct({
		/** Append to the file instead of overwriting it (`-a`). */
		append: TmuxFlag("-a", Schema.Boolean),
		/** Name of the buffer to save, defaulting to the most recent (`-b`). */
		bufferName: TmuxFlag("-b", Schema.NonEmptyString),
	}),
	// path is required; '-' writes the buffer contents to stdout.
	args: TmuxCommand.args(1, Schema.Tuple([Schema.NonEmptyString]), (path) => [
		path,
	]),
	// trailing newline preserved: buffer contents pass through verbatim.
	output: TmuxOutput.string(),
});
