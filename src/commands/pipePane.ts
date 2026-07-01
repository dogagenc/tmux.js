import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Pipe a tmux pane's output to (or input from) a shell command (`tmux pipe-pane`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.pipePane("cat >> /tmp/log", { targetPane: "0" });
 *
 * // omit the command to close any existing pipe
 * await tmux.pipePane();
 * ```
 */
export const pipePane = TmuxCommand.make("pipePane", {
	cmd: "pipe-pane",
	flags: Schema.Struct({
		/** Connect the command's stdout to the pane, writing into it (`-I`). */
		input: TmuxFlag("-I", Schema.Boolean),
		/** Connect the pane's output to the command's stdin (`-O`); the default. */
		output: TmuxFlag("-O", Schema.Boolean),
		/** Only open a new pipe if no previous pipe exists (`-o`). */
		onlyOpen: TmuxFlag("-o", Schema.Boolean),
		/** Target pane to pipe (`-t`). */
		targetPane: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	args: TmuxCommand.args(
		1,
		Schema.Tuple([Schema.optionalKey(Schema.String)]),
		(shellCommand) => (shellCommand === undefined ? [] : [shellCommand]),
	),
	output: TmuxOutput.string(),
});
