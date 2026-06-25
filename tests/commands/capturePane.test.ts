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

describe("TmuxClient.capturePane", () => {
	it.effect("returns raw stdout", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(yield* tmux.capturePane({ print: true })).toBe("one\ntwo\n");
		}).pipe(
			Effect.provide(
				tmuxFrom({ stdout: "one\ntwo\n", stderr: "", exitCode: 0 }),
			),
		),
	);

	it.effect("capturePane() emits capture-pane", () =>
		Effect.gen(function* () {
			expect(yield* captureArgs((tmux) => tmux.capturePane())).toEqual([
				"capture-pane",
			]);
		}),
	);

	it.effect("capturePane(options) emits encoded flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.capturePane({
						alternateScreen: true,
						escapeNonPrintable: true,
						escapeSequences: true,
						joinWrappedLines: true,
						modeScreen: true,
						preserveTrailingSpaces: true,
						print: false,
						pendingEscapeSequence: true,
						quiet: true,
						trimEmpty: true,
						bufferName: "cap",
						endLine: "-",
						startLine: -100,
						targetPane: "%1",
					}),
				),
			).toEqual([
				"capture-pane",
				"-b",
				"cap",
				"-a",
				"-C",
				"-e",
				"-J",
				"-M",
				"-N",
				"-P",
				"-q",
				"-T",
				"-E",
				"-",
				"-S",
				"-100",
				"-t",
				"%1",
			]);
		}),
	);
});

describe("options validation (capturePane)", () => {
	it.effect("rejects invalid line values before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.capturePane({ startLine: "start" } as never),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);

	it.effect("rejects fractional line values before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.capturePane({ startLine: 1.5 } as never),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);

	it.effect("rejects print with bufferName before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.capturePane({ bufferName: "cap", print: true } as never),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);

	it.effect("rejects print false without bufferName before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.capturePane({ print: false } as never),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);

	it.effect("allows bufferName when print is omitted", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.capturePane({ bufferName: "cap" });
				expect(harness.captured.args).toEqual(["capture-pane", "-b", "cap"]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
