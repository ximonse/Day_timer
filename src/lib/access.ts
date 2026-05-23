export function hasAdminAccess(loggedInUser: string, adminPassword: string): boolean {
	return loggedInUser.trim().toLowerCase() === 'admin' || !!adminPassword.trim();
}

export function effectiveUserLevel(userLevel: number, loggedInUser: string, adminPassword: string): number {
	return hasAdminAccess(loggedInUser, adminPassword) ? Math.max(userLevel, 2) : userLevel;
}
