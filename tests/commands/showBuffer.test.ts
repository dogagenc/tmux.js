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

describe("TmuxClient.showBuffer", () => {
	it.effect("returns raw stdout", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.showBuffer({ bufferName: "cap" })).toBe("hello\n");
		}).pipe(
			Effect.provide(tmuxFrom({ stdout: "hello\n", stderr: "", exitCode: 0 })),
		),
	);

	it.effect("showBuffer() emits show-buffer", () =>
		Effect.gen(function* () {
			expect(yield* captureArgs((tmux) => tmux.showBuffer())).toEqual([
				"show-buffer",
			]);
		}),
	);

	it.effect("showBuffer({ bufferName }) emits -b", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) => tmux.showBuffer({ bufferName: "cap" })),
			).toEqual(["show-buffer", "-b", "cap"]);
		}),
	);

	it.effect("showBuffer({ bufferName: undefined }) omits -b", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.showBuffer({ bufferName: undefined }),
				),
			).toEqual(["show-buffer"]);
		}),
	);
});

describe("options validation (showBuffer)", () => {
	it.effect("rejects an empty buffer name before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.showBuffer({ bufferName: "" } as never),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
