# object-diff-ts

Typed deep object diffing with array identity support and change reconstruction.

## What & Why

Compare any two objects or arrays and get a precise, typed list of changes. Supports nested structures, array identity (keyBy), and bi-directional reconstruction—apply changes forward or reverse them for undo. Useful for auditing, state machines, and incremental sync.

## API

```typescript
export function diff(a: unknown, b: unknown, opts?: {keyBy?: string}): Change[]
export function apply(a: unknown, changes: Change[], opts?: ApplyOptions): unknown
export function reverse(changes: Change[]): Change[]

interface Change {
  path: string
  type: 'added' | 'removed' | 'changed'
  before?: unknown
  after?: unknown
}
```

## Install

```bash
npm install object-diff-ts
```

## Quick Start

```typescript
import { diff, apply, reverse } from 'object-diff-ts';

const a = { user: 'Alice', age: 30, tags: ['admin'] };
const b = { user: 'Alice', age: 31, tags: ['admin', 'verified'] };

const changes = diff(a, b);
// => [
//   { path: 'age', type: 'changed', before: 30, after: 31 },
//   { path: 'tags.[1]', type: 'added', before: undefined, after: 'verified' }
// ]

const reconstructed = apply(a, changes);
// reconstructed === b (in value)

const undone = apply(b, reverse(changes));
// undone === a (in value)
```

## Limits

- Path notation uses dot and bracket syntax; complex key names (e.g., containing `.` or `[`) are escaped in the path string but not split.
- Array keyBy matches by single key field; composite keys require pre-transformation.
- Circular references are not detected; pass cloned/filtered data.
- Functions and symbols in objects are omitted during clone.

---
Part of the [ferrow-toolkit](https://github.com/Ruzylo-cloud/ferrow-toolkit) collection · Sponsored by [Ferrow](https://ferrow.ai)
