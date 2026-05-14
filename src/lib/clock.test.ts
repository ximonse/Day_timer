import { describe, it, expect } from 'vitest';
import { fmtHM, polar, arcPath, truncate, CX, CY, R } from './clock.js';

describe('fmtHM', () => {
  it('formaterar normala tider', () => {
    expect(fmtHM(0)).toBe('00:00');
    expect(fmtHM(60)).toBe('01:00');
    expect(fmtHM(90)).toBe('01:30');
    expect(fmtHM(8 * 60)).toBe('08:00');
    expect(fmtHM(23 * 60 + 59)).toBe('23:59');
  });

  it('normaliserar negativa minuter (wrap runt midnatt)', () => {
    expect(fmtHM(-60)).toBe('23:00');
    expect(fmtHM(-1)).toBe('23:59');
  });

  it('normaliserar minuter över ett dygn', () => {
    expect(fmtHM(24 * 60)).toBe('00:00');
    expect(fmtHM(25 * 60)).toBe('01:00');
    expect(fmtHM(1500)).toBe('01:00'); // 1500 = 25h
  });

  it('hanterar decimaler (sekunddel ignoreras i visning)', () => {
    expect(fmtHM(90.9)).toBe('01:30');
  });
});

describe('polar', () => {
  it('0 grader pekar rakt upp (12 på klockan)', () => {
    const [x, y] = polar(0, 100);
    expect(x).toBeCloseTo(CX);
    expect(y).toBeCloseTo(CY - 100);
  });

  it('90 grader pekar rakt höger (3 på klockan)', () => {
    const [x, y] = polar(90, 100);
    expect(x).toBeCloseTo(CX + 100);
    expect(y).toBeCloseTo(CY);
  });

  it('180 grader pekar rakt ned (6 på klockan)', () => {
    const [x, y] = polar(180, 100);
    expect(x).toBeCloseTo(CX);
    expect(y).toBeCloseTo(CY + 100);
  });

  it('270 grader pekar rakt vänster (9 på klockan)', () => {
    const [x, y] = polar(270, 100);
    expect(x).toBeCloseTo(CX - 100);
    expect(y).toBeCloseTo(CY);
  });

  it('r=0 ger alltid centrum', () => {
    const [x, y] = polar(45, 0);
    expect(x).toBeCloseTo(CX);
    expect(y).toBeCloseTo(CY);
  });
});

describe('arcPath', () => {
  it('returnerar en sträng som börjar med M', () => {
    const path = arcPath(0, 90, R, 0);
    expect(path).toMatch(/^M /);
  });

  it('fylld sektor (rInner=0) innehåller inte A rInner', () => {
    const path = arcPath(0, 90, R, 0);
    expect(path).toContain(`M ${CX} ${CY}`);
  });

  it('munkform (rInner>0) innehåller två A-kommandon', () => {
    const path = arcPath(0, 90, R, 65);
    const arcCount = (path.match(/ A /g) ?? []).length;
    expect(arcCount).toBe(2);
  });

  it('large-arc-flag är 1 för bågar > 180 grader', () => {
    const path = arcPath(0, 270, R, 0);
    expect(path).toContain('1 1');
  });

  it('large-arc-flag är 0 för bågar ≤ 180 grader', () => {
    const path = arcPath(0, 90, R, 0);
    expect(path).not.toContain('1 1 ');
  });

  it('kappas vid 359.999 för att undvika SVG-fel vid fullcirkel', () => {
    const path = arcPath(0, 360, R, 0);
    expect(path).toBe(arcPath(0, 359.999, R, 0));
  });
});

describe('truncate', () => {
  it('returnerar strängen orörd om den är kortare än n', () => {
    expect(truncate('abc', 5)).toBe('abc');
    expect(truncate('abc', 3)).toBe('abc');
  });

  it('trunkerar och lägger till … om strängen är längre än n', () => {
    expect(truncate('abcde', 4)).toBe('abc…');
    expect(truncate('hello world', 6)).toBe('hello…');
  });

  it('hanterar tom sträng', () => {
    expect(truncate('', 5)).toBe('');
  });
});
