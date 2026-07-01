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

describe("TmuxClient.linkWindow", () => {
	it.effect("resolves to an empty string on success", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			expect(
				yield* tmux.linkWindow({
					sourceWindow: "work:1",
					targetWindow: "other:2",
				}),
			).toBe("");
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("emits after, detached, kill, and window flags", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.linkWindow({
						after: true,
						detached: true,
						destroyExisting: true,
						sourceWindow: "work:1",
						targetWindow: "other:2",
					}),
				),
			).toEqual([
				"link-window",
				"-a",
				"-d",
				"-k",
				"-s",
				"work:1",
				"-t",
				"other:2",
			]);
		}),
	);

	it.effect("emits the before flag", () =>
		Effect.gen(function* () {
			expect(
				yield* captureArgs((tmux) =>
					tmux.linkWindow({ before: true, targetWindow: "other:2" }),
				),
			).toEqual(["link-window", "-b", "-t", "other:2"]);
		}),
	);
});

describe("argument validation (linkWindow)", () => {
	it.effect("rejects an empty target window before spawning tmux", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.linkWindow({ targetWindow: "" as never }),
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
					tmux.linkWindow({ after: true, before: true } as never),
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
					tmux.linkWindow({
						after: true,
						before: false,
						targetWindow: "other:2",
					}),
				),
			).toEqual(["link-window", "-a", "-t", "other:2"]);
		}),
	);
});
