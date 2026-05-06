/**
 * Module-private symbol used as the brand key. Declared `unique symbol` so it's
 * nominally distinct and not addressable from outside this module — keeps
 * `Brand<T, B>` truly opaque (no `obj.__brand` access, no fake construction
 * via plain-object cast).
 */
declare const brandKey: unique symbol;

/**
 * Brand a primitive with a compile-time tag so two args of the same primitive
 * type with different semantic meaning can't be swapped accidentally.
 *
 * The `B` parameter is the discriminator (typically a string literal). The
 * key itself is a module-private `unique symbol`, so the brand is fully
 * opaque — consumer code cannot read, write, or accidentally satisfy the
 * brand key without going through this type.
 *
 * @example
 *   type FieldName = Brand<string, "FieldName">;
 *   type FieldValue = Brand<string, "FieldValue">;
 *   // function takes a FieldName, can't accidentally pass a FieldValue
 */
export type Brand<T, B> = T & { readonly [brandKey]: B };

/**
 * Derive the discriminated-union type from a const object that mixes:
 *   - bare-value variants (no payload):       `Foo: "Foo"`
 *   - factory-function variants (with payload): `Bar(x: number) { return { Bar: { x } } as const }`
 *
 * Adding a new variant to the const object automatically extends the union.
 *
 * @example
 *   const SessionError = {
 *     AlreadyDisputed: "AlreadyDisputed",
 *     AlreadyExists(id: string) { return { AlreadyExists: { id } } as const; },
 *   } as const;
 *   type SessionError = EnumValues<typeof SessionError>;
 *   //   = "AlreadyDisputed" | { AlreadyExists: { id: string } }
 */
export type EnumValues<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => infer R ? R : T[K];
}[keyof T];
