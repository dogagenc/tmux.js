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

describe("TmuxClient.breakPane", () => {
	it.effect("resolves to an empty string without -P", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.breakPane({ detached: true })).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("strips the trailing newline from -P output", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.breakPane({ print: true })).toBe("probe:2.1");
		}).pipe(Effect.provide(tmuxFrom({ ...empty, stdout: "probe:2.1\n" }))),
	);

	it.effect("emits boolean and valued flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.breakPane({
						after: true,
						detached: true,
						windowName: "logs",
						srcPane: "work:1.0",
						dstWindow: "work",
					}),
				),
			).toEqual([
				"break-pane",
				"-a",
				"-d",
				"-n",
				"logs",
				"-s",
				"work:1.0",
				"-t",
				"work",
			]);
		}),
	);

	it.effect("emits the before member and shared flags in struct order", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.breakPane({
						before: true,
						print: true,
						format: "#{window_id}",
						srcPane: "work:1.0",
					}),
				),
			).toEqual([
				"break-pane",
				"-b",
				"-P",
				"-F",
				"#{window_id}",
				"-s",
				"work:1.0",
			]);
		}),
	);
});

describe("argument validation (breakPane)", () => {
	it.effect("rejects an empty source pane before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.breakPane({ srcPane: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);

	it.effect("rejects after and before together before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.breakPane({ after: true, before: true } as never),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);

	it.effect("accepts an explicit false for the excluded member", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.breakPane({ after: true, before: false }),
				),
			).toEqual(["break-pane", "-a"]);
		}),
	);
});
