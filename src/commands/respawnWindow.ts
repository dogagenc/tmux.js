import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Reuse a tmux window, running a new command in it (`tmux respawn-window`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.respawnWindow("htop", { kill: true, targetWindow: "work:1" });
 * ```
 */
export const respawnWindow = TmuxCommand.make("respawnWindow", {
	cmd: "respawn-window",
	flags: Schema.Struct({
		/** Kill any command still running in the window before respawning (`-k`). */
		kill: TmuxFlag("-k", Schema.Boolean),
		/** Working directory for the respawned window (`-c`). */
		startDirectory: TmuxFlag("-c", Schema.NonEmptyString),
		/** Set an environment variable as `NAME=value` (`-e`). */
		environment: TmuxFlag("-e", Schema.NonEmptyString),
		/** Target window to respawn (`-t`). */
		targetWindow: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	// single shell-command string; the multi-arg argv form (`argument ...`)
	// is intentionally not exposed — the shell string covers the common case.
	// -e is single-value here like every sibling (splitWindow/
	// newWindow/newSession); repeatable -e needs an array flag core lacks.
	args: TmuxCommand.args(
		1,
		Schema.Tuple([Schema.optionalKey(Schema.String)]),
		(shellCommand) => (shellCommand === undefined ? [] : [shellCommand]),
	),
	output: TmuxOutput.string(),
});
