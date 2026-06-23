import { test, expect, type Page } from '@playwright/test';

// Seed a known day plan into localStorage before the app boots, so tests are
// deterministic regardless of the machine's clock or any prior state.
async function seedDayPlan(page: Page, agendaText: string) {
	await page.addInitScript((text) => {
		const d = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
		const state = {
			palette: 'sansad',
			dark: false,
			agendaText: text,
			agendaText2: '',
			agendaDate: iso,
			agendaView: 'school',
			activeSection: 'now',
			blocks: [],
			dayTitle: '',
			isLocked: false,
			syncKey: '',
			firstVisit: false,
			segMinutesMode: 'planned'
		};
		localStorage.setItem('day_timer_v1', JSON.stringify(state));
		localStorage.setItem('day_timer_execution_mode_v1', 'timed');
		localStorage.removeItem('day_timer_flow_runtime_v1');
	}, agendaText);
}

test('app boots and renders the timer without console errors', async ({ page }) => {
	const errors: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') errors.push(msg.text());
	});

	await page.goto('/');

	// The SVG clock is the heart of the app.
	await expect(page.locator('svg.clock')).toBeVisible();
	expect(errors, `console errors: ${errors.join(' | ')}`).toEqual([]);
});

test('editing the day plan updates the bound pass (day text -> session read-back)', async ({ page }) => {
	const today = new Date();
	const yy = `${String(today.getFullYear()).slice(2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
	await seedDayPlan(
		page,
		`@${yy}\n#Pass A 08:00 <!--id:aaa1111-->\nIntro 30m\nArbete 20m\n\n#Pass B 09:00 <!--id:bbb2222-->\nGenomgang 15m`
	);

	await page.goto('/');

	// Select "Pass A" from the agenda — clicking the block body (not the name) loads it.
	await page.locator('.agenda-block', { hasText: 'Pass A' }).click({ position: { x: 8, y: 6 } });

	// It loads into the plan editor with its activities.
	const dayText = page.getByPlaceholder(/klistra in dagplanen/i);
	await expect(dayText).toBeVisible();

	// Rename the pass and change an activity in the day text, then save.
	await dayText.fill(`@${yy}\n#Pass A2 08:00\nIntro 30m\nArbete 25m\n#Pass B 09:00\nGenomgang 15m`);
	await page.getByRole('button', { name: /Spara i dagplan/i }).click();

	// The bound session must reflect the edit (read-back), with the binding kept by id.
	await expect.poll(async () => {
		return page.evaluate(() => {
			const raw = JSON.parse(localStorage.getItem('day_timer_v1') || '{}');
			return {
				title: raw.dayTitle,
				arbete: (raw.blocks || []).find((b: { title: string }) => b.title === 'Arbete')?.minutes
			};
		});
	}).toEqual({ title: 'Pass A2', arbete: 25 });
});
