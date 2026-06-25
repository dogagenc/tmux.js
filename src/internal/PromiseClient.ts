import { Cause, Effect, Exit, Layer } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";
import * as commands from "../commands/index.js";
import { decodeConfig, type TmuxClientConfig } from "./Config.js";
import { TmuxProcess } from "./Process.js";

type PlatformLayer = Layer.Layer<
	ChildProcessSpawner.ChildProcessSpawner,
	unknown,
	never
>;

export type PromiseCommands<T> = {
	[K in keyof T]: T[K] extends (
		...args: infer Args
	) => Effect.Effect<infer A, unknown, TmuxProcess>
		? (...args: Args) => Promise<A>
		: never;
};

class TmuxClientBase {
	constructor(readonly config: TmuxClientConfig = {}) {}
}

export type TmuxPromiseClient = TmuxClientBase &
	PromiseCommands<typeof commands>;

const run = async <A, E>(
	effect: Effect.Effect<A, E, TmuxProcess>,
	config: TmuxClientConfig,
	platformLayer: PlatformLayer,
): Promise<A> => {
	const program = decodeConfig(config).pipe(
		Effect.flatMap((decodedConfig) =>
			effect.pipe(
				Effect.provide(
					TmuxProcess.layer(decodedConfig).pipe(Layer.provide(platformLayer)),
				),
			),
		),
	);
	const exit = await Effect.runPromiseExit(program);
	if (Exit.isSuccess(exit)) return exit.value;
	throw Cause.squash(exit.cause);
};

export const makePromiseClient = (platformLayer: PlatformLayer) => {
	const entries = Object.keys(commands).map((key) => {
		const name = key as keyof typeof commands;
		// biome-ignore lint/performance/noDynamicNamespaceImportAccess: Dynamic import access is good for tree-shaking but we want to include all commands in the client here
		const command = commands[name] as (
			...args: ReadonlyArray<never>
		) => Effect.Effect<unknown, unknown, TmuxProcess>;
		return [
			name,
			function (this: TmuxPromiseClient, ...args: ReadonlyArray<never>) {
				return run(command(...args), this.config, platformLayer);
			},
		] as const;
	});

	class TmuxClient extends TmuxClientBase {}
	Object.assign(TmuxClient.prototype, Object.fromEntries(entries));

	return TmuxClient as {
		new (config?: TmuxClientConfig): TmuxPromiseClient;
	};
};
