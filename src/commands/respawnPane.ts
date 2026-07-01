import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Reuse a tmux pane, running a new command in it (`tmux respawn-pane`).
 *
 * @returns An empty string on success.
 *
 * @example
 * ```ts
 * await tmux.respawnPane("htop", { kill: true, targetPane: "work:1.1" });
 * ```
 */
export const respawnPane = TmuxCommand.make("respawnPane", {
	cmd: "respawn-pane",
	flags: Schema.Struct({
		/** Kill any command still running in the pane before respawning (`-k`). */
		kill: TmuxFlag("-k", Schema.Boolean),
		/** Working directory for the respawned pane (`-c`). */
		startDirectory: TmuxFlag("-c", Schema.NonEmptyString),
		/** Set an environment variable as `NAME=value` (`-e`). */
		environment: TmuxFlag("-e", Schema.NonEmptyString),
		/** Target pane to respawn (`-t`). */
		targetPane: TmuxFlag("-t", Schema.NonEmptyString),
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
