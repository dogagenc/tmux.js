import { expect, layer } from "@effect/vitest";
import { Effect } from "effect";
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
	});
});
