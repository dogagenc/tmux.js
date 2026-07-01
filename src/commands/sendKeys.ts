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
 * await tmux.sendKeys(["echo hi", "Enter"], { targetPane: "work:1.1" });
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
		/** Reset the pane's terminal state before sending (`-R`). */
		reset: TmuxFlag("-R", Schema.Boolean),
		// -K (send to client key table) and -c (target-client) need an attached
		// client, so there is no headless effect — defer.
		// key: TmuxFlag("-K", Schema.Boolean),
		// targetClient: TmuxFlag("-c", Schema.NonEmptyString),
		// -M (mouse passthrough) and -X (copy-mode command) only work inside a
		// mouse/copy-mode binding — defer until interactive support lands.
		// mouse: TmuxFlag("-M", Schema.Boolean),
		// copyMode: TmuxFlag("-X", Schema.Boolean),
	}),
	// variadic `key ...` modeled as one array positional; encode spreads it into argv.
	args: TmuxCommand.args(
		1,
		Schema.Tuple([Schema.Array(Schema.NonEmptyString)]),
		(keys) => keys,
	),
	output: TmuxOutput.string(),
});
