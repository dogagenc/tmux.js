import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * List tmux sessions (`tmux list-sessions`).
 *
 * @returns One record per session.
 *
 * @example
 * ```ts
 * const sessions = await tmux.listSessions();
 * ```
 */
export const listSessions = TmuxCommand.make("listSessions", {
	cmd: "list-sessions",
	flags: Schema.Struct({
		/** Filter sessions by tmux format expression (`-f`). */
		filter: TmuxFlag("-f", Schema.NonEmptyString),
	}),
	output: TmuxOutput.formattedLines([
		"session_id",
		"session_name",
		"session_windows",
		"session_created",
		"session_grouped",
		"session_group",
		"session_attached",
	]),
});
