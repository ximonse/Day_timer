import { describe, expect, test } from 'vitest';
import { effectiveUserLevel, hasAdminAccess } from './access.js';

describe('access', () => {
	test('treats logged in admin as admin access', () => {
		expect(hasAdminAccess('admin', '')).toBe(true);
		expect(hasAdminAccess('Admin', '')).toBe(true);
	});

	test('treats saved admin password as local admin access', () => {
		expect(hasAdminAccess('', 'secret')).toBe(true);
	});

	test('does not grant admin access to regular users', () => {
		expect(hasAdminAccess('teacher', '')).toBe(false);
	});

	test('raises effective user level for admins without mutating stored level', () => {
		expect(effectiveUserLevel(1, 'admin', '')).toBe(2);
		expect(effectiveUserLevel(1, '', 'secret')).toBe(2);
		expect(effectiveUserLevel(3, 'admin', '')).toBe(3);
		expect(effectiveUserLevel(1, 'teacher', '')).toBe(1);
	});
});
