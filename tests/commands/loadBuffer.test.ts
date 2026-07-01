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

describe("TmuxClient.loadBuffer", () => {
	it.effect("returns stdout", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.loadBuffer("./notes.txt")).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("loadBuffer(path) emits the positional path", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) => tmux.loadBuffer("./notes.txt")),
			).toEqual(["load-buffer", "./notes.txt"]);
		}),
	);

	it.effect("loadBuffer('-') reads from stdin", () =>
		Effect.gen(function* () {
			expect(yield* captureArgs((tmux) => tmux.loadBuffer("-"))).toEqual([
				"load-buffer",
				"-",
			]);
		}),
	);

	it.effect("loadBuffer(path, { bufferName }) emits -b before path", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.loadBuffer("./notes.txt", { bufferName: "mybuf" }),
				),
			).toEqual(["load-buffer", "-b", "mybuf", "./notes.txt"]);
		}),
	);

	it.effect("loadBuffer(path, { clipboard }) emits -w", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.loadBuffer("./notes.txt", { clipboard: true }),
				),
			).toEqual(["load-buffer", "-w", "./notes.txt"]);
		}),
	);

	it.effect("loadBuffer(path, { targetClient }) emits -t before path", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.loadBuffer("./notes.txt", { targetClient: "client-1" }),
				),
			).toEqual(["load-buffer", "-t", "client-1", "./notes.txt"]);
		}),
	);
});

describe("options validation (loadBuffer)", () => {
	it.effect("rejects an empty path before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(tmux.loadBuffer("" as never));
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);

	it.effect("rejects an empty buffer name before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.loadBuffer("./notes.txt", { bufferName: "" } as never),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);

	it.effect("rejects an empty target client before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.loadBuffer("./notes.txt", { targetClient: "" } as never),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
