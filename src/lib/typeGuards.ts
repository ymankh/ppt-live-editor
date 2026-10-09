import { strings } from "@/strings";

// TypeScript does not narrow typeof comparisons against const-object properties.
export function isString(value: unknown): value is string {
  return typeof value === strings.common.string;
}

export function isNumber(value: unknown): value is number {
  return typeof value === strings.common.number;
}

export function isObject(value: unknown): value is object | null {
  return typeof value === strings.common.object;
}

export function isUndefined(value: unknown): value is undefined {
  return typeof value === strings.store.undefined;
}
