import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { TmuxParseError } from "../../src/Errors";
import {
	decodeLine,
	formatString,
	splitRecords,
} from "../../src/internal/Format";
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

// Mirror the control-byte separators the format layer uses.
const US = "\x1f";
const RS = "\x1e";

describe("formatString field order", () => {
	it("listSessions emits the session fields in catalog order", () => {
		expect(formatString(SessionStruct)).toBe(
			`${[
				"#{session_id}",
				"#{session_name}",
				"#{session_windows}",
				"#{session_attached}",
				"#{session_created}",
			].join(US)}${RS}`,
		);
	});

	it("listSessions has the expected field count", () => {
		// Strip the trailing RS terminator before counting fields.
		expect(formatString(SessionStruct).slice(0, -1).split(US)).toHaveLength(5);
	});

	it("listWindows composes session + window fields in order", () => {
		expect(formatString(WindowStruct)).toBe(
			`${[
				"#{session_id}",
				"#{session_name}",
				"#{session_windows}",
				"#{session_attached}",
				"#{session_created}",
				"#{window_id}",
				"#{window_index}",
				"#{window_name}",
				"#{window_active}",
			].join(US)}${RS}`,
		);
	});

	it("listWindows has the expected field count", () => {
		expect(formatString(WindowStruct).slice(0, -1).split(US)).toHaveLength(9);
	});
});

describe("splitRecords", () => {
	const rec = (...fields: ReadonlyArray<string>) => fields.join(US);
	// tmux terminates each record with our RS plus its own newline.
	const wire = (...records: ReadonlyArray<string>) =>
		records.map((r) => `${r}${RS}\n`).join("");

	it("splits records and drops the trailing empty element", () => {
		expect(splitRecords(wire(rec("a", "b"), rec("c", "d")))).toEqual([
			rec("a", "b"),
			rec("c", "d"),
		]);
	});

	it("returns [] for empty stdout", () => {
		expect(splitRecords("")).toEqual([]);
	});

	it("preserves tabs, spaces, and newlines inside a field value", () => {
		const tricky = "a name\twith\ttabs\nand a newline";
		const records = splitRecords(wire(rec("$0", tricky)));
		expect(records).toHaveLength(1);
		expect(records[0]?.split(US)).toEqual(["$0", tricky]);
	});

	it("keeps the final record clean when it ends with a bare RS and no newline", () => {
		const records = splitRecords(`${rec("$0", "main")}${RS}`);
		expect(records).toHaveLength(1);
		expect(records[0]?.split(US)).toEqual(["$0", "main"]);
	});

	it("splits multiple records when the final one lacks a trailing newline", () => {
		const noFinalNewline = `${rec("$0", "a")}${RS}\n${rec("$1", "b")}${RS}`;
		expect(splitRecords(noFinalNewline)).toEqual([
			rec("$0", "a"),
			rec("$1", "b"),
		]);
	});

	// Known limitation: a field value containing the RS terminator (an
	// app-controlled pane title / option value) splits one record into two.
	it("splits a field value that contains the RS+newline terminator", () => {
		const trickyTitle = `b${RS}\nrest`;
		expect(splitRecords(wire(rec("a", trickyTitle)))).toEqual([
			rec("a", "b"),
			"rest",
		]);
	});
});

describe("TmuxParseError sub-shapes are distinguishable", () => {
	it.effect("field-count mismatch populates expected/got, not cause", () =>
		Effect.gen(function* () {
			const error = yield* Effect.flip(
				decodeLine(SessionStruct)(["$0", "main"].join(US)),
			);
			expect(error).toBeInstanceOf(TmuxParseError);
			expect(error.expected).toBe(5);
			expect(error.got).toBe(2);
			expect(error.cause).toBeUndefined();
		}),
	);

	it.effect("schema-decode failure populates cause, not expected/got", () =>
		Effect.gen(function* () {
			const error = yield* Effect.flip(
				decodeLine(SessionStruct)(
					["$0", "main", "notanumber", "0", "1700000000"].join(US),
				),
			);
			expect(error).toBeInstanceOf(TmuxParseError);
			expect(error.cause).toBeDefined();
			expect(error.expected).toBeUndefined();
			expect(error.got).toBeUndefined();
		}),
	);
});

// tmux 3.4 / 3.5 run `-F` output through vis(3): our raw separators arrive as
// the literal text `\037` / `\036`. Reverted in 3.6, absent before 3.4.
describe("splitRecords under tmux 3.4/3.5 vis escaping", () => {
	const rec = (...fields: ReadonlyArray<string>) => fields.join(US);
	const visWire = (...records: ReadonlyArray<Array<string>>) =>
		records.map((r) => `${r.join("\\037")}\\036\n`).join("");

	it("decodes escaped separators into fields", () => {
		expect(splitRecords(visWire(["$0", "main"], ["$1", "other"]))).toEqual([
			rec("$0", "main"),
			rec("$1", "other"),
		]);
	});

	// tmux 3.4/3.5 do not double content backslashes, so `\\` stays `\\`.
	it("leaves a doubled backslash in a field value untouched", () => {
		const records = splitRecords(visWire(["$0", "C:\\\\path"]));
		expect(records).toHaveLength(1);
		expect(records[0]?.split(US)).toEqual(["$0", "C:\\\\path"]);
	});

	// vis leaves tab and newline raw; only octal escapes appear.
	it("preserves raw tabs and newlines inside an escaped record", () => {
		const tricky = "a\tname\nhere";
		const records = splitRecords(visWire(["$0", tricky]));
		expect(records).toHaveLength(1);
		expect(records[0]?.split(US)).toEqual(["$0", tricky]);
	});

	it("returns [] for empty stdout", () => {
		expect(splitRecords("")).toEqual([]);
	});

	// Raw-byte era (3.6+): literal `\037` text in a field must survive verbatim.
	it("does not mangle literal backslash-octal text when raw bytes are present", () => {
		const literal = "title\\037and\\036more";
		const records = splitRecords(`${rec("$0", literal)}${RS}\n`);
		expect(records).toHaveLength(1);
		expect(records[0]?.split(US)).toEqual(["$0", literal]);
	});

	it("leaves stdout without any separator untouched", () => {
		expect(splitRecords("no separators here\n")).toEqual([
			"no separators here\n",
		]);
	});

	// Same documented in-band-delimiter limitation as a raw US/RS inside a value
	// on 3.6+: literal `\036` text in a field splits the record wrongly.
	it("splits a field value containing literal escaped-separator text", () => {
		expect(splitRecords(visWire(["$0", "a\\036\nrest"]))).toEqual([
			rec("$0", "a"),
			"rest",
		]);
	});
});
