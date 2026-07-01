import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Send keys to a tmux pane (`tmux send-keys`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.sendKeys("C-a", { targetPane: "work:1.1" });
 * ```
 */
export const sendKeys = TmuxCommand.make("sendKeys", {
	cmd: "send-keys",
	flags: Schema.Struct({
		/** Expand formats in the key argument where appropriate (`-F`). */
		expandFormats: TmuxFlag("-F", Schema.Boolean),
		/** Treat each key as a hexadecimal ASCII character code (`-H`). */
		hex: TmuxFlag("-H", Schema.Boolean),
		/** Disable key-name lookup; send keys as literal UTF-8 characters (`-l`). */
		literal: TmuxFlag("-l", Schema.Boolean),
		/** Repeat the keys this many times (`-N`). */
		repeatCount: TmuxFlag("-N", Schema.Int),
		/** Target pane to receive the keys (`-t`). */
		targetPane: TmuxFlag("-t", Schema.NonEmptyString),
		// -K (send to client key table), -c (target-client), and -R (reset
		// terminal) have no deterministic headless effect — defer.
		// key: TmuxFlag("-K", Schema.Boolean),
		// targetClient: TmuxFlag("-c", Schema.NonEmptyString),
		// reset: TmuxFlag("-R", Schema.Boolean),
		// -M (mouse passthrough) and -X (copy-mode command) only work inside a
		// mouse/copy-mode binding — defer until interactive support lands.
		// mouse: TmuxFlag("-M", Schema.Boolean),
		// copyMode: TmuxFlag("-X", Schema.Boolean),
	}),
	// single key positional; the variadic `key ...` needs rest-positional +
	// trailing-options core support — defer until needed.
	args: TmuxCommand.args(
		1,
		Schema.Tuple([Schema.optionalKey(Schema.String)]),
		(key) => (key === undefined ? [] : [key]),
	),
	output: TmuxOutput.string(),
});
