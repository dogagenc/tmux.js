import { describe, expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { TmuxParseError } from "../../src/Errors";
import { decodeLine } from "../../src/internal/Format";
import { variableStruct } from "../../src/internal/Variables";

const SessionStruct = variableStruct([
	"session_id",
	"session_name",
	"session_windows",
	"session_attached",
	"session_created",
]);
const WindowStruct = variableStruct([
	"session_id",
	"session_name",
	"session_windows",
	"session_attached",
	"session_created",
	"window_id",
	"window_index",
	"window_name",
	"window_active",
]);
const PaneStruct = variableStruct([
	"pane_index",
	"pane_width",
	"pane_height",
	"history_size",
	"history_limit",
	"history_bytes",
	"pane_id",
	"pane_active",
	"pane_dead",
]);
const US = "\x1f";

describe("variable codec encoding", () => {
	it("session_created floors sub-second millis to whole seconds", () => {
		expect(
			Schema.encodeSync(SessionStruct)({
				session_id: "$0",
				session_name: "main",
				session_windows: 1,
				session_attached: 0,
				session_created: new Date(1_700_000_000_999),
			}).session_created,
		).toBe("1700000000");
	});

	it("window_active encodes true -> '1' and false -> '0'", () => {
		const base = {
			session_id: "$0",
			session_name: "main",
			session_windows: 1,
			session_attached: 0,
			session_created: new Date(1_700_000_000_000),
			window_id: "@0",
			window_index: 0,
			window_name: "editor",
		};

		expect(
			Schema.encodeSync(WindowStruct)({ ...base, window_active: true })
				.window_active,
		).toBe("1");
		expect(
			Schema.encodeSync(WindowStruct)({ ...base, window_active: false })
				.window_active,
		).toBe("0");
	});
});

describe("numeric field decoding", () => {
	const decode = Schema.decodeUnknownEffect(Schema.FiniteFromString);

	it.effect("decodes a numeric string", () =>
		Effect.gen(function* () {
			expect(yield* decode("42")).toBe(42);
		}),
	);

	it.effect("fails on a non-numeric string", () =>
		Effect.gen(function* () {
			const error = yield* Effect.flip(decode("notanumber"));
			expect(error._tag).toBe("SchemaError");
		}),
	);

	it.effect("decodeLine fails with TmuxParseError on a non-numeric field", () =>
		Effect.gen(function* () {
			// session_windows = "notanumber" -> NaN-rejecting codec fails decode
			const line = ["$0", "main", "notanumber", "0", "1700000000"].join(US);
			const error = yield* Effect.flip(decodeLine(SessionStruct)(line));
			expect(error).toBeInstanceOf(TmuxParseError);
		}),
	);
});

describe("window_active decoding", () => {
	it.effect("decodes 1 -> true and 0 -> false", () =>
		Effect.gen(function* () {
			const base = ["$0", "main", "1", "0", "1700000000", "@0", "0", "editor"];
			expect(
				(yield* decodeLine(WindowStruct)([...base, "1"].join(US)))
					.window_active,
			).toBe(true);
			expect(
				(yield* decodeLine(WindowStruct)([...base, "0"].join(US)))
					.window_active,
			).toBe(false);
		}),
	);

	it.effect("fails on 2", () =>
		Effect.gen(function* () {
			const error = yield* Effect.flip(
				decodeLine(WindowStruct)(
					["$0", "main", "1", "0", "1700000000", "@0", "0", "editor", "2"].join(
						US,
					),
				),
			);
			expect(error).toBeInstanceOf(TmuxParseError);
		}),
	);
});

describe("pane variable codec", () => {
	const object = {
		pane_index: 1,
		pane_width: 174,
		pane_height: 30,
		history_size: 3,
		history_limit: 2000,
		history_bytes: 149619,
		pane_id: "%3",
		pane_active: true,
		pane_dead: false,
	};

	it.effect("decodes finite numbers, pane_id string, and bit booleans", () =>
		Effect.gen(function* () {
			const line = ["1", "174", "30", "3", "2000", "149619", "%3", "1", "0"];
			expect(yield* decodeLine(PaneStruct)(line.join(US))).toEqual(object);
		}),
	);

	it("encodes pane bit booleans true -> '1' and false -> '0'", () => {
		const encoded = Schema.encodeSync(PaneStruct)(object);
		expect(encoded.pane_active).toBe("1");
		expect(encoded.pane_dead).toBe("0");
	});
});
