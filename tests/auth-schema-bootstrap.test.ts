import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAuthMigrationStatements } from '../src/utils/authSchemaBootstrap.js';

describe('auth schema bootstrap', () => {
  it('avoids MySQL 5.7-incompatible IF NOT EXISTS modifiers on column and index alterations', () => {
    const statements = buildAuthMigrationStatements();

    for (const statement of statements) {
      if (statement.includes('ALTER TABLE users')) {
        assert.equal(statement.includes('IF NOT EXISTS'), false, `column alteration should not use IF NOT EXISTS: ${statement}`);
      }

      if (statement.includes('CREATE UNIQUE INDEX')) {
        assert.equal(statement.includes('IF NOT EXISTS'), false, `index creation should not use IF NOT EXISTS: ${statement}`);
      }
    }

    assert.match(statements[0], /ALTER TABLE users ADD COLUMN username VARCHAR\(50\) NULL/i);
    assert.match(statements[1], /ALTER TABLE users ADD COLUMN is_verified TINYINT\(1\) NOT NULL DEFAULT 0/i);
  });
});
