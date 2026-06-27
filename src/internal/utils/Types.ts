/**
 * Force TS to display a type as its resolved `{ … }` shape rather than an alias
 * name in tooltips and errors. Structurally identical to its input.
 */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};
