import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Set the contents of a tmux paste buffer (`tmux set-buffer`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.setBuffer("hello", { bufferName: "greeting" });
 * ```
 */
export const setBuffer = TmuxCommand.make("setBuffer", {
	cmd: "set-buffer",
	flags: Schema.Struct({
		/** Append to the buffer instead of overwriting it (`-a`). */
		append: TmuxFlag("-a", Schema.Boolean),
		/** Also send the buffer to the clipboard via the xterm escape (`-w`). */
		clipboard: TmuxFlag("-w", Schema.Boolean),
		/** Name of the buffer to set (`-b`). */
		bufferName: TmuxFlag("-b", Schema.NonEmptyString),
		/** Rename the buffer to this new name (`-n`). */
		newBufferName: TmuxFlag("-n", Schema.NonEmptyString),
		/** Target client used with `clipboard` (`-t`). */
		targetClient: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	// data is optional only when -n renames an existing buffer; tmux enforces
	// "no data specified" at runtime, so don't model the cross-field rule here.
	args: TmuxCommand.args(
		1,
		Schema.Tuple([Schema.optionalKey(Schema.String)]),
		(data) => (data === undefined ? [] : [data]),
	),
	output: TmuxOutput.string(),
});
