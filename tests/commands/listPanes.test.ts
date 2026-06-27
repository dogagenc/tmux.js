import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TmuxCommandOptionsError } from "../../src/Errors";
import { TmuxClient } from "../../src/exports/effect";
import { capturingTmux, flagArgs, lines, row, tmuxFrom } from "../utils";

describe("TmuxClient.listPanes", () => {
	it.effect("decodes panes from list-panes output", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const panes = yield* tmux.listPanes();

			expect(panes).toEqual([
				{
					pane_index: 0,
					pane_width: 174,
					pane_height: 30,
					history_size: 3,
					history_limit: 2000,
					history_bytes: 149619,
					pane_id: "%3",
					pane_active: true,
					pane_dead: false,
				},
				{
					pane_index: 1,
					pane_width: 174,
					pane_height: 12,
					history_size: 0,
					history_limit: 2000,
					history_bytes: 0,
					pane_id: "%4",
					pane_active: false,
					pane_dead: false,
				},
			]);
		}).pipe(
			Effect.provide(
				tmuxFrom({
					stdout: lines(
						row("0", "174", "30", "3", "2000", "149619", "%3", "1", "0"),
						row("1", "174", "12", "0", "2000", "0", "%4", "0", "0"),
					),
					stderr: "",
					exitCode: 0,
				}),
			),
		),
	);

	// Like listWindows, listPanes does NOT swallow a no-server exit.
	it.effect("surfaces TmuxServerNotRunning instead of returning []", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const error = yield* Effect.flip(tmux.listPanes());
			expect(error._tag).toBe("TmuxServerNotRunning");
		}).pipe(
			Effect.provide(
				tmuxFrom({
					stdout: "",
					stderr: "no server running on /tmp/tmux-501/default",
					exitCode: 1,
				}),
			),
		),
	);
});

describe("argv flag mapping (listPanes)", () => {
	const empty = { stdout: "", stderr: "", exitCode: 0 };

	const captureFlags = (
		run: (tmux: TmuxClient["Service"]) => Effect.Effect<unknown, unknown>,
	) => {
		const harness = capturingTmux(empty);
		return Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			yield* run(tmux);
			return flagArgs(harness.captured.args);
		}).pipe(Effect.provide(harness.layer));
	};

	it.effect("listPanes() emits no flags", () =>
		Effect.gen(function* () {
			expect(yield* captureFlags((tmux) => tmux.listPanes())).toEqual([
				"list-panes",
			]);
		}),
	);

	it.effect("listPanes({ targetWindow }) emits -t", () =>
		Effect.gen(function* () {
			expect(
				yield* captureFlags((tmux) =>
					tmux.listPanes({ targetWindow: "main:1" }),
				),
			).toEqual(["list-panes", "-t", "main:1"]);
		}),
	);

	it.effect("listPanes({ all }) emits -a", () =>
		Effect.gen(function* () {
			expect(
				yield* captureFlags((tmux) => tmux.listPanes({ all: true })),
			).toEqual(["list-panes", "-a"]);
		}),
	);

	it.effect("listPanes emits -a, -s, -f, -t in flag-declaration order", () =>
		Effect.gen(function* () {
			expect(
				yield* captureFlags((tmux) =>
					tmux.listPanes({
						all: true,
						session: true,
						filter: "x",
						targetWindow: "main:1",
					}),
				),
			).toEqual(["list-panes", "-a", "-s", "-f", "x", "-t", "main:1"]);
		}),
	);
});

describe("options validation (listPanes)", () => {
	const empty = { stdout: "", stderr: "", exitCode: 0 };

	it.effect("rejects an unknown option key with TmuxCommandOptionsError", () =>
		Effect.gen(function* () {
			const tmux = yield* TmuxClient;
			const error = yield* Effect.flip(
				tmux.listPanes({ targetWindo: "main" } as never),
			);
			expect(error).toBeInstanceOf(TmuxCommandOptionsError);
		}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect(
		"rejects a wrong-typed option value with TmuxCommandOptionsError",
		() =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.listPanes({ all: "yes" } as never),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
			}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect(
		"rejects an empty string option value with TmuxCommandOptionsError",
		() =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.listPanes({ targetWindow: "" } as never),
				);
				expect(error).toBeInstanceOf(TmuxCommandOptionsError);
			}).pipe(Effect.provide(tmuxFrom(empty))),
	);

	it.effect("does not spawn tmux when options are invalid", () =>
		Effect.gen(function* () {
			const harness = capturingTmux(empty);
			yield* Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* Effect.flip(tmux.listPanes({ nope: 1 } as never));
				expect(harness.captured.args).toEqual([]);
			}).pipe(Effect.provide(harness.layer));
		}),
	);
});
