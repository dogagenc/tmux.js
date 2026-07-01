import { Schema } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Test whether a tmux session exists (`tmux has-session`).
 *
 * @returns `true` when the target session exists, `false` when it does not.
 *
 * @example
 * ```ts
 * await tmux.hasSession({ targetSession: "work" });
 * ```
 */
export const hasSession = TmuxCommand.make("hasSession", {
	cmd: "has-session",
	flags: Schema.Struct({
		/** Session to test for existence (`-t`). */
		targetSession: TmuxFlag("-t", Schema.NonEmptyString),
	}),
	output: TmuxOutput.boolFromExitCode(),
});
