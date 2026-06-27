import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TmuxClientConfigError } from "../src/Errors";
import { TmuxClient } from "../src/exports/effect";
import {
	capturingTmux,
	fakeHandle,
	flagArgs,
	spawnerWith,
	tmuxLayer,
} from "./utils";

const empty = { stdout: "", stderr: "", exitCode: 0 };

describe("argv socket and executable mapping", () => {
	it.effect("TmuxClient options set executable and socket args", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty, {
				executable: "/custom/tmux",
				socketName: "test",
			});

			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.listSessions();
			}).pipe(Effect.provide(harness.layer));

			expect(harness.captured.command).toBe("/custom/tmux");
			expect(flagArgs(harness.captured.args)).toEqual([
				"-L",
				"test",
				"list-sessions",
			]);
		}),
	);

	it.effect("TmuxClient options set the -S socketPath arg", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty, { socketPath: "/tmp/foo.sock" });

			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.listSessions();
			}).pipe(Effect.provide(harness.layer));

			expect(flagArgs(harness.captured.args)).toEqual([
				"-S",
				"/tmp/foo.sock",
				"list-sessions",
			]);
		}),
	);
});

describe("client options validation", () => {
	it.effect("rejects socketName + socketPath together at layer build", () =>
		Effect.gen(function* () {
			const error = yield* Effect.flip(
				Effect.gen(function* () {
					const tmux = yield* TmuxClient;
					yield* tmux.listSessions();
				}).pipe(
					Effect.provide(
						tmuxLayer(spawnerWith(fakeHandle(empty)), {
							socketName: "a",
							socketPath: "b",
						} as never),
					),
				),
			);
			expect(error).toBeInstanceOf(TmuxClientConfigError);
		}),
	);
});
