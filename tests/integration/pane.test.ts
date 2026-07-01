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

		it.effect("splitWindow -c/-P/-F take effect on real tmux", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const line = yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
					startDirectory: "/",
					print: true,
					format: "#{pane_current_path}|#{pane_id}",
				});
				const [cwd, paneId] = line.split("|");
				expect(cwd).toBe("/");
				expect(paneId).toMatch(/^%\d+/);
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
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

		// break-pane: split the fixture window first so "it" keeps a pane, then
		// break the inactive one off into a new window. Cleanup kills any window
		it.effect("breaks a pane into a new window (-s, -d, default -P line)", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const before = yield* tmux.listWindows({ targetSession: "it" });
				const activeBefore = yield* Effect.fromOption(
					Arr.findFirst(before, (w) => w.window_active),
				);
				yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
				});
				const extra = yield* tmux
					.listPanes({ targetWindow: "it" })
					.pipe(
						Effect.flatMap((p) =>
							Effect.fromOption(Arr.findFirst(p, (x) => !x.pane_active)),
						),
					);
				const line = yield* tmux.breakPane({
					srcPane: extra.pane_id,
					detached: true,
					print: true,
				});
				expect(line).toMatch(/^it:\d+\.\d+$/);
				const after = yield* tmux.listWindows({ targetSession: "it" });
				expect(after.length).toBe(before.length + 1);
				// -d left the original window active
				const activeAfter = yield* Effect.fromOption(
					Arr.findFirst(after, (w) => w.window_active),
				);
				expect(activeAfter.window_id).toBe(activeBefore.window_id);
				for (const w of after)
					if (!before.some((b) => b.window_id === w.window_id))
						yield* tmux.killWindow({ targetWindow: w.window_id });
			}),
		);

		it.effect("break-pane -F returns the custom format", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
				});
				const extra = yield* tmux
					.listPanes({ targetWindow: "it" })
					.pipe(
						Effect.flatMap((p) =>
							Effect.fromOption(Arr.findFirst(p, (x) => !x.pane_active)),
						),
					);
				const line = yield* tmux.breakPane({
					srcPane: extra.pane_id,
					detached: true,
					print: true,
					format: "#{window_id} #{pane_id}",
				});
				const [windowId, paneId] = line.split(" ");
				expect(windowId).toMatch(/^@\d+$/);
				expect(paneId).toMatch(/^%\d+$/);
				yield* tmux.killWindow({ targetWindow: windowId });
			}),
		);

		it.effect("break-pane -n names the new window", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
				});
				const extra = yield* tmux
					.listPanes({ targetWindow: "it" })
					.pipe(
						Effect.flatMap((p) =>
							Effect.fromOption(Arr.findFirst(p, (x) => !x.pane_active)),
						),
					);
				yield* tmux.breakPane({
					srcPane: extra.pane_id,
					detached: true,
					windowName: "broken",
				});
				const windows = yield* tmux.listWindows({ targetSession: "it" });
				const named = yield* Effect.fromOption(
					Arr.findFirst(windows, (w) => w.window_name === "broken"),
				);
				expect(named.window_name).toBe("broken");
				yield* tmux.killWindow({ targetWindow: named.window_id });
			}),
		);

		it.effect("break-pane -a/-t place the new window after the target", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const before = yield* tmux.listWindows({ targetSession: "it" });
				const dstIndex = Number(
					yield* tmux.newWindow(undefined, {
						detached: true,
						print: true,
						format: "#{window_index}",
					}),
				);
				yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
				});
				const extra = yield* tmux
					.listPanes({ targetWindow: "it" })
					.pipe(
						Effect.flatMap((p) =>
							Effect.fromOption(Arr.findFirst(p, (x) => !x.pane_active)),
						),
					);
				const newIndex = Number(
					yield* tmux.breakPane({
						srcPane: extra.pane_id,
						detached: true,
						after: true,
						dstWindow: `it:${dstIndex}`,
						print: true,
						format: "#{window_index}",
					}),
				);
				expect(newIndex).toBe(dstIndex + 1);
				const after = yield* tmux.listWindows({ targetSession: "it" });
				for (const w of after)
					if (!before.some((b) => b.window_id === w.window_id))
						yield* tmux.killWindow({ targetWindow: w.window_id });
			}),
		);

		it.effect("break-pane -b/-t place the new window before the target", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const before = yield* tmux.listWindows({ targetSession: "it" });
				const dstIndex = Number(
					yield* tmux.newWindow(undefined, {
						detached: true,
						print: true,
						format: "#{window_index}",
					}),
				);
				yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
				});
				const extra = yield* tmux
					.listPanes({ targetWindow: "it" })
					.pipe(
						Effect.flatMap((p) =>
							Effect.fromOption(Arr.findFirst(p, (x) => !x.pane_active)),
						),
					);
				// -b takes the target's index; the target shifts up by one
				const newIndex = Number(
					yield* tmux.breakPane({
						srcPane: extra.pane_id,
						detached: true,
						before: true,
						dstWindow: `it:${dstIndex}`,
						print: true,
						format: "#{window_index}",
					}),
				);
				expect(newIndex).toBe(dstIndex);
				const after = yield* tmux.listWindows({ targetSession: "it" });
				for (const w of after)
					if (!before.some((b) => b.window_id === w.window_id))
						yield* tmux.killWindow({ targetWindow: w.window_id });
			}),
		);

		it.effect("moves a pane from another window (-s/-t, -d keeps active)", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const dst = yield* tmux
					.listPanes({ targetWindow: "it" })
					.pipe(Effect.flatMap((p) => Effect.fromOption(Arr.head(p))));
				const before = yield* tmux.listPanes({ targetWindow: dst.pane_id });
				yield* tmux.newWindow(undefined, {
					windowName: "mvsrc",
					detached: true,
				});
				yield* tmux.movePane({
					sourcePane: "it:mvsrc",
					targetPane: dst.pane_id,
					detached: true,
				});
				const after = yield* tmux.listPanes({ targetWindow: dst.pane_id });
				expect(after.length).toBe(before.length + 1);
				// -d left the source pane active untouched: the destination window's
				// original pane is still the active one.
				const active = yield* tmux
					.listPanes({ targetWindow: dst.pane_id })
					.pipe(
						Effect.flatMap((p) =>
							Effect.fromOption(Arr.findFirst(p, (x) => x.pane_active)),
						),
					);
				expect(active.pane_id).toBe(dst.pane_id);
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);

		it.effect("moves a pane horizontally, side by side (-h, pane_left)", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.newWindow(undefined, {
					windowName: "mvh",
					detached: true,
				});
				yield* tmux.movePane({
					sourcePane: "it:mvh",
					targetPane: "it",
					horizontal: true,
					detached: true,
				});
				const panes = yield* tmux.listPanes({
					targetWindow: "it",
					includeVariables: ["pane_left"],
				});
				// -h yields side-by-side panes: one sits to the right (pane_left > 0).
				expect(panes.some((p) => p.pane_left > 0)).toBe(true);
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);

		it.effect(
			"moves a pane before the target (-b, default vertical pane_top)",
			() =>
				Effect.gen(function* () {
					const tmux = yield* TmuxClient;
					yield* tmux.newWindow(undefined, {
						windowName: "mvb",
						detached: true,
					});
					const src = yield* tmux
						.listPanes({ targetWindow: "it:mvb" })
						.pipe(Effect.flatMap((p) => Effect.fromOption(Arr.head(p))));
					yield* tmux.movePane({
						sourcePane: src.pane_id,
						targetPane: "it",
						before: true,
						detached: true,
					});
					const panes = yield* tmux.listPanes({
						targetWindow: "it",
						includeVariables: ["pane_left", "pane_top"],
					});
					const moved = yield* Effect.fromOption(
						Arr.findFirst(panes, (p) => p.pane_id === src.pane_id),
					);
					// -b + default vertical places the moved pane above the target.
					expect(moved.pane_top).toBe(0);
					expect(panes.some((p) => p.pane_top > 0)).toBe(true);
					yield* tmux.killPane({ killOthers: true, targetPane: "it" });
				}),
		);
	});
});
