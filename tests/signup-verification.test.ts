import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getSignupConflictStatus } from '../src/controllers/auth.controller.js';

describe('signup verification flow', () => {
  it('blocks a signup when the same email or username is already pending verification', () => {
    const conflict = getSignupConflictStatus({
      email: 'alice@example.com',
      username: 'alice',
      verifiedEmails: ['bob@example.com'],
      verifiedUsernames: ['bob'],
      pendingEmails: ['alice@example.com'],
      pendingUsernames: ['alice'],
    });

    assert.equal(conflict, 'email_or_username_already_pending');
  });

  it('allows a signup when no verified or pending account matches', () => {
    const conflict = getSignupConflictStatus({
      email: 'new@example.com',
      username: 'newuser',
      verifiedEmails: ['bob@example.com'],
      verifiedUsernames: ['bob'],
      pendingEmails: ['alice@example.com'],
      pendingUsernames: ['alice'],
    });

    assert.equal(conflict, null);
  });
});
