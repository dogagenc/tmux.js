import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Rename a tmux session (`tmux rename-session`).
 *
 * The required positional `newName` is the target name; without `targetSession`
 * the current session is renamed (an unknown one fails with
 * `TmuxTargetNotFound`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.renameSession("release", { targetSession: "work" });
 * ```
 */
export const renameSession = TmuxCommand.make("renameSession", {
	cmd: "rename-session",
	flags: Schema.Struct({
		/** Target session to rename (`-t`). */
		targetSession: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	args: TmuxCommand.args(
		1,
		Schema.Tuple([Schema.NonEmptyString]),
		(newName) => [newName],
	),
	output: TmuxOutput.string(),
});
