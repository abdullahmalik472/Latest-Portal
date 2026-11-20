/**
 * Conditional type (an "if" for types), recursive, using template literals:
 * "teacher_name" -> "teacherName", "id" -> "id".
 */
export type SnakeToCamel<S extends string> =
  S extends `${infer Head}_${infer Tail}` ? `${Head}${Capitalize<SnakeToCamel<Tail>>}` : S;

/** Mapped type (a "for loop" over keys) that renames every key from snake_case to camelCase. */
export type CamelKeys<T> = { [K in keyof T as SnakeToCamel<K & string>]: T[K] };

/** Mapped + conditional: every Date field becomes a string, because JSON sends dates as ISO strings. */
export type Serialized<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] };
