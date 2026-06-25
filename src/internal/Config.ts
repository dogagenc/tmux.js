import { Effect, Schema, Tuple } from "effect";
import { TmuxClientConfigError } from "../Errors.js";

/**
 * Connection options shared by both the Promise client (`new TmuxClient(config)`)
 * and the Effect layer (`TmuxClient.layer(config)`). All fields are optional;
 * `{}` targets the default tmux server via the `tmux` binary on `PATH`.
 *
 * `socketName` and `socketPath` are mutually exclusive — passing both is a type
 * error, and also rejected at decode with `TmuxClientConfigError`. Each union
 * member forbids the other socket field via `optional(Never)`; both members still
 * permit neither, so `{}` stays valid.
 */
export const TmuxClientConfig = Schema.Union([
	Schema.Struct({
		/** Server socket name, passed as `tmux -L <name>`. */
		socketName: Schema.optional(Schema.NonEmptyString),
		socketPath: Schema.optional(Schema.Never),
	}),
	Schema.Struct({
		socketName: Schema.optional(Schema.Never),
		/** Absolute server socket path, passed as `tmux -S <path>`. */
		socketPath: Schema.optional(Schema.NonEmptyString),
	}),
]).mapMembers(
	Tuple.map(
		Schema.fieldsAssign({
			/** tmux binary to invoke. Defaults to `"tmux"` resolved from `PATH`. */
			executable: Schema.optional(Schema.NonEmptyString),
		}),
	),
);

export type TmuxClientConfig = Schema.Schema.Type<typeof TmuxClientConfig>;

export const decodeConfig = (config: TmuxClientConfig) =>
	Schema.decodeUnknownEffect(TmuxClientConfig, {
		onExcessProperty: "error",
	})(config).pipe(
		Effect.mapError(
			(cause) =>
				new TmuxClientConfigError({
					message: "Invalid TmuxClient config",
					cause,
				}),
		),
	);
