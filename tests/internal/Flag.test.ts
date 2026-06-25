import { describe, expect, it } from "@effect/vitest";
import { Effect, Schema, SchemaGetter, Tuple } from "effect";
import { TmuxFlag } from "../../src/internal/Flag";

const flatten = (encoded: object): ReadonlyArray<string> =>
	Object.values(encoded).flatMap((value) =>
		Array.isArray(value) ? value : [],
	);
describe("TmuxFlag", () => {
	it.effect("encodes true boolean flags as the token", () =>
		Effect.gen(function* () {
			expect(
				yield* Schema.encodeUnknownEffect(TmuxFlag("-p", Schema.Boolean))(true),
			).toEqual(["-p"]);
		}),
	);

	it.effect("encodes false boolean flags as no argv", () =>
		Effect.gen(function* () {
			expect(
				yield* Schema.encodeUnknownEffect(TmuxFlag("-p", Schema.Boolean))(
					false,
				),
			).toEqual([]);
		}),
	);

	it.effect("encodes string flags as token and value", () =>
		Effect.gen(function* () {
			expect(
				yield* Schema.encodeUnknownEffect(
					TmuxFlag("-b", Schema.NonEmptyString),
				)("buf"),
			).toEqual(["-b", "buf"]);
		}),
	);

	it.effect("encodes numeric flags as token and stringified value", () =>
		Effect.gen(function* () {
			expect(
				yield* Schema.encodeUnknownEffect(TmuxFlag("-S", Schema.Finite))(-20),
			).toEqual(["-S", "-20"]);
		}),
	);

	it.effect("omits undefined optional flags", () =>
		Effect.gen(function* () {
			expect(
				yield* Schema.encodeUnknownEffect(TmuxFlag("-p", Schema.Boolean))(
					undefined,
				),
			).toEqual(undefined);
		}),
	);

	it.effect("supports required flags", () =>
		Effect.gen(function* () {
			expect(
				yield* Schema.encodeUnknownEffect(
					TmuxFlag("-x", Schema.NonEmptyString, { required: true }),
				)("required"),
			).toEqual(["-x", "required"]);
		}),
	);

	it.effect("uses the provided schema's encoded value", () =>
		Effect.gen(function* () {
			const Uppercase = Schema.String.pipe(
				Schema.encode({
					decode: SchemaGetter.transform((value) => value.toLowerCase()),
					encode: SchemaGetter.transform((value) => value.toUpperCase()),
				}),
			);

			expect(
				yield* Schema.encodeUnknownEffect(TmuxFlag("-F", Uppercase))("abc"),
			).toEqual(["-F", "ABC"]);
		}),
	);

	it.effect("composes with unioned structs and shared fields", () =>
		Effect.gen(function* () {
			const SharedFields = {
				targetPane: TmuxFlag("-t", Schema.NonEmptyString),
			};

			const Flags = Schema.Union([
				Schema.Struct({
					print: TmuxFlag("-p", Schema.Literal(true)),
					bufferName: Schema.optional(Schema.Never),
				}),
				Schema.Struct({
					bufferName: TmuxFlag("-b", Schema.NonEmptyString),
					print: TmuxFlag("-p", Schema.Literal(false)),
				}),
			]).mapMembers(Tuple.map(Schema.fieldsAssign(SharedFields)));

			const printed = yield* Schema.encodeUnknownEffect(Flags)({
				print: true,
				targetPane: "%1",
			});

			expect(flatten(printed)).toEqual(["-p", "-t", "%1"]);

			const buffered = yield* Schema.encodeUnknownEffect(Flags)({
				bufferName: "buf",
				print: false,
				targetPane: "%1",
			});

			expect(flatten(buffered)).toEqual(["-b", "buf", "-t", "%1"]);

			const error = yield* Effect.flip(
				Schema.encodeUnknownEffect(Flags)({
					bufferName: "buf",
					print: true,
					targetPane: "%1",
				}),
			);

			expect(error).toBeDefined();
		}),
	);
});
