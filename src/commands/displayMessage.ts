import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Display a message in a client's status line, or evaluate a tmux format
 * (`tmux display-message`).
 *
 * The optional positional `message` is the text or format to show; omit it (with
 * `{ print: true }`) to print an expanded format such as `-F`/`format` to stdout.
 * With `{ print: true }` the resolved string is returned (trailing newline
 * stripped); otherwise it shows in the status line and resolves to an empty
 * string.
 *
 * @example
 * ```ts
 * // Flash a message in the status line
 * await tmux.displayMessage("deploy finished");
 *
 * // Evaluate a format and read it back
 * const name = await tmux.displayMessage("#{session_name}", { print: true });
 * ```
 */
export const displayMessage = TmuxCommand.make("displayMessage", {
	cmd: "display-message",
	flags: Schema.Struct({
		/** List format variables and their values (`-a`). */
		all: TmuxFlag("-a", Schema.Boolean),
		/** Keep the pane updating while the message is displayed (`-C`). */
		continueUpdate: TmuxFlag("-C", Schema.Boolean),
		/** Print the message unchanged; do not expand formats (`-l`). */
		literal: TmuxFlag("-l", Schema.Boolean),
		/** Ignore key presses; close only after `delay` expires (`-N`). */
		ignoreKeys: TmuxFlag("-N", Schema.Boolean),
		/** Print to stdout instead of showing in the status line (`-p`). */
		print: TmuxFlag("-p", Schema.Boolean),
		/** Print verbose format parsing logs (`-v`). */
		verbose: TmuxFlag("-v", Schema.Boolean),
		/** Target client whose status line receives the message (`-c`). */
		targetClient: TmuxFlag("-c", Schema.NonEmptyString),
		/** Display duration in milliseconds; zero waits for a key press (`-d`). */
		delay: TmuxFlag("-d", Schema.Finite),
		/** Format string passed with `-F`. */
		format: TmuxFlag("-F", Schema.NonEmptyString),
		/** Target pane used for format context (`-t`). */
		targetPane: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	args: TmuxCommand.args(
		1,
		Schema.Tuple([Schema.optionalKey(Schema.String)]),
		(message) => (message === undefined ? [] : [message]),
	),
	output: TmuxOutput.string({ stripTrailingNewline: true }),
});
