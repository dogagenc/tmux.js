import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TmuxCommandOptionsError } from "../../src/Errors";
import { TmuxClient } from "../../src/exports/effect";
import { capturingTmux, tmuxFrom } from "../utils";

const empty = { stdout: "", stderr: "", exitCode: 0 };

const captureArgs = (
	run: (tmux: TmuxClient["Service"]) => Effect.Effect<unknown, unknown>,
) => {
	const harness = capturingTmux(empty);
	return Effect.gen(function* () {
		const tmux = yield* TmuxClient;
		yield* run(tmux);
		return harness.captured.args;
	}).pipe(Effect.provide(harness.layer));
};

describe("TmuxClient.displayMessage", () => {
	it.effect("returns stdout without tmux's trailing print newline", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(
				yield* tmux.displayMessage("#{session_name}", { print: true }),
			).toBe("main");
		}).pipe(
			Effect.provide(tmuxFrom({ stdout: "main\n", stderr: "", exitCode: 0 })),
		),
	);

	it.effect("strips only one trailing newline", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.displayMessage("x", { print: true })).toBe("line\n");
		}).pipe(
			Effect.provide(tmuxFrom({ stdout: "line\n\n", stderr: "", exitCode: 0 })),
		),
	);

	it.effect("displayMessage() emits display-message", () =>
		Effect.gen(function* () {
			expect(yield* captureArgs((tmux) => tmux.displayMessage())).toEqual([
				"display-message",
			]);
		}),
	);

	it.effect("displayMessage(undefined, options) treats message as absent", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.displayMessage(undefined, { print: true }),
				),
			).toEqual(["display-message", "-p"]);
		}),
	);

	it.effect("displayMessage(message, options) emits flags then message", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.displayMessage("#{pane_id}", {
						all: true,
						continueUpdate: true,
						literal: true,
						ignoreKeys: true,
						print: true,
						verbose: true,
						targetClient: "client-1",
						delay: 1000,
						format: "#{pane_id}",
						targetPane: "%1",
					}),
				),
			).toEqual([
				"display-message",
				"-a",
				"-C",
				"-l",
				"-N",
				"-p",
				"-v",
				"-c",
				"client-1",
				"-d",
				"1000",
				"-F",
				"#{pane_id}",
				"-t",
				"%1",
				"#{pane_id}",
			]);
		}),
	);
});

describe("options validation (displayMessage)", () => {
	it.effect("rejects invalid options before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.displayMessage("x", { targetPane: "" } as never),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);

	it.effect("rejects invalid message before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.displayMessage(123 as never, { print: true }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
