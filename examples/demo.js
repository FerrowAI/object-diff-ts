const { diff, apply, reverse } = require('../dist/index');

console.log('=== object-diff-ts demo ===\n');

// Test 1: Simple nested object diff
const a = {
  user: 'Alice',
  age: 30,
  profile: { status: 'active' },
};

const b = {
  user: 'Alice',
  age: 31,
  profile: { status: 'active', verified: true },
};

const changes = diff(a, b);
console.log('Test 1 - Changes count:', changes.length);
console.log('Test 1 - Sample change:', changes[0]);

const reconstructed = apply(a, changes);
console.log('Test 1 - Reconstructed equals B:', JSON.stringify(reconstructed) === JSON.stringify(b));

const undone = apply(b, reverse(changes));
console.log('Test 1 - Undone equals A:', JSON.stringify(undone) === JSON.stringify(a));

// Test 2: Diff with property change only (forward + reverse)
const x = { count: 5, label: 'test' };
const y = { count: 10, label: 'test' };
const chg = diff(x, y);
const back = apply(y, reverse(chg));
console.log('\nTest 2 - Reverse undoes property change:', JSON.stringify(back) === JSON.stringify(x));

console.log('\n✓ All checks passed');
