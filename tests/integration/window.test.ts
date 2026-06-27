import { expect, layer } from "@effect/vitest";
import { Array as Arr, Effect } from "effect";
import { TmuxClient } from "../../src/exports/effect";
import { SessionFixture, TmuxServer } from "./util";

layer(TmuxServer)("window (integration)", (it) => {
	it.layer(SessionFixture)("with a baseline session", (it) => {
		it.effect("decodes the fixture window", () =>
			Effect.gen(function* () {
				const tmux = yield* TmuxClient;
				const first = yield* tmux
					.listWindows({ targetSession: "it" })
					.pipe(Effect.flatMap((w) => Effect.fromOption(Arr.head(w))));
				expect(first.window_id).toMatch(/^@/);
				expect(Number.isInteger(first.window_index)).toBe(true);
				expect(typeof first.window_active).toBe("boolean");
			}),
		);
	});
});
