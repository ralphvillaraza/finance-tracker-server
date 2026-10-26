import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveAuthenticatedUserId } from '../src/utils/userContext.js';

describe('user-scoping', () => {
  it('prefers the authenticated user id over the legacy default fallback', async () => {
    const result = await resolveAuthenticatedUserId({ reqUserId: 42, preferredUserId: 1 });
    assert.equal(result, 42);
  });
});
