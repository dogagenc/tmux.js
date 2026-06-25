import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { SessionFields, WindowFields } from "../internal/FormatFields.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * List tmux windows (`tmux list-windows`).
 *
 * Resolves to an array of records combining {@link WindowFields} with the
 * {@link SessionFields} of the owning session — tmux's `list-windows` exposes
 * session format variables too. A missing server surfaces as
 * `TmuxServerNotRunning` (the shared `TmuxCommand.make` path classifies it;
 * nothing is swallowed into "zero windows").
 *
 * By default lists windows of the current/target session; pass `{ all: true }`
 * to list across every session.
 *
 * @example
 * ```ts
 * const windows = await tmux.listWindows({ targetSession: "work" });
 * const everywhere = await tmux.listWindows({ all: true });
 * ```
 */
export const listWindows = TmuxCommand.make("listWindows", {
	cmd: "list-windows",
	flags: Schema.Struct({
		/** List windows from all sessions (`-a`). */
		all: TmuxFlag("-a", Schema.Boolean),
		/** Filter windows by tmux format expression (`-f`). */
		filter: TmuxFlag("-f", Schema.NonEmptyString),
		/** Target session whose windows are listed (`-t`). */
		targetSession: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.formattedLines({
		...SessionFields,
		...WindowFields,
	}),
});
