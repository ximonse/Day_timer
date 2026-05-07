export const CX = 180, CY = 180, R = 155, Ri = 65;

export const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');

export const fmtHM = (mins: number) => {
  mins = ((mins % 1440) + 1440) % 1440;
  return pad(mins / 60) + ':' + pad(mins % 60);
};

export function polar(angleDeg: number, r: number): [number, number] {
  const a = (angleDeg - 90) * Math.PI / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

export function arcPath(a0: number, a1: number, rOuter: number, rInner: number): string {
  if (a1 - a0 >= 359.999) a1 = a0 + 359.999;
  const large = (a1 - a0) > 180 ? 1 : 0;
  const [x0, y0] = polar(a0, rOuter);
  const [x1, y1] = polar(a1, rOuter);
  if (rInner > 0) {
    const [x2, y2] = polar(a1, rInner);
    const [x3, y3] = polar(a0, rInner);
    return `M ${x0} ${y0} A ${rOuter} ${rOuter} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${rInner} ${rInner} 0 ${large} 0 ${x3} ${y3} Z`;
  }
  return `M ${CX} ${CY} L ${x0} ${y0} A ${rOuter} ${rOuter} 0 ${large} 1 ${x1} ${y1} Z`;
}

export function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
