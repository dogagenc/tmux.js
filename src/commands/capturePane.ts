import { Schema, Tuple } from "effect";
import { TmuxCommand } from "../internal/Command.js";
import { TmuxFlag } from "../internal/Flag.js";
import { TmuxOutput } from "../internal/Output.js";

/**
 * Capture the contents of a tmux pane (`tmux capture-pane`).
 *
 * `print` and `bufferName` are mutually exclusive (enforced by the type):
 * `print: true` forbids `bufferName`; `print: false` requires one.
 *
 * @returns The captured text when `{ print: true }`, otherwise an empty string
 * (the capture is written to a tmux paste buffer).
 *
 * @example
 * ```ts
 * // Read the visible pane to a string
 * const text = await tmux.capturePane({ print: true, targetPane: "0" });
 *
 * // Capture full scrollback into a named buffer
 * await tmux.capturePane({
 *   print: false,
 *   bufferName: "snapshot",
 *   startLine: "-",
 * });
 * ```
 */
export const capturePane = TmuxCommand.make("capturePane", {
	cmd: "capture-pane",
	/** print and bufferName are mutually exclusive */
	flags: Schema.Union([
		Schema.Struct({
			/** Print captured content to stdout instead of a tmux buffer (`-p`). */
			print: TmuxFlag("-p", Schema.Literal(true)),
			bufferName: Schema.optional(Schema.Never),
		}),
		Schema.Struct({
			/** Explicitly do not print; write to `bufferName` instead (`-p`). */
			print: TmuxFlag("-p", Schema.Literal(false)),
			/** Buffer name to write when not printing to stdout (`-b`). */
			bufferName: TmuxFlag("-b", Schema.NonEmptyString, { required: true }),
		}),
	]).mapMembers(
		Tuple.map(
			Schema.fieldsAssign({
				/** Use the alternate screen instead of history (`-a`). */
				alternateScreen: TmuxFlag("-a", Schema.Boolean),
				/** Escape non-printable characters as octal sequences (`-C`). */
				escapeNonPrintable: TmuxFlag("-C", Schema.Boolean),
				/** Include escape sequences for text and background attributes (`-e`). */
				escapeSequences: TmuxFlag("-e", Schema.Boolean),
				/** Join wrapped lines and preserve trailing spaces; implies `trimEmpty` (`-J`). */
				joinWrappedLines: TmuxFlag("-J", Schema.Boolean),
				/** Capture the screen for the active mode, if any (`-M`). */
				modeScreen: TmuxFlag("-M", Schema.Boolean),
				/** Preserve trailing spaces at each line's end (`-N`). */
				preserveTrailingSpaces: TmuxFlag("-N", Schema.Boolean),
				/** Capture only the beginning of an incomplete escape sequence (`-P`). */
				pendingEscapeSequence: TmuxFlag("-P", Schema.Boolean),
				/** Suppress errors for unavailable alternate/mode screens (`-q`). */
				quiet: TmuxFlag("-q", Schema.Boolean),
				/** Ignore trailing positions that do not contain a character (`-T`). */
				trimEmpty: TmuxFlag("-T", Schema.Boolean),
				/** Ending line: number, negative history offset, or `"-"` for visible end (`-E`). */
				endLine: TmuxFlag(
					"-E",
					Schema.Union([Schema.Int, Schema.Literal("-")]),
				),
				/** Starting line: number, negative history offset, or `"-"` for history start (`-S`). */
				startLine: TmuxFlag(
					"-S",
					Schema.Union([Schema.Int, Schema.Literal("-")]),
				),
				/** Target pane to capture (`-t`). */
				targetPane: TmuxFlag("-t", Schema.NonEmptyString),
			}),
		),
	),
	output: TmuxOutput.string(),
});
