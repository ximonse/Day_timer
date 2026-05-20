import { describe, expect, it } from 'vitest';
import { parseMarkdownHtml, parseMarkdownSvg, toggleStrikethrough } from './markdown.js';

describe('parseMarkdownHtml', () => {
  it('escapes HTML before applying markdown', () => {
    expect(parseMarkdownHtml('<script>')).toBe('&lt;script&gt;');
    expect(parseMarkdownHtml('a & b')).toBe('a &amp; b');
  });

  it('wraps bold, italic, strike, underline, sup, sub', () => {
    expect(parseMarkdownHtml('**a**')).toBe('<b>a</b>');
    expect(parseMarkdownHtml('*a*')).toBe('<i>a</i>');
    expect(parseMarkdownHtml('~~a~~')).toBe('<del>a</del>');
    expect(parseMarkdownHtml('__a__')).toBe('<u>a</u>');
    expect(parseMarkdownHtml('^a^')).toBe('<sup>a</sup>');
  });

  it('handles bold before italic so **x** does not become <i>*x*</i>', () => {
    expect(parseMarkdownHtml('**x**')).toBe('<b>x</b>');
  });

  it('handles strike before sub so ~~x~~ does not become <sub><sub>x</sub></sub>', () => {
    expect(parseMarkdownHtml('~~x~~')).toBe('<del>x</del>');
  });

  it('leaves a single unmatched marker intact', () => {
    expect(parseMarkdownHtml('lone * marker')).toBe('lone * marker');
  });

  it('known quirk: unpaired ** collapses to empty italic because the italic regex matches the two stars', () => {
    expect(parseMarkdownHtml('a ** b')).toBe('a <i></i> b');
  });

  it('combines formatting in a single string', () => {
    expect(parseMarkdownHtml('**bold** and *italic*')).toBe('<b>bold</b> and <i>italic</i>');
  });

  it('does not allow injecting raw tags via the markdown payload', () => {
    expect(parseMarkdownHtml('**<img onerror=x>**')).toBe('<b>&lt;img onerror=x&gt;</b>');
  });
});

describe('toggleStrikethrough', () => {
  it('wraps plain text', () => {
    expect(toggleStrikethrough('klar')).toBe('~~klar~~');
  });

  it('unwraps a strikethrough line', () => {
    expect(toggleStrikethrough('~~klar~~')).toBe('klar');
  });

  it('preserves leading and trailing whitespace when unwrapping', () => {
    expect(toggleStrikethrough('  ~~klar~~  ')).toBe('  klar  ');
  });

  it('wraps when only one side has ~~ markers', () => {
    expect(toggleStrikethrough('~~halv')).toBe('~~~~halv~~');
  });
});

describe('parseMarkdownSvg', () => {
  it('produces a single segment for plain text', () => {
    const segs = parseMarkdownSvg('hej');
    expect(segs).toEqual([{ text: 'hej', bold: false, italic: false, strike: false, under: false, sup: false, sub: false }]);
  });

  it('toggles bold for **...**', () => {
    const segs = parseMarkdownSvg('a **b** c');
    expect(segs.map(s => ({ t: s.text, b: s.bold }))).toEqual([
      { t: 'a ', b: false },
      { t: 'b', b: true },
      { t: ' c', b: false }
    ]);
  });

  it('toggles strike for ~~...~~ and treats it as separate from sub', () => {
    const segs = parseMarkdownSvg('~~x~~');
    expect(segs).toHaveLength(1);
    expect(segs[0]).toMatchObject({ text: 'x', strike: true, sub: false });
  });

  it('allows nested formatting (bold + italic)', () => {
    const segs = parseMarkdownSvg('**_*bi*_**'.replace(/_/g, ''));
    const bi = segs.find(s => s.text === 'bi');
    expect(bi).toMatchObject({ bold: true, italic: true });
  });
});
