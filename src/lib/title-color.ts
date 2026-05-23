import { toggleStrikethrough } from './markdown.js';

const CSS_HEX_RE = /^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const COLOR_DIRECTIVE_RE = /\s!((?:#?[0-9a-fA-F]{3,8})|[a-zA-Z]+)\s*$/;
const CSS_COLOR_NAMES = new Set([
	'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
	'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse', 'chocolate',
	'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan',
	'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkorange', 'darkorchid',
	'darkred', 'darksalmon', 'darkseagreen', 'darkslateblue', 'darkslategray',
	'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue',
	'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'forestgreen', 'fuchsia',
	'gainsboro', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow', 'grey', 'hotpink',
	'indianred', 'indigo', 'khaki', 'lavender', 'lawngreen', 'lightblue', 'lightcoral',
	'lightcyan', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon',
	'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey', 'lime',
	'limegreen', 'magenta', 'maroon', 'mediumblue', 'mediumorchid', 'mediumpurple',
	'mediumseagreen', 'mediumslateblue', 'mediumspringgreen', 'mediumturquoise',
	'mediumvioletred', 'midnightblue', 'navy', 'olive', 'orange', 'orangered',
	'orchid', 'pink', 'plum', 'purple', 'red', 'royalblue', 'salmon', 'sandybrown',
	'seagreen', 'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey',
	'springgreen', 'steelblue', 'tan', 'teal', 'tomato', 'turquoise', 'violet',
	'white', 'yellow', 'yellowgreen'
]);

function normalizeTitle(title: string): string {
	return stripColorDirective(title).trim().toLocaleLowerCase('sv-SE');
}

function hashString(value: string): number {
	let hash = 0;
	for (let i = 0; i < value.length; i += 1) {
		hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
	}
	return Math.abs(hash);
}

function explicitColor(title: string): string | null {
	const match = title.match(COLOR_DIRECTIVE_RE);
	if (!match) return null;
	const value = match[1];
	if (CSS_HEX_RE.test(value)) return value.startsWith('#') ? value.toLowerCase() : `#${value.toLowerCase()}`;
	const named = value.toLowerCase();
	return CSS_COLOR_NAMES.has(named) ? named : null;
}

export function stripColorDirective(title: string): string {
	const match = title.match(COLOR_DIRECTIVE_RE);
	if (!match) return title;
	const value = match[1];
	const isHex = CSS_HEX_RE.test(value);
	const isNamedColor = CSS_COLOR_NAMES.has(value.toLowerCase());
	return isHex || isNamedColor ? title.slice(0, match.index).trimEnd() : title;
}

export function colorForTitle(title: string, palette: string[]): string {
	const explicit = explicitColor(title);
	if (explicit) return explicit;
	if (palette.length === 0) return '#999999';
	return palette[paletteIndexForTitle(title, palette)];
}

export function paletteIndexForTitle(title: string, palette: string[]): number {
	if (palette.length === 0) return 0;
	const normalized = normalizeTitle(title);
	if (!normalized) return 0;
	return hashString(normalized) % palette.length;
}

export function hasColorDirective(title: string): boolean {
	return explicitColor(title) !== null;
}

export function toggleTitleStrikethrough(title: string): string {
	const match = title.match(COLOR_DIRECTIVE_RE);
	if (!match || explicitColor(title) === null) return toggleStrikethrough(title);
	const text = title.slice(0, match.index);
	return `${toggleStrikethrough(text).trimEnd()} ${match[0].trim()}`;
}
