export interface SvgTextSegment {
	text: string;
	bold: boolean;
	italic: boolean;
	strike: boolean;
	under: boolean;
	sup: boolean;
	sub: boolean;
}

const MARKDOWN_RULES = [
	{ regex: /\*\*(.*?)\*\*/g, prop: 'bold', htmlOpen: '<b>', htmlClose: '</b>' },
	{ regex: /\*(.*?)\*/g, prop: 'italic', htmlOpen: '<i>', htmlClose: '</i>' },
	{ regex: /~~(.*?)~~/g, prop: 'strike', htmlOpen: '<del>', htmlClose: '</del>' },
	{ regex: /__(.*?)__/g, prop: 'under', htmlOpen: '<u>', htmlClose: '</u>' },
	{ regex: /\^(.*?)\^/g, prop: 'sup', htmlOpen: '<sup>', htmlClose: '</sup>' },
	{ regex: /~(.*?)~/g, prop: 'sub', htmlOpen: '<sub>', htmlClose: '</sub>' }
];

export function parseMarkdownHtml(text: string): string {
	let parsed = text
		// Escape basic HTML to prevent XSS (since we will use {@html ...})
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

	for (const rule of MARKDOWN_RULES) {
		parsed = parsed.replace(rule.regex, `${rule.htmlOpen}$1${rule.htmlClose}`);
	}
	return parsed;
}

export function parseMarkdownSvg(text: string): SvgTextSegment[] {
	// We want to split the string into segments that have different formatting.
	// The simplest way is to iterate character by character and build segments,
	// toggling state when we encounter markdown markers.
	const segments: SvgTextSegment[] = [];
	
	let current: SvgTextSegment = { text: '', bold: false, italic: false, strike: false, under: false, sup: false, sub: false };
	
	// A rudimentary parser
	let i = 0;
	while (i < text.length) {
		if (text.substring(i, i + 2) === '**') {
			if (current.text) { segments.push({ ...current }); current.text = ''; }
			current.bold = !current.bold;
			i += 2;
			continue;
		}
		if (text.substring(i, i + 2) === '~~') {
			if (current.text) { segments.push({ ...current }); current.text = ''; }
			current.strike = !current.strike;
			i += 2;
			continue;
		}
		if (text.substring(i, i + 2) === '__') {
			if (current.text) { segments.push({ ...current }); current.text = ''; }
			current.under = !current.under;
			i += 2;
			continue;
		}
		// Single char markers
		if (text[i] === '*') {
			if (current.text) { segments.push({ ...current }); current.text = ''; }
			current.italic = !current.italic;
			i += 1;
			continue;
		}
		if (text[i] === '^') {
			if (current.text) { segments.push({ ...current }); current.text = ''; }
			current.sup = !current.sup;
			i += 1;
			continue;
		}
		if (text[i] === '~') {
			// Careful: ~~ is strikethrough, we already checked for it.
			if (current.text) { segments.push({ ...current }); current.text = ''; }
			current.sub = !current.sub;
			i += 1;
			continue;
		}
		
		current.text += text[i];
		i++;
	}
	
	if (current.text) {
		segments.push(current);
	}
	
	return segments;
}

export function toggleStrikethrough(text: string): string {
	const trimmed = text.trim();
	if (trimmed.startsWith('~~') && trimmed.endsWith('~~')) {
		// Remove strikethrough (we remove exactly 2 chars from start and end)
		// But let's be safe and replace the outer ~~
		return text.replace(/^(\s*)~~(.*)~~(\s*)$/, '$1$2$3');
	} else {
		// We want to wrap the text in ~~, but keep leading/trailing whitespaces outside
		// Actually, standard markdown lists start with `- `. 
		// We should put the ~~ AFTER the `- `.
		const match = text.match(/^(\s*-\s*)(.*)$/);
		if (match) {
			return `${match[1]}~~${match[2]}~~`;
		}
		return `~~${text}~~`;
	}
}
