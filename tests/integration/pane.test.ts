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
	});
});
