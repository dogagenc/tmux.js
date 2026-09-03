import { Schema } from "effect";

/**
 * tmux binary could not be spawned because it is missing from PATH
 * (spawn-level `PlatformError` with `reason._tag === "NotFound"`).
 */
export class TmuxExecutableNotFound extends Schema.TaggedError<TmuxExecutableNotFound>()(
	"TmuxExecutableNotFound",
	{
		executable: Schema.String,
		cause: Schema.Defect(),
	},
) {}

/**
 * Any lower-level platform failure that is not a clean run-and-exit-nonzero:
 * non-`NotFound` spawn failure, stdout/stderr stream read failure, `exitCode`
 * await failure, permission denied, signal interruption. tmux did not run to a
 * nonzero exit — something below that broke.
 */
export class TmuxProcessError extends Schema.TaggedError<TmuxProcessError>()(
	"TmuxProcessError",
	{
		cause: Schema.Defect(),
	},
) {}

/** No tmux server is running (covers both no-server stderr forms). */
export class TmuxServerNotRunning extends Schema.TaggedError<TmuxServerNotRunning>()(
	"TmuxServerNotRunning",
	{
		stderr: Schema.String,
	},
) {}

/** tmux could not find the requested session/window/pane/client. */
export class TmuxTargetNotFound extends Schema.TaggedError<TmuxTargetNotFound>()(
	"TmuxTargetNotFound",
	{
		stderr: Schema.String,
	},
) {}

/** tmux ran and exited nonzero for an unclassified reason. */
export class TmuxCommandError extends Schema.TaggedError<TmuxCommandError>()(
	"TmuxCommandError",
	{
		stderr: Schema.String,
		exitCode: Schema.Number,
	},
) {}

/**
 * A tmux output line did not match the expected schema. Two sub-cases under one
 * tag (same caller recovery; differing fields are diagnostic only):
 * - field-count mismatch:  `{ line, message, expected, got }`
 * - schema decode failure: `{ line, message, cause }`
 */
export class TmuxParseError extends Schema.TaggedError<TmuxParseError>()(
	"TmuxParseError",
	{
		line: Schema.String,
		message: Schema.String,
		expected: Schema.optional(Schema.Number),
		got: Schema.optional(Schema.Number),
		cause: Schema.optional(Schema.Defect()),
	},
) {}

/**
 * A caller passed invalid options to a command: an unknown key or a wrong-typed
 * value. Raised before tmux is spawned, so a typo never reaches the shell.
 * Distinct from `TmuxParseError`, which is about decoding tmux's *output*.
 */
export class TmuxCommandOptionsError extends Schema.TaggedError<TmuxCommandOptionsError>()(
	"TmuxCommandOptionsError",
	{
		command: Schema.String,
		message: Schema.String,
		cause: Schema.Defect(),
	},
) {}

/**
 * A caller passed invalid client config: an unknown key, a wrong-typed value, or
 * `socketName` and `socketPath` together. Raised when the client/layer is
 * built, before any command runs. The client analogue of
 * `TmuxCommandOptionsError` (which is per-command and carries a `command`).
 */
export class TmuxClientConfigError extends Schema.TaggedError<TmuxClientConfigError>()(
	"TmuxClientConfigError",
	{
		message: Schema.String,
		cause: Schema.Defect(),
	},
) {}
