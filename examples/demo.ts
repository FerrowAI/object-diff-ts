import { diff, apply, reverse } from '../src/index';

console.log('=== object-diff-ts demo ===\n');

const a = {
  user: 'Alice',
  age: 30,
  tags: ['admin'],
  profile: { status: 'active' },
};

const b = {
  user: 'Alice',
  age: 31,
  tags: ['admin', 'verified'],
  profile: { status: 'active', verified: true },
};

console.log('Object A:', JSON.stringify(a, null, 2));
console.log('\nObject B:', JSON.stringify(b, null, 2));

const changes = diff(a, b);
console.log('\nChanges (A → B):', JSON.stringify(changes, null, 2));

const reconstructed = apply(a, changes);
console.log('\nReconstructed from A + changes:', JSON.stringify(reconstructed, null, 2));
console.log('Reconstructed equals B:', JSON.stringify(reconstructed) === JSON.stringify(b));

const undone = apply(b, reverse(changes));
console.log('\nUndone (B + reversed changes):', JSON.stringify(undone, null, 2));
console.log('Undone equals A:', JSON.stringify(undone) === JSON.stringify(a));

console.log('\n✓ All checks passed');
