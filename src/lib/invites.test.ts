import { describe, expect, test } from 'vitest';
import { inviteKey, normalizeInviteCode } from './invites.js';

describe('invites', () => {
	test('normalizes invite codes the same way for create and upgrade', () => {
		expect(normalizeInviteCode(' beta-test ')).toBe('BETA-TEST');
		expect(inviteKey(' beta-test ')).toBe('daytimer:invite:BETA-TEST');
	});
});
