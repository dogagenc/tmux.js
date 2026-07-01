import { expect, layer } from "@effect/vitest";
import { Array as Arr, Effect } from "effect";
import { TmuxCommandError, TmuxTargetNotFound } from "../../src/Errors";
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
					expect(moved.pane_top).toBe(0);
					expect(panes.some((p) => p.pane_top > 0)).toBe(true);
					yield* tmux.killPane({ killOthers: true, targetPane: "it" });
				}),
		);

		it.effect(
			"opens and closes a pipe on the pane (-I/-O/-o/-t, pane_pipe)",
			() =>
				Effect.gen(function* () {
					const tmux = yield* TmuxClient;
					const read = () =>
						tmux
							.listPanes({
								targetWindow: "it",
								includeVariables: ["pane_pipe"],
							})
							.pipe(Effect.flatMap((p) => Effect.fromOption(Arr.head(p))));
					expect((yield* read()).pane_pipe).toBe(false);
					yield* tmux.pipePane("cat > /dev/null", {
						input: true,
						output: true,
						onlyOpen: true,
						targetPane: "it",
					});
					expect((yield* read()).pane_pipe).toBe(true);
					yield* tmux.pipePane(undefined, { targetPane: "it" });
					expect((yield* read()).pane_pipe).toBe(false);
				}),
		);

		it.effect("resizes a pane's dimensions with a direction (-D)", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				// a vertical split gives the pane a neighbor to grow into
				yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
				});
				const read = () =>
					tmux
						.listPanes({
							targetWindow: "it",
							includeVariables: ["pane_height"],
						})
						.pipe(Effect.flatMap((p) => Effect.fromOption(Arr.head(p))));
				const before = (yield* read()).pane_height;
				yield* tmux.resizePane(3, { down: true, targetPane: "it" });
				const after = (yield* read()).pane_height;
				expect(after).not.toBe(before);
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);

		it.effect("resizes a pane to an absolute height (-y)", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
				});
				yield* tmux.resizePane(undefined, { height: 8, targetPane: "it" });
				const pane = yield* tmux
					.listPanes({
						targetWindow: "it",
						includeVariables: ["pane_height"],
					})
					.pipe(Effect.flatMap((p) => Effect.fromOption(Arr.head(p))));
				expect(pane.pane_height).toBe(8);
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);

		it.effect("resizes a pane to an absolute width (-x)", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				// a horizontal split gives side-by-side panes with width to spare
				yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					horizontal: true,
					detached: true,
				});
				yield* tmux.resizePane(undefined, { width: 20, targetPane: "it" });
				const pane = yield* tmux
					.listPanes({
						targetWindow: "it",
						includeVariables: ["pane_width"],
					})
					.pipe(Effect.flatMap((p) => Effect.fromOption(Arr.head(p))));
				expect(pane.pane_width).toBe(20);
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);

		it.effect("toggles the zoomed flag with -Z", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				// zoom only applies with more than one pane in the window
				yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
				});
				const zoomed = () =>
					tmux.displayMessage("#{window_zoomed_flag}", {
						print: true,
						targetPane: "it",
					});
				expect(yield* zoomed()).toBe("0");
				yield* tmux.resizePane(undefined, { zoom: true, targetPane: "it" });
				expect(yield* zoomed()).toBe("1");
				yield* tmux.resizePane(undefined, { zoom: true, targetPane: "it" });
				expect(yield* zoomed()).toBe("0");
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);

		it.effect("fails to resize an unknown target pane", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.resizePane(undefined, { targetPane: "it.99" }),
				);
				expect(error).toBeInstanceOf(TmuxTargetNotFound);
			}),
		);

		it.effect("respawn-pane needs -k while the command is still active", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.respawnPane(undefined, { targetPane: "it" }),
				);
				expect(error).toBeInstanceOf(TmuxCommandError);
				expect((error as TmuxCommandError).stderr).toContain("still active");
			}),
		);

		it.effect("respawn-pane -k/-c/-e/-t respawns the target pane", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.respawnPane(undefined, {
					kill: true,
					startDirectory: "/",
					environment: "FOO=bar",
					targetPane: "it",
				});
				const cwd = yield* tmux.displayMessage("#{pane_current_path}", {
					print: true,
					targetPane: "it",
				});
				expect(cwd).toBe("/");
			}),
		);

		it.effect("selectPane -L/-R move the active pane horizontally", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					horizontal: true,
					detached: true,
				});
				const panes = yield* tmux.listPanes({
					targetWindow: "it",
					includeVariables: ["pane_left"],
				});
				const leftPane = panes.reduce((a, b) =>
					a.pane_left <= b.pane_left ? a : b,
				);
				const rightPane = panes.reduce((a, b) =>
					a.pane_left >= b.pane_left ? a : b,
				);
				const active = () =>
					tmux
						.listPanes({ targetWindow: "it" })
						.pipe(
							Effect.flatMap((p) =>
								Effect.fromOption(Arr.findFirst(p, (x) => x.pane_active)),
							),
						);
				yield* tmux.selectPane({ targetPane: leftPane.pane_id });
				expect((yield* active()).pane_id).toBe(leftPane.pane_id);
				yield* tmux.selectPane({ right: true, targetPane: "it" });
				expect((yield* active()).pane_id).toBe(rightPane.pane_id);
				yield* tmux.selectPane({ left: true, targetPane: "it" });
				expect((yield* active()).pane_id).toBe(leftPane.pane_id);
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);

		it.effect("selectPane -U/-D move the active pane vertically", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
				});
				const panes = yield* tmux.listPanes({
					targetWindow: "it",
					includeVariables: ["pane_top"],
				});
				const topPane = panes.reduce((a, b) =>
					a.pane_top <= b.pane_top ? a : b,
				);
				const bottomPane = panes.reduce((a, b) =>
					a.pane_top >= b.pane_top ? a : b,
				);
				const active = () =>
					tmux
						.listPanes({ targetWindow: "it" })
						.pipe(
							Effect.flatMap((p) =>
								Effect.fromOption(Arr.findFirst(p, (x) => x.pane_active)),
							),
						);
				yield* tmux.selectPane({ targetPane: topPane.pane_id });
				expect((yield* active()).pane_id).toBe(topPane.pane_id);
				yield* tmux.selectPane({ down: true, targetPane: "it" });
				expect((yield* active()).pane_id).toBe(bottomPane.pane_id);
				yield* tmux.selectPane({ up: true, targetPane: "it" });
				expect((yield* active()).pane_id).toBe(topPane.pane_id);
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);

		it.effect("selectPane -l restores the previously active pane", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const original = yield* tmux
					.listPanes({ targetWindow: "it" })
					.pipe(
						Effect.flatMap((p) =>
							Effect.fromOption(Arr.findFirst(p, (x) => x.pane_active)),
						),
					);
				// splitting makes the new pane active, so the original is now "last"
				yield* tmux.splitWindow(undefined, { targetPane: "it" });
				yield* tmux.selectPane({ last: true, targetPane: "it" });
				const active = yield* tmux
					.listPanes({ targetWindow: "it" })
					.pipe(
						Effect.flatMap((p) =>
							Effect.fromOption(Arr.findFirst(p, (x) => x.pane_active)),
						),
					);
				expect(active.pane_id).toBe(original.pane_id);
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);

		it.effect("selectPane -d/-e toggle pane input", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const inputOff = () =>
					tmux.displayMessage("#{pane_input_off}", {
						print: true,
						targetPane: "it",
					});
				yield* tmux.selectPane({ disableInput: true, targetPane: "it" });
				expect(yield* inputOff()).toBe("1");
				yield* tmux.selectPane({ enableInput: true, targetPane: "it" });
				expect(yield* inputOff()).toBe("0");
			}),
		);

		it.effect("selectPane -m/-M mark and clear the marked pane", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.selectPane({ mark: true, targetPane: "it" });
				expect(
					yield* tmux.displayMessage("#{pane_marked}", {
						print: true,
						targetPane: "it",
					}),
				).toBe("1");
				yield* tmux.selectPane({ clearMarked: true });
				expect(
					yield* tmux.displayMessage("#{pane_marked_set}", {
						print: true,
						targetPane: "it",
					}),
				).toBe("0");
			}),
		);

		it.effect("selectPane -T sets the pane title", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.selectPane({ title: "hello", targetPane: "it" });
				const title = yield* tmux.displayMessage("#{pane_title}", {
					print: true,
					targetPane: "it",
				});
				expect(title).toBe("hello");
			}),
		);

		it.effect("fails to select an unknown target pane", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const error = yield* Effect.flip(
					tmux.selectPane({ targetPane: "it.99" }),
				);
				expect(error).toBeInstanceOf(TmuxTargetNotFound);
			}),
		);

		it.effect("swaps two panes' positions (-s/-t, listPanes order)", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
				});
				const before = yield* tmux.listPanes({ targetWindow: "it" });
				expect(before.length).toBe(2);
				yield* tmux.swapPane({
					sourcePane: Arr.getUnsafe(before, 0).pane_id,
					targetPane: Arr.getUnsafe(before, 1).pane_id,
					detached: true,
				});
				const after = yield* tmux.listPanes({ targetWindow: "it" });
				expect(Arr.getUnsafe(after, 0).pane_id).toBe(
					Arr.getUnsafe(before, 1).pane_id,
				);
				expect(Arr.getUnsafe(after, 1).pane_id).toBe(
					Arr.getUnsafe(before, 0).pane_id,
				);
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);

		it.effect("-d leaves the active pane unchanged after a swap", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
				});
				const panes = yield* tmux.listPanes({ targetWindow: "it" });
				expect(panes.length).toBe(2);
				const active = () =>
					tmux
						.listPanes({ targetWindow: "it" })
						.pipe(
							Effect.flatMap((p) =>
								Effect.fromOption(Arr.findFirst(p, (x) => x.pane_active)),
							),
						);
				const before = yield* active();
				yield* tmux.swapPane({
					sourcePane: Arr.getUnsafe(panes, 0).pane_id,
					targetPane: Arr.getUnsafe(panes, 1).pane_id,
					detached: true,
				});
				expect((yield* active()).pane_id).toBe(before.pane_id);
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);

		it.effect("-D and -U swap with the next and previous pane", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
				});
				const before = yield* tmux.listPanes({ targetWindow: "it" });
				expect(before.length).toBe(2);
				yield* tmux.swapPane({
					down: true,
					detached: true,
					targetPane: Arr.getUnsafe(before, 0).pane_id,
				});
				const mid = yield* tmux.listPanes({ targetWindow: "it" });
				expect(Arr.getUnsafe(mid, 0).pane_id).toBe(
					Arr.getUnsafe(before, 1).pane_id,
				);
				expect(Arr.getUnsafe(mid, 1).pane_id).toBe(
					Arr.getUnsafe(before, 0).pane_id,
				);
				yield* tmux.swapPane({
					up: true,
					detached: true,
					targetPane: Arr.getUnsafe(mid, 1).pane_id,
				});
				const after = yield* tmux.listPanes({ targetWindow: "it" });
				expect(Arr.getUnsafe(after, 0).pane_id).toBe(
					Arr.getUnsafe(before, 0).pane_id,
				);
				expect(Arr.getUnsafe(after, 1).pane_id).toBe(
					Arr.getUnsafe(before, 1).pane_id,
				);
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);

		it.effect("-Z preserves the window zoomed flag across a swap", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
				});
				const before = yield* tmux.listPanes({ targetWindow: "it" });
				expect(before.length).toBe(2);
				const zoomed = () =>
					tmux.displayMessage("#{window_zoomed_flag}", {
						print: true,
						targetPane: "it",
					});
				yield* tmux.resizePane(undefined, { zoom: true, targetPane: "it" });
				expect(yield* zoomed()).toBe("1");
				yield* tmux.swapPane({
					down: true,
					keepZoomed: true,
					detached: true,
					targetPane: Arr.getUnsafe(before, 0).pane_id,
				});
				expect(yield* zoomed()).toBe("1");
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);

		it.effect("clears pane history (-t): history_size drops to zero", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.respawnPane("seq 1 50; sleep 100", {
					kill: true,
					targetPane: "it",
				});
				// real timer, not Effect.sleep: it.effect's TestClock never advances
				// virtual time, and we must wait for tmux to render the output.
				yield* Effect.promise(
					() => new Promise((resolve) => setTimeout(resolve, 500)),
				);
				const size = () =>
					tmux
						.displayMessage("#{history_size}", {
							print: true,
							targetPane: "it",
						})
						.pipe(Effect.map(Number));
				expect(yield* size()).toBeGreaterThan(0);
				expect(yield* tmux.clearHistory({ targetPane: "it" })).toBe("");
				expect(yield* size()).toBe(0);
			}),
		);

		it.effect("clears history and hyperlinks (-H) resolving empty", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				expect(
					yield* tmux.clearHistory({ clearHyperlinks: true, targetPane: "it" }),
				).toBe("");
			}),
		);

		const settle = () =>
			Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 300)));

		it.effect("send-keys -t/-N/-H types repeated hex chars into a pane", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const paneId = yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
					print: true,
					format: "#{pane_id}",
				});
				// 0x7A is 'z'; repeated three times lands as 'zzz' at the prompt
				yield* tmux.sendKeys("7A", {
					hex: true,
					repeatCount: 3,
					targetPane: paneId,
				});
				yield* settle();
				const text = yield* tmux.capturePane({
					print: true,
					targetPane: paneId,
				});
				expect(text).toContain("zzz");
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);

		// send-keys -F only expands formats "where appropriate" — for -X copy-mode
		// command args, not plain key sends. On tmux 3.6b `send-keys -F '#{pane_id}'`
		// types the literal string, so there is no headless-observable effect to
		// assert here; -F argv coverage lives in the unit test.

		it.effect("send-keys -l sends keys literally, not as a control key", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const paneId = yield* tmux.splitWindow(undefined, {
					targetPane: "it",
					detached: true,
					print: true,
					format: "#{pane_id}",
				});
				yield* tmux.sendKeys("C-a", { literal: true, targetPane: paneId });
				yield* settle();
				const text = yield* tmux.capturePane({
					print: true,
					targetPane: paneId,
				});
				expect(text).toContain("C-a");
				yield* tmux.killPane({ killOthers: true, targetPane: "it" });
			}),
		);
	});
});
