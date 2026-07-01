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

describe("TmuxClient.pipePane", () => {
	it.effect("returns empty string on success", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.pipePane(undefined)).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("pipePane() emits pipe-pane and closes the pipe", () =>
		Effect.gen(function* () {
			expect(yield* captureArgs((tmux) => tmux.pipePane(undefined))).toEqual([
				"pipe-pane",
			]);
		}),
	);

	it.effect("pipePane(options) emits encoded flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.pipePane("cat >> /tmp/log", {
						input: true,
						output: true,
						onlyOpen: true,
						targetPane: "%1",
					}),
				),
			).toEqual(["pipe-pane", "-I", "-O", "-o", "-t", "%1", "cat >> /tmp/log"]);
		}),
	);
});

describe("options validation (pipePane)", () => {
	it.effect("rejects an empty target pane before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.pipePane(undefined, { targetPane: "" as never }),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
