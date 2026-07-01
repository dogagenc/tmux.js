import { expect, layer } from "@effect/vitest";
import { Array as Arr, Effect } from "effect";
import { TmuxClient } from "../../src/exports/effect";
import { SessionFixture, TmuxServer } from "./util";

layer(TmuxServer)("pane (integration)", (it) => {
	it.layer(SessionFixture)("with a baseline session", (it) => {
		it.effect("decodes the fixture pane", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const first = yield* tmux
					.listPanes({ all: true })
					.pipe(Effect.flatMap((p) => Effect.fromOption(Arr.head(p))));
				expect(first.pane_id).toMatch(/^%/);
				expect(Number.isInteger(first.pane_index)).toBe(true);
				expect(typeof first.pane_active).toBe("boolean");
			}),
		);

		it.effect("captures the fixture pane as text", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				// Content is a blank shell here (volatile), so assert the -p capture
				// path runs and decodes to a string, not its value.
				const text = yield* tmux.capturePane({ print: true, targetPane: "it" });
				expect(typeof text).toBe("string");
			}),
		);

		it.effect("captures the fixture pane into a readable buffer", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				// capturePane's buffer-write mode (the other half of its union):
				// writing to a named buffer succeeds and the buffer is readable.
				// showBuffer is only the read-back probe — a real showBuffer test
				// (known content in, same out) waits on a setBuffer command.
				yield* tmux.capturePane({
					print: false,
					bufferName: "snap",
					targetPane: "it",
				});
				const text = yield* tmux.showBuffer({ bufferName: "snap" });
				expect(typeof text).toBe("string");
			}),
		);

		it.effect("splits the fixture pane into a second pane", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const before = yield* tmux.listPanes({ all: true });
				yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
				});
				const after = yield* tmux.listPanes({ all: true });
				expect(after.length).toBe(before.length + 1);
				for (const p of after) expect(p.pane_id).toMatch(/^%/);
			}),
		);

		it.effect("killPane with killOthers collapses back to one pane", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
				});
				const seeded = yield* tmux.listPanes({ all: true });
				expect(seeded.length).toBeGreaterThan(1);
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
				const after = yield* tmux.listPanes({ all: true });
				expect(after.length).toBe(1);
			}),
		);

		it.effect("joins a pane from another window into the fixture window", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const dst = yield* tmux
					.listPanes({ all: true })
					.pipe(Effect.flatMap((p) => Effect.fromOption(Arr.head(p))));
				const before = yield* tmux.listPanes({ targetWindow: dst.pane_id });
				yield* tmux.newWindow(undefined, {
					windowName: "src",
					detached: true,
				});
				yield* tmux.joinPane({
					sourcePane: "it:src",
					targetPane: dst.pane_id,
					detached: true,
				});
				const after = yield* tmux.listPanes({ targetWindow: dst.pane_id });
				expect(after.length).toBe(before.length + 1);
			}),
		);

		it.effect("lastPane switches back to the previously active pane", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const original = yield* tmux
					.listPanes({ all: true })
					.pipe(
						Effect.flatMap((p) =>
							Effect.fromOption(Arr.findFirst(p, (x) => x.pane_active)),
						),
					);
				// splitting makes the new pane active, so the original is now "last"
				yield* tmux.splitWindow(undefined, { targetPane: "it" });
				yield* tmux.lastPane({ targetWindow: "it" });
				const active = yield* tmux
					.listPanes({ all: true })
					.pipe(
						Effect.flatMap((p) =>
							Effect.fromOption(Arr.findFirst(p, (x) => x.pane_active)),
						),
					);
				expect(active.pane_id).toBe(original.pane_id);
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);
	});
});
