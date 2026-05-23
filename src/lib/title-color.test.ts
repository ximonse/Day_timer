import { describe, expect, test } from 'vitest';
import { colorForTitle, hasColorDirective, paletteIndexForTitle, stripColorDirective, toggleTitleStrikethrough } from './title-color.js';

const palette = ['#111111', '#222222', '#333333', '#444444'];

describe('title colors', () => {
	test('uses the same palette color for the same title regardless of order', () => {
		expect(colorForTitle('Matematik', palette)).toBe(colorForTitle('Matematik', palette));
		expect(colorForTitle('  matematik  ', palette)).toBe(colorForTitle('Matematik', palette));
		expect(paletteIndexForTitle('Matematik', palette)).toBe(paletteIndexForTitle('Matematik', palette));
	});

	test('strips color directives before display and fallback hashing', () => {
		expect(stripColorDirective('Matematik !blue')).toBe('Matematik');
	});

	test('uses explicit css color directives when present', () => {
		expect(colorForTitle('Matematik !blue', palette)).toBe('blue');
		expect(colorForTitle('Arbetsbok !ff0023', palette)).toBe('#ff0023');
		expect(colorForTitle('Rast !#00ff88', palette)).toBe('#00ff88');
		expect(hasColorDirective('Rast !#00ff88')).toBe(true);
		expect(hasColorDirective('Rast')).toBe(false);
	});

	test('accepts css hex colors with alpha channels', () => {
		expect(colorForTitle('Bild !0f08', palette)).toBe('#0f08');
		expect(colorForTitle('Musik !#112233cc', palette)).toBe('#112233cc');
		expect(stripColorDirective('Bild !0f08')).toBe('Bild');
		expect(stripColorDirective('Musik !#112233cc')).toBe('Musik');
	});

	test('strips trailing color directives from display titles', () => {
		expect(stripColorDirective('Matematik !blue')).toBe('Matematik');
		expect(stripColorDirective('Arbetsbok s. 123 !ff0023')).toBe('Arbetsbok s. 123');
		expect(stripColorDirective('Inte färg !viktigt')).toBe('Inte färg !viktigt');
	});

	test('keeps color directives hidden when toggling title strikethrough', () => {
		expect(toggleTitleStrikethrough('Matematik !blue')).toBe('~~Matematik~~ !blue');
		expect(stripColorDirective(toggleTitleStrikethrough('Matematik !blue'))).toBe('~~Matematik~~');
		expect(toggleTitleStrikethrough('~~Matematik~~ !blue')).toBe('Matematik !blue');
	});
});
