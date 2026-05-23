export interface InviteRecord {
	used?: boolean;
	multi?: boolean;
}

export function normalizeInviteCode(code: string): string {
	return code.trim().toUpperCase();
}

export function inviteKey(code: string): string {
	return `daytimer:invite:${normalizeInviteCode(code)}`;
}
