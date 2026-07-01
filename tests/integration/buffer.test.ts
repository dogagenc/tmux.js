import { NodeFileSystem } from "@effect/platform-node";
import { expect, layer } from "@effect/vitest";
import { Effect } from "effect";
import { FileSystem } from "effect/FileSystem";
import { TmuxClient } from "../../src/exports/effect";
import { SessionFixture, TmuxServer } from "./util";

layer(TmuxServer)("buffer (integration)", (it) => {
	it.layer(SessionFixture)("with a baseline session", (it) => {
		it.effect("setBuffer then showBuffer round-trips", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.setBuffer("x", { bufferName: "probe" });
				const out = yield* tmux.showBuffer({ bufferName: "probe" });
				expect(out).toBe("x");
			}),
		);

		it.effect("setBuffer -a appends to an existing buffer", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.setBuffer("x", { bufferName: "acc" });
				yield* tmux.setBuffer("y", { bufferName: "acc", append: true });
				expect(yield* tmux.showBuffer({ bufferName: "acc" })).toBe("xy");
			}),
		);

		it.effect("setBuffer -n renames a buffer, keeping its content", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				yield* tmux.setBuffer("keep", { bufferName: "before" });
				yield* tmux.setBuffer(undefined, {
					bufferName: "before",
					newBufferName: "after",
				});
				expect(yield* tmux.showBuffer({ bufferName: "after" })).toBe("keep");
			}),
		);

		it.effect("loadBuffer reads a file into a named buffer", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const fs = yield* FileSystem;
				const file = yield* fs.makeTempFile();
				yield* fs.writeFileString(file, "loaded from file");
				yield* tmux.loadBuffer(file, { bufferName: "mybuf" });
				expect(yield* tmux.showBuffer({ bufferName: "mybuf" })).toBe(
					"loaded from file",
				);
			}).pipe(Effect.provide(NodeFileSystem.layer)),
		);
	});
});
