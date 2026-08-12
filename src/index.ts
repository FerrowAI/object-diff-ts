export type ChangeType = 'added' | 'removed' | 'changed';

export interface Change {
  path: string;
  type: ChangeType;
  before?: unknown;
  after?: unknown;
}

interface DiffOptions {
  keyBy?: string; // for array identity (e.g., 'id')
}

interface ApplyOptions {
  // currently unused but reserved
}

/**
 * Deep object comparison producing a typed change list.
 * Handles nested objects, arrays (index-based or keyBy), primitives.
 */
export function diff(a: unknown, b: unknown, opts?: DiffOptions): Change[] {
  const changes: Change[] = [];
  diffRecurse(a, b, '', changes, opts ?? {});
  return changes;
}

/**
 * Apply a changeset to reconstruct b from a and changes.
 */
export function apply(a: unknown, changes: Change[], opts?: ApplyOptions): unknown {
  const result = deepClone(a);
  for (const change of changes) {
    applyChange(result, change.path, change);
  }
  return result;
}

/**
 * Reverse a changeset to undo diffs.
 */
export function reverse(changes: Change[]): Change[] {
  return changes.map(ch => ({
    path: ch.path,
    type:
      ch.type === 'added'
        ? 'removed'
        : ch.type === 'removed'
          ? 'added'
          : 'changed',
    before: ch.after,
    after: ch.before,
  }));
}

function diffRecurse(
  a: unknown,
  b: unknown,
  path: string,
  changes: Change[],
  opts: DiffOptions
): void {
  // Null / undefined / primitives
  if (a === b) return;
  if (a === null || a === undefined || b === null || b === undefined) {
    changes.push({
      path: path || '(root)',
      type: a === undefined || a === null ? 'added' : 'removed',
      before: a,
      after: b,
    });
    return;
  }

  const aType = typeof a;
  const bType = typeof b;

  if (aType !== bType) {
    changes.push({
      path: path || '(root)',
      type: 'changed',
      before: a,
      after: b,
    });
    return;
  }

  // Primitives
  if (aType === 'number' || aType === 'string' || aType === 'boolean') {
    changes.push({
      path: path || '(root)',
      type: 'changed',
      before: a,
      after: b,
    });
    return;
  }

  // Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (opts.keyBy) {
      diffArrayByKey(a, b, path, changes, opts);
    } else {
      diffArrayByIndex(a, b, path, changes, opts);
    }
    return;
  }

  // Objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = new Set(Object.keys(a));
    const keysB = new Set(Object.keys(b));

    // Removed keys
    for (const key of keysA) {
      if (!keysB.has(key)) {
        changes.push({
          path: makePath(path, key),
          type: 'removed',
          before: (a as Record<string, unknown>)[key],
          after: undefined,
        });
      }
    }

    // Added or changed keys
    for (const key of keysB) {
      if (!keysA.has(key)) {
        changes.push({
          path: makePath(path, key),
          type: 'added',
          before: undefined,
          after: (b as Record<string, unknown>)[key],
        });
      } else {
        diffRecurse(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
          makePath(path, key),
          changes,
          opts
        );
      }
    }
    return;
  }

  // Fallback for other types (Date, etc.)
  changes.push({
    path: path || '(root)',
    type: 'changed',
    before: a,
    after: b,
  });
}

function diffArrayByIndex(
  a: unknown[],
  b: unknown[],
  path: string,
  changes: Change[],
  opts: DiffOptions
): void {
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    const aVal = i < a.length ? a[i] : undefined;
    const bVal = i < b.length ? b[i] : undefined;
    diffRecurse(aVal, bVal, makePath(path, `[${i}]`), changes, opts);
  }
}

function diffArrayByKey(
  a: unknown[],
  b: unknown[],
  path: string,
  changes: Change[],
  opts: DiffOptions
): void {
  if (!opts.keyBy) return;
  const keyBy = opts.keyBy;

  const aMap = new Map<unknown, unknown>();
  for (const item of a) {
    if (typeof item === 'object' && item !== null) {
      const key = (item as Record<string, unknown>)[keyBy];
      if (key !== undefined) {
        aMap.set(key, item);
      }
    }
  }

  const bMap = new Map<unknown, unknown>();
  for (const item of b) {
    if (typeof item === 'object' && item !== null) {
      const key = (item as Record<string, unknown>)[keyBy];
      if (key !== undefined) {
        bMap.set(key, item);
      }
    }
  }

  // Removed items
  for (const [key, val] of aMap) {
    if (!bMap.has(key)) {
      changes.push({
        path: makePath(path, `@${String(key)}`),
        type: 'removed',
        before: val,
        after: undefined,
      });
    }
  }

  // Added or changed items
  for (const [key, val] of bMap) {
    if (!aMap.has(key)) {
      changes.push({
        path: makePath(path, `@${String(key)}`),
        type: 'added',
        before: undefined,
        after: val,
      });
    } else {
      diffRecurse(
        aMap.get(key),
        val,
        makePath(path, `@${String(key)}`),
        changes,
        opts
      );
    }
  }
}

function makePath(parent: string, key: string): string {
  if (!parent) return key;
  if (key.startsWith('[')) return `${parent}${key}`;
  return `${parent}.${key}`;
}

function applyChange(obj: unknown, path: string, change: Change): void {
  if (!path || path === '(root)') return;

  const parts = parsePath(path);
  let current = obj as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (typeof current !== 'object' || current === null) return;

    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  if (typeof current !== 'object' || current === null) return;

  if (change.type === 'removed') {
    delete current[lastPart];
  } else {
    current[lastPart] = change.after;
  }
}

function parsePath(path: string): string[] {
  const parts: string[] = [];
  let current = '';
  let i = 0;

  while (i < path.length) {
    if (path[i] === '.') {
      if (current) parts.push(current);
      current = '';
      i++;
    } else if (path[i] === '[') {
      if (current) parts.push(current);
      current = '';
      i++;
      while (i < path.length && path[i] !== ']') {
        current += path[i];
        i++;
      }
      if (current) parts.push(current);
      current = '';
      i++; // skip ]
    } else {
      current += path[i];
      i++;
    }
  }

  if (current) parts.push(current);
  return parts;
}

function deepClone(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Map) {
    const m = new Map();
    for (const [k, v] of obj) {
      m.set(k, deepClone(v));
    }
    return m;
  }
  if (obj instanceof Set) {
    const s = new Set();
    for (const v of obj) {
      s.add(deepClone(v));
    }
    return s;
  }

  const cloned: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
    }
  }
  return cloned;
}
