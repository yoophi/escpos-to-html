import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('merges classnames', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('filters falsy values', () => {
    expect(cn('a', false && 'b', undefined, null, 'c')).toBe('a c');
  });
});
