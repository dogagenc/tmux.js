import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Create a new tmux session (`tmux new-session`). Starts the server if none is
 * running.
 *
 * @returns The `-P` formatted line when `{ print: true }`, otherwise an empty string.
 *
 * @example
 * ```ts
 * await tmux.newSession(undefined, { sessionName: "work", detached: true });
 *
 * const name = await tmux.newSession("htop", { sessionName: "mon", detached: true, print: true });
 * ```
 */
export const newSession = TmuxCommand.make("newSession", {
	cmd: "new-session",
	flags: Schema.Struct({
		// TODO: attach-only flag; restore when interactive attach is supported.
		// -A routes to attach-session on an existing session, which errors
		// ("not a terminal") in this headless library even with -d.
		// /** Behave like attach-session if `sessionName` already exists (`-A`). */
		// attachIfExists: TmuxFlag("-A", Schema.Boolean),
		/** Always detach; attaching needs a TTY this library does not provide (`-d`). */
		detached: TmuxFlag("-d", Schema.Literal(true), { required: true }),
		// TODO: attach-only flag; restore when interactive attach is supported.
		// /** With `attachIfExists`, detach other clients like `attach-session -d` (`-D`). */
		// detachOther: TmuxFlag("-D", Schema.Boolean),
		/** Do not apply the `update-environment` option (`-E`). */
		noUpdateEnvironment: TmuxFlag("-E", Schema.Boolean),
		/** Print information about the new session after it is created (`-P`). */
		print: TmuxFlag("-P", Schema.Boolean),
		// TODO: attach-only flag; restore when interactive attach is supported.
		// /** With `attachIfExists`, behave like `attach-session -x` (`-X`). */
		// sighupParentOnDetach: TmuxFlag("-X", Schema.Boolean),
		/** Working directory for the session (`-c`). */
		startDirectory: TmuxFlag("-c", Schema.NonEmptyString),
		/** Set an environment variable as `VARIABLE=value` (`-e`). */
		environment: TmuxFlag("-e", Schema.NonEmptyString),
		/** Format for `-P` output; default `#{session_name}:` (`-F`). */
		format: TmuxFlag("-F", Schema.NonEmptyString),
		// TODO: client/attach-only flag; restore when interactive attach is supported.
		// /** Comma-separated list of client flags (`-f`). */
		// clientFlags: TmuxFlag("-f", Schema.NonEmptyString),
		/** Name of the initial window; invalid with `targetSession` (`-n`). */
		windowName: TmuxFlag("-n", Schema.NonEmptyString),
		/** Name for the new session (`-s`). */
		sessionName: TmuxFlag("-s", Schema.NonEmptyString),
		/** Session group to add the new session to (`-t`). */
		targetSession: TmuxFlag("-t", Schema.NonEmptyString),
		/** Width when detached; `-` uses the current client size (`-x`). */
		width: TmuxFlag("-x", Schema.Union([Schema.Int, Schema.Literal("-")])),
		/** Height when detached; `-` uses the current client size (`-y`). */
		height: TmuxFlag("-y", Schema.Union([Schema.Int, Schema.Literal("-")])),
	}),
	// single shell-command positional; variadic `argument ...` needs
	// rest-positional + trailing-options core support — defer until needed.
	args: TmuxCommand.args(
		1,
		Schema.Tuple([Schema.optionalKey(Schema.String)]),
		(shellCommand) => (shellCommand === undefined ? [] : [shellCommand]),
	),
	output: TmuxOutput.string({ stripTrailingNewline: true }),
});
