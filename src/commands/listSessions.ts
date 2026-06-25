import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { SessionFields } from "../internal/FormatFields.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * List tmux sessions (`tmux list-sessions`).
 *
 * Resolves to an array of {@link SessionFields} records — `session_id`,
 * `session_name`, window count, attached-client count, and creation `Date`.
 * Mirrors tmux: with no server running, fails with `TmuxServerNotRunning` rather
 * than returning an empty array.
 *
 * @example
 * ```ts
 * const all = await tmux.listSessions();
 * const work = await tmux.listSessions({ filter: "#{m:work*,#{session_name}}" });
 * ```
 */
export const listSessions = TmuxCommand.make("listSessions", {
	cmd: "list-sessions",
	flags: Schema.Struct({
		/** Filter sessions by tmux format expression (`-f`). */
		filter: TmuxFlag("-f", Schema.NonEmptyString),
	}),
	output: TmuxOutput.formattedLines(SessionFields),
});
