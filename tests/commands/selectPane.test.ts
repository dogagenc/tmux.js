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

describe("TmuxClient.selectPane", () => {
	it.effect("resolves to an empty string on success", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.selectPane({ targetPane: "%0" })).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("emits the directional and zoom flags with a target", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.selectPane({
						up: true,
						down: true,
						left: true,
						right: true,
						keepZoomed: true,
						targetPane: "work:1.0",
					}),
				),
			).toEqual([
				"select-pane",
				"-U",
				"-D",
				"-L",
				"-R",
				"-Z",
				"-t",
				"work:1.0",
			]);
		}),
	);

	it.effect("emits the last, input, and marked flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.selectPane({
						last: true,
						enableInput: true,
						disableInput: true,
						mark: true,
						clearMarked: true,
					}),
				),
			).toEqual(["select-pane", "-l", "-e", "-d", "-m", "-M"]);
		}),
	);

	it.effect("emits the pane title flag with its value", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.selectPane({ title: "hello", targetPane: "%0" }),
				),
			).toEqual(["select-pane", "-T", "hello", "-t", "%0"]);
		}),
	);
});

describe("argument validation (selectPane)", () => {
	it.effect("rejects an empty target pane before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.selectPane({ targetPane: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
