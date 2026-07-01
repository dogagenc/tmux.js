import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Load a tmux paste buffer from a file (`tmux load-buffer`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.loadBuffer("./notes.txt", { bufferName: "notes" });
 * ```
 */
export const loadBuffer = TmuxCommand.make("loadBuffer", {
	cmd: "load-buffer",
	flags: Schema.Struct({
		/** Buffer name to load into, created if absent (`-b`). */
		bufferName: TmuxFlag("-b", Schema.NonEmptyString),
		/** Also send the buffer to the clipboard for the target client (`-w`). */
		clipboard: TmuxFlag("-w", Schema.Boolean),
		/** Target client for the clipboard escape (`-t`). */
		targetClient: TmuxFlag("-t", Schema.NonEmptyString),
		// -w/-t are client-only: unobservable headless until pty/client-attach
		// support lands. Argv-covered in the unit test.
	}),
	// path is required; '-' reads from stdin.
	args: TmuxCommand.args(1, Schema.Tuple([Schema.NonEmptyString]), (path) => [
		path,
	]),
	output: TmuxOutput.string(),
});
