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

describe("TmuxClient.sendKeys", () => {
	it.effect("resolves to an empty string", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.sendKeys(["C-a"], { targetPane: "it" })).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("emits boolean and valued flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.sendKeys([], {
						expandFormats: true,
						hex: true,
						literal: true,
						reset: true,
						repeatCount: 3,
						targetPane: "sess:1.1",
					}),
				),
			).toEqual([
				"send-keys",
				"-F",
				"-H",
				"-l",
				"-N",
				"3",
				"-t",
				"sess:1.1",
				"-R",
			]);
		}),
	);

	it.effect("emits multiple key positionals after flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.sendKeys(["echo hi", "Enter"], { repeatCount: 2 }),
				),
			).toEqual(["send-keys", "-N", "2", "echo hi", "Enter"]);
		}),
	);
});

describe("argument validation (sendKeys)", () => {
	it.effect("rejects an empty target pane before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.sendKeys(["x"], { targetPane: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
