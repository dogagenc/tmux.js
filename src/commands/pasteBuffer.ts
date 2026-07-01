import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Paste a tmux paste buffer into a pane (`tmux paste-buffer`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.pasteBuffer({ bufferName: "greeting", targetPane: "work:1.1" });
 * ```
 */
export const pasteBuffer = TmuxCommand.make("pasteBuffer", {
	cmd: "paste-buffer",
	flags: Schema.Struct({
		/** Delete the paste buffer after inserting it (`-d`). */
		delete: TmuxFlag("-d", Schema.Boolean),
		/** Insert verbatim with no LF replacement (`-r`). */
		raw: TmuxFlag("-r", Schema.Boolean),
		/** Insert bracketed-paste control codes if the app requested bracketed paste mode (`-p`). */
		bracketed: TmuxFlag("-p", Schema.Boolean),
		/** Replace LF with this separator instead of the default CR (`-s`). */
		separator: TmuxFlag("-s", Schema.String),
		/** Name of the paste buffer to insert (`-b`). */
		bufferName: TmuxFlag("-b", Schema.NonEmptyString),
		/** Target pane to paste into (`-t`). */
		targetPane: TmuxFlag("-t", Schema.NonEmptyString),
		// ponytail: -p (bracketed) has no integration test — it only emits when
		// the receiving app requests bracketed paste, which a headless shell never does.
	}),
	output: TmuxOutput.string(),
});
