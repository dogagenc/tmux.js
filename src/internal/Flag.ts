import { Schema, SchemaGetter } from "effect";

type TmuxFlagCodec<S extends Schema.Top> = Schema.Codec<
	S["Type"],
	ReadonlyArray<string>,
	S["DecodingServices"],
	S["EncodingServices"]
>;

export interface TmuxFlagOptions {
	readonly required?: true;
}

const makeFlag = <S extends Schema.Top>(
	token: string,
	schema: S,
): TmuxFlagCodec<S> =>
	schema.pipe(
		Schema.encodeTo(Schema.Array(Schema.String), {
			decode: SchemaGetter.transform(() => {
				throw new Error("TmuxFlag only supports encoding");
			}),
			encode: SchemaGetter.transform((value: S["Type"]) => {
				if (value === true) {
					return [token];
				}
				if (value === false) {
					return [];
				}
				return [token, String(value)];
			}),
		}),
	) as unknown as TmuxFlagCodec<S>;

/**
 * Schema-backed tmux flag encoder.
 *
 * Flags are optional by default and accept explicit `undefined`. Pass
 * `{ required: true }` only for the rare tmux flag that must be present.
 *
 * The schema validates the caller-facing value. Encoding produces argv chunks:
 * - `true` boolean flags emit `[token]`
 * - `false` boolean flags emit `[]`
 * - all other values emit `[token, String(encodedValue)]`
 */
export function TmuxFlag<S extends Schema.Top>(
	token: string,
	schema: S,
): Schema.optional<TmuxFlagCodec<S>>;
export function TmuxFlag<S extends Schema.Top>(
	token: string,
	schema: S,
	options: { readonly required: true },
): TmuxFlagCodec<S>;
export function TmuxFlag<S extends Schema.Top>(
	token: string,
	schema: S,
	options?: TmuxFlagOptions,
): Schema.optional<TmuxFlagCodec<S>> | TmuxFlagCodec<S> {
	const flag = makeFlag(token, schema);
	return options?.required === true ? flag : Schema.optional(flag);
}
