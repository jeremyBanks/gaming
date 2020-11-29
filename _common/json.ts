import { z } from "../deps.ts";

export type Json = null | number | string | boolean | Json[] | {
  [key: string]: Json;
};
export const Json: z.ZodSchema<Json> = z.union([
  z.null(),
  z.number(),
  z.string(),
  z.array(z.lazy(() => Json)),
  z.record(z.lazy(() => Json)),
]);

export const encode = (value: unknown): string => {
  const fudge = 4;
  const mini = toCanonicalJson(value);
  const pretty = JSON.stringify(value, null, 2);
  const prettyLines = pretty.split(/\n/g);
  const prettyRows = prettyLines.length;
  const prettyColumns = Math.max(...prettyLines.map((l) => l.length));
  return (prettyRows <= 24 * fudge && prettyColumns <= 80 * fudge)
    ? pretty
    : mini;
};

export const decode = (value: string): Json => {
  return JSON.parse(value) ?? null;
};

const toCanonicalJson = (tree: unknown, indent?: number): string => {
  const transform = (
    node: unknown,
    ancestors: unknown[] = [],
  ): unknown => {
    if (typeof node === "object" && node !== null) {
      if (ancestors.includes(node)) {
        return null;
      }

      const newAncestors = [...ancestors, node];

      if (node instanceof Array) {
        return node.map((x) => transform(x as Json, newAncestors));
      } else {
        return Object.fromEntries(
          Object.keys(node).sort().map((key) => [
            key,
            transform((node as any)[key] as Json, newAncestors),
          ]),
        );
      }
    } else if (typeof node === "undefined") {
      return null;
    } else if (typeof node === "bigint") {
      return String(node);
    } else if (node === +Infinity) {
      return "+Infinity";
    } else if (node === -Infinity) {
      return "-Infinity";
    } else if (node instanceof Date) {
      return node.getTime();
    } else if (node instanceof Function) {
      return node.toString();
    } else {
      return node;
    }
  };
  return JSON.stringify(transform(tree), null, indent) ?? "null";
};
