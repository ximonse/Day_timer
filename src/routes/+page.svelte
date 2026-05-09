<script lang="ts">
  import { onMount } from 'svelte';
  import { appState, uid, type Flow } from '$lib/state.svelte.js';
  import { PALETTES, PALETTE_COLORS, clockTheme, labelColorFor } from '$lib/theme.js';
  import { CX, CY, R, Ri, polar, arcPath, nowMinutes, fmtHM, truncate } from '$lib/clock.js';
  import { parseParts, serializeBlocks, parseAgenda, serializeAgenda, type AgendaDay } from '$lib/parse.js';

  const s = appState.value;
  const NS = 'http://www.w3.org/2000/svg';

  function clickOutside(node: HTMLElement, cb: () => void) {
    function handle(e: MouseEvent) {
      if (!node.contains(e.target as Node)) cb();
    }
    document.addEventListener('click', handle, true);
    return { destroy() { document.removeEventListener('click', handle, true); } };
  }

  let svgEl = $state<SVGSVGElement>(null!);
  let sidebarEl = $state<HTMLElement>(null!);
  let flashEl = $state<HTMLElement>(null!);
  let partsArea = $state<HTMLTextAreaElement>(null!);
  let titleInput = $state<HTMLInputElement>(null!);
  let startTimeInput = $state<HTMLInputElement>(null!);
  let endControlEl = $state<HTMLElement>(null!);
  let partsFeedback = $state<HTMLElement>(null!);
  let timeFeedback = $state<HTMLElement>(null!);
  let loginNameInput = $state<HTMLInputElement>(null!);
  let loginPassInput = $state<HTMLInputElement>(null!);
  let loggedInUser = $state('');
  let agendaInputOpen = $state(true);
  let savedAgendaMsg = $state('');
  let agendaDragState = $state<{ i: number; dayIdx: number; startY: number; startMinA: number; startMinB: number; containerH: number } | null>(null);
  let agendaEl = $state<HTMLElement>(null!);
  let timelineEl = $state<HTMLElement>(null!);
  const TIMELINE_SCALE = 1 / 720; // fraction of container per minute (12h = 100%)

  let nowMinLive = $state(nowMinutes());
  let lastAutoLoadKey = $state('');
  let mobileTab = $state<'timer'|'delar'|'plan'>('timer');
  let nowText = $state('--:--');
  let leftText = $state('');
  let flowsOpen = $state(false);
  let themePickerOpen = $state(false);
  let popoverOpen = $state(false);
  let helpOpen = $state(false);
  let copyBtnText = $state('AI-prompt');
  let syncStatusText = $state('');
  let syncStatusError = $state(false);
  let endMode = $state<'end' | 'len'>(s.endMode ?? 'end');

  type AiProvider = 'anthropic' | 'openai' | 'gemini' | 'custom';
  type AiPlanMode = 'strict' | 'helpful';
  interface AiConfig { provider: AiProvider; apiKey: string; baseUrl: string; customModel: string; planMode: AiPlanMode; }
  let aiConfig = $state<AiConfig>({ provider: 'anthropic', apiKey: '', baseUrl: '', customModel: '', planMode: 'helpful' });
  let aiKeyVisible = $state(false);
  let aiPanelOpen = $state(false);
  let aiInput = $state('');
  let aiLoading = $state(false);
  let aiError = $state('');
  let agendaAiInput = $state('');
  let agendaAiLoading = $state(false);
  let agendaAiError = $state('');
  let agendaAiOpen = $state(false);

  const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
    anthropic: 'Claude (Anthropic)',
    openai: 'GPT (OpenAI)',
    gemini: 'Gemini (Google)',
    custom: 'Anpassad (OpenAI-komp.)'
  };
  const AI_KEY_PLACEHOLDERS: Record<AiProvider, string> = {
    anthropic: 'sk-ant-...',
    openai: 'sk-...',
    gemini: 'AIza...',
    custom: 'API-nyckel'
  };

  function saveAiConfig() {
    localStorage.setItem('daytimer_ai_config', JSON.stringify(aiConfig));
    localStorage.removeItem('daytimer_ai_key'); // migrate away from old key
  }
  function clearAiConfig() {
    aiConfig = { provider: 'anthropic', apiKey: '', baseUrl: '', customModel: '' };
    localStorage.removeItem('daytimer_ai_config');
    localStorage.removeItem('daytimer_ai_key');
  }

  // derived shorthand used in templates
  const aiApiKey = $derived(aiConfig.apiKey);

  const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');
  const totalMin = () => s.blocks.reduce((a, b) => a + b.minutes, 0);

  const sectorColors = $derived(clockTheme(s.palette, s.dark).colors);

  const agendaDays = $derived.by<AgendaDay[] | null>(() =>
    s.agendaText.trim() ? parseAgenda(s.agendaText) : null
  );

  const selectedDay = $derived.by<AgendaDay | null>(() => {
    if (!agendaDays?.length) return null;
    if (s.agendaDate) {
      const hit = agendaDays.find(d => d.date === s.agendaDate);
      if (hit) return hit;
    }
    const today = new Date().toISOString().slice(0, 10);
    return agendaDays.find(d => d.date === today)
      ?? agendaDays.find(d => d.date === null)
      ?? agendaDays[0];
  });

  const selectedDayIdx = $derived.by(() =>
    agendaDays && selectedDay ? agendaDays.indexOf(selectedDay) : -1
  );

  const agendaItems = $derived.by(() => {
    const flows = selectedDay?.flows ?? (agendaDays ? [] : s.flows);
    const fromText = agendaDays !== null;
    let t = s.startMin;
    return flows.map(flow => {
      if (flow.startMin !== undefined) t = flow.startMin;
      const startMin = t;
      const totalMin = flow.minutes.reduce((a, b) => a + b, 0);
      t += totalMin;
      return { flow, startMin, totalMin, fromText };
    });
  });

  function fmtAgendaDate(iso: string | null): string {
    if (!iso) return 'Odaterat';
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const days = ['Sön','Mån','Tis','Ons','Tor','Fre','Lör'];
    const months = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
    return `${days[dt.getDay()]} ${d} ${months[m - 1]}`;
  }

  function prevDay() {
    if (!agendaDays || selectedDayIdx <= 0) return;
    s.agendaDate = agendaDays[selectedDayIdx - 1].date ?? '';
    appState.persist();
  }
  function nextDay() {
    if (!agendaDays || selectedDayIdx >= agendaDays.length - 1) return;
    s.agendaDate = agendaDays[selectedDayIdx + 1].date ?? '';
    appState.persist();
  }

  function fmtLeft(left: number): string {
    if (left <= 0) return 'klart';
    const h = Math.floor(left / 60);
    const m = Math.ceil(left % 60);
    if (h === 0) return m === 1 ? '1 minut kvar' : `${m} minuter kvar`;
    if (m === 0) return h === 1 ? '1 timme kvar' : `${h} timmar kvar`;
    return `${h}h ${m}m kvar`;
  }

  function fmtTillStart(min: number): string {
    const h = Math.floor(min / 60);
    const m = Math.ceil(min % 60);
    if (h === 0) return `${m} min till start`;
    if (m === 0) return `${h}h till start`;
    return `${h}h ${m}m till start`;
  }
  const elapsedMin = () => nowMinutes() - s.startMin;
  const startAngle = () => ((s.startMin % s.clockSpan) / s.clockSpan) * 360;

  function syncBodyClasses() {
    const PALETTE_CLASSES = ['sansad','meadow','mlp','bright','clear','psychedelic'];
    document.body.classList.remove(...PALETTE_CLASSES, 'dark', 'sb-collapsed', 'ag-open', 'm-timer', 'm-delar', 'm-plan');
    if (s.palette) document.body.classList.add(s.palette);
    if (s.dark && s.palette !== 'psychedelic') document.body.classList.add('dark');
    if (s.sbCollapsed) document.body.classList.add('sb-collapsed');
    if (s.agendaOpen) document.body.classList.add('ag-open');
    document.body.classList.add('m-' + mobileTab);
  }

  function renderClock() {
    if (!svgEl) return;
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

    const ct = clockTheme(s.palette, s.dark);
    const { bg, dimSuffix, mark: markColor, centerMain, centerMuted, handDark, handLight, chip: chipFill } = ct;
    const cs = ct.colors;
    const tot = totalMin();
    const sa = startAngle();
    const elapsed = elapsedMin();
    const nowMin = nowMinutes();
    const ri = s.hollow ? Ri : 0;
    const labelDefer: { lx: number; ly: number; fillText: string; text: string }[] = [];

    const use12hAgenda = s.clockSpan === 720 && agendaItems.length > 0;

    if (use12hAgenda) {
      // 12h mode: render agenda sessions at absolute clock positions
      const periodStart = Math.floor(nowMin / 720) * 720;
      agendaItems.forEach((item, i) => {
        const itemEnd = item.startMin + item.totalMin;
        if (itemEnd <= periodStart || item.startMin >= periodStart + 720) return;
        const clampStart = Math.max(item.startMin, periodStart);
        const clampEnd = Math.min(itemEnd, periodStart + 720);
        const a0 = ((clampStart - periodStart) / 720) * 360;
        const a1 = ((clampEnd - periodStart) / 720) * 360;
        if (a1 - a0 < 0.1) return;
        const baseColor = cs[i % cs.length];
        const isPast = nowMin >= itemEnd;
        const isActive = nowMin >= item.startMin && nowMin < itemEnd;
        if (isActive) {
          const splitAngle = ((nowMin - periodStart) / 720) * 360;
          if (splitAngle > a0) {
            const pastP = document.createElementNS(NS, 'path');
            pastP.setAttribute('d', arcPath(a0, Math.min(splitAngle, a1), R, ri));
            pastP.setAttribute('fill', baseColor + dimSuffix);
            svgEl.appendChild(pastP);
          }
          if (splitAngle < a1) {
            const liveP = document.createElementNS(NS, 'path');
            liveP.setAttribute('d', arcPath(Math.max(splitAngle, a0), a1, R, ri));
            liveP.setAttribute('fill', baseColor);
            svgEl.appendChild(liveP);
          }
        } else {
          const path = document.createElementNS(NS, 'path');
          path.setAttribute('d', arcPath(a0, a1, R, ri));
          path.setAttribute('fill', isPast ? baseColor + dimSuffix : baseColor);
          svgEl.appendChild(path);
        }
        // transparent hit-area for click-to-load
        const hit = document.createElementNS(NS, 'path');
        hit.setAttribute('d', arcPath(a0, a1, R, ri));
        hit.setAttribute('fill', 'transparent');
        hit.style.cursor = 'pointer';
        hit.addEventListener('click', () => loadAgendaFlow(item.flow, item.startMin));
        svgEl.appendChild(hit);

        const midAngle = (a0 + a1) / 2;
        const [lx, ly] = s.textOutside ? polar(midAngle, R + 22) : polar(midAngle, ri > 0 ? (R + ri) / 2 : R * 0.65);
        const fillText = labelColorFor(baseColor, i, isPast, s.palette, s.dark);
        const timeLabel = fmtHM(item.startMin);
        const nameLabel = truncate(item.flow.title, 10);
        labelDefer.push({ lx, ly, fillText, text: `${nameLabel} ${timeLabel}` });
      });
    } else {
      // 1h/2h mode: render s.blocks as relative sectors
      let cumMin = 0;
      s.blocks.forEach((b, i) => {
        const segStartMin = cumMin;
        const segEndMin = cumMin + b.minutes;
        const a0 = sa + (segStartMin / s.clockSpan) * 360;
        const a1 = sa + (segEndMin / s.clockSpan) * 360;
        const baseColor = cs[i % cs.length];
        const isPast = elapsed >= segEndMin;
        const isActive = elapsed >= segStartMin && elapsed < segEndMin;
        if (isActive) {
          const splitAngle = sa + (elapsed / s.clockSpan) * 360;
          const pastP = document.createElementNS(NS, 'path');
          pastP.setAttribute('d', arcPath(a0, splitAngle, R, ri));
          pastP.setAttribute('fill', baseColor + dimSuffix);
          svgEl.appendChild(pastP);
          const liveP = document.createElementNS(NS, 'path');
          liveP.setAttribute('d', arcPath(splitAngle, a1, R, ri));
          liveP.setAttribute('fill', baseColor);
          svgEl.appendChild(liveP);
        } else {
          const path = document.createElementNS(NS, 'path');
          path.setAttribute('d', arcPath(a0, a1, R, ri));
          path.setAttribute('fill', isPast ? baseColor + dimSuffix : baseColor);
          svgEl.appendChild(path);
        }
        if (i > 0) {
          const [x0, y0] = polar(a0, ri || 0);
          const [x1, y1] = polar(a0, R);
          const hit = document.createElementNS(NS, 'line');
          hit.setAttribute('x1', String(x0)); hit.setAttribute('y1', String(y0));
          hit.setAttribute('x2', String(x1)); hit.setAttribute('y2', String(y1));
          hit.setAttribute('stroke', 'transparent'); hit.setAttribute('stroke-width', '32');
          hit.setAttribute('pointer-events', 'stroke'); hit.style.cursor = 'grab';
          (hit as any)._boundaryIdx = i - 1;
          hit.addEventListener('pointerdown', startBoundaryDrag);
          svgEl.appendChild(hit);
        }
        const midAngle = (a0 + a1) / 2;
        const [lx, ly] = s.textOutside ? polar(midAngle, R + 22) : polar(midAngle, ri > 0 ? (R + ri) / 2 : R / 2);
        const fillText = labelColorFor(baseColor, i, isPast, s.palette, s.dark);
        let labelText = truncate(b.title, 14);
        if (s.segMinutesMode === 'planned') { labelText += ` ${b.minutes}m`; }
        else if (s.segMinutesMode === 'remaining') {
          const mins = isPast ? 0 : isActive ? Math.max(0, Math.ceil(segEndMin - elapsed)) : b.minutes;
          labelText += ` ${mins}m kvar`;
        }
        labelDefer.push({ lx, ly, fillText, text: labelText });
        cumMin = segEndMin;
      });
    }

    if (s.hollow) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', String(CX)); c.setAttribute('cy', String(CY));
      c.setAttribute('r', String(Ri - 3)); c.setAttribute('fill', bg);
      svgEl.appendChild(c);
      if (s.showCenterEnd) {
        if (s.clockSpan === 720) {
          const now = new Date();
          const dayNames = ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag'];
          const monthNames = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
          const t1 = document.createElementNS(NS, 'text');
          t1.setAttribute('x', String(CX)); t1.setAttribute('y', String(CY - 8));
          t1.setAttribute('text-anchor', 'middle'); t1.setAttribute('font-size', '9');
          t1.setAttribute('fill', centerMuted);
          t1.textContent = dayNames[now.getDay()];
          svgEl.appendChild(t1);
          const t2 = document.createElementNS(NS, 'text');
          t2.setAttribute('x', String(CX)); t2.setAttribute('y', String(CY + 11));
          t2.setAttribute('text-anchor', 'middle'); t2.setAttribute('font-size', '17');
          t2.setAttribute('font-weight', '200'); t2.setAttribute('fill', centerMain);
          t2.textContent = `${now.getDate()} ${monthNames[now.getMonth()]}`;
          svgEl.appendChild(t2);
        } else {
          const t1 = document.createElementNS(NS, 'text');
          t1.setAttribute('x', String(CX)); t1.setAttribute('y', String(CY - 8));
          t1.setAttribute('text-anchor', 'middle'); t1.setAttribute('font-size', '11');
          t1.setAttribute('fill', centerMuted); t1.textContent = 'slutar';
          svgEl.appendChild(t1);
          const t2 = document.createElementNS(NS, 'text');
          t2.setAttribute('x', String(CX)); t2.setAttribute('y', String(CY + 12));
          t2.setAttribute('text-anchor', 'middle'); t2.setAttribute('font-size', '20');
          t2.setAttribute('font-weight', '200'); t2.setAttribute('letter-spacing', '-0.5');
          t2.setAttribute('font-variant-numeric', 'tabular-nums'); t2.setAttribute('fill', centerMain);
          t2.textContent = fmtHM(s.startMin + tot);
          svgEl.appendChild(t2);
        }
      }
    }

    if (!use12hAgenda) {
      const [sx0, sy0] = polar(sa, ri || 0);
      const [sx1, sy1] = polar(sa, R);
      const shit = document.createElementNS(NS, 'line');
      shit.setAttribute('x1', String(sx0)); shit.setAttribute('y1', String(sy0));
      shit.setAttribute('x2', String(sx1)); shit.setAttribute('y2', String(sy1));
      shit.setAttribute('stroke', 'transparent'); shit.setAttribute('stroke-width', '36');
      shit.setAttribute('pointer-events', 'stroke'); shit.style.cursor = 'grab';
      shit.addEventListener('pointerdown', startStartDrag);
      svgEl.appendChild(shit);
      const lessonSpan = (tot / s.clockSpan) * 360;
      if (lessonSpan < 360 - 2) {
        const aEnd = sa + lessonSpan;
        const [ex0, ey0] = polar(aEnd, ri || 0);
        const [ex1, ey1] = polar(aEnd, R);
        const ehit = document.createElementNS(NS, 'line');
        ehit.setAttribute('x1', String(ex0)); ehit.setAttribute('y1', String(ey0));
        ehit.setAttribute('x2', String(ex1)); ehit.setAttribute('y2', String(ey1));
        ehit.setAttribute('stroke', 'transparent'); ehit.setAttribute('stroke-width', '36');
        ehit.setAttribute('pointer-events', 'stroke'); ehit.style.cursor = 'grab';
        ehit.addEventListener('pointerdown', startEndDrag);
        svgEl.appendChild(ehit);
      }
    }

    const drawMark = (ang: number, len: number, w: number, op: number) => {
      const [mx0, my0] = polar(ang, R);
      const [mx1, my1] = polar(ang, R - len);
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', String(mx0)); l.setAttribute('y1', String(my0));
      l.setAttribute('x2', String(mx1)); l.setAttribute('y2', String(my1));
      l.setAttribute('stroke', markColor); l.setAttribute('stroke-width', String(w));
      l.setAttribute('stroke-linecap', 'round'); l.setAttribute('opacity', String(op));
      l.setAttribute('pointer-events', 'none');
      svgEl.appendChild(l);
    };
    {
      const cs = s.clockSpan;
      if (cs === 720) {
        if (s.showMin)     { for (let m = 0; m < 720; m += 15)  drawMark((m/720)*360, 5,  1,   0.45); }
        if (s.showFive)    { for (let m = 0; m < 720; m += 60)  drawMark((m/720)*360, 11, 1.8, 0.7);  }
        if (s.showQuarter) { for (let m = 0; m < 720; m += 180) drawMark((m/720)*360, 18, 3,   0.95); }
      } else {
        const f = cs / 60;
        if (s.showMin)     { for (let m = 0; m < cs; m += f)    drawMark((m/cs)*360, 5,  1,   0.45); }
        if (s.showFive)    { for (let m = 0; m < cs; m += 5*f)  drawMark((m/cs)*360, 11, 1.8, 0.7);  }
        if (s.showQuarter) { for (let m = 0; m < cs; m += 15*f) drawMark((m/cs)*360, 18, 3,   0.95); }
      }
    }

    {
      const ang = (nowMin % s.clockSpan / s.clockSpan) * 360;
      const innerR = 30, tipR = R + 2, baseWidth = 22;
      const [tx, ty] = polar(ang, tipR);
      const aRad = (ang - 90) * Math.PI / 180;
      const dx = Math.cos(aRad), dy = Math.sin(aRad);
      const px = -dy, py = dx;
      const cxB = CX + dx * innerR, cyB = CY + dy * innerR;
      const halfW = baseWidth / 2;
      const bx1 = cxB + px * halfW, by1 = cyB + py * halfW;
      const bx2 = cxB - px * halfW, by2 = cyB - py * halfW;
      const spike = document.createElementNS(NS, 'polygon');
      spike.setAttribute('points', `${tx},${ty} ${bx1},${by1} ${bx2},${by2}`);
      spike.setAttribute('fill', handDark); spike.setAttribute('stroke', handLight);
      spike.setAttribute('stroke-width', '1.5'); spike.setAttribute('stroke-linejoin', 'round');
      svgEl.appendChild(spike);
    }

    if (s.showSegLabels) {
      labelDefer.forEach(({ lx, ly, fillText, text }) => {
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', String(lx)); t.setAttribute('y', String(ly));
        t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'middle');
        t.setAttribute('font-size', s.textOutside ? '14' : '13');
        t.setAttribute('font-weight', '600'); t.setAttribute('fill', fillText);
        t.setAttribute('pointer-events', 'none');
        t.textContent = text;
        svgEl.appendChild(t);
        try {
          const bb = t.getBBox();
          const padX = 6, padY = 1.5;
          const chip = document.createElementNS(NS, 'rect');
          chip.setAttribute('x', String(bb.x - padX)); chip.setAttribute('y', String(bb.y - padY));
          chip.setAttribute('width', String(bb.width + padX * 2));
          chip.setAttribute('height', String(bb.height + padY * 2));
          chip.setAttribute('rx', '3'); chip.setAttribute('fill', chipFill);
          chip.setAttribute('stroke', fillText); chip.setAttribute('stroke-width', '1');
          chip.setAttribute('opacity', '0.95'); chip.setAttribute('pointer-events', 'none');
          svgEl.insertBefore(chip, t);
        } catch { /* getBBox may fail */ }
      });
    }
  }

  // ── Drag ──
  type DragState =
    | { type: 'between'; i: number; leftMin: number; rightMin: number }
    | { type: 'end' }
    | { type: 'start'; startMin0: number; endMin0: number; pointerAng0: number };
  let drag: DragState | null = null;

  function pointerAngle(e: PointerEvent): number {
    const rect = svgEl.getBoundingClientRect();
    const scale = rect.width / 360;
    const x = e.clientX - rect.left - CX * scale;
    const y = e.clientY - rect.top - CY * scale;
    let ang = Math.atan2(y, x) * 180 / Math.PI + 90;
    if (ang < 0) ang += 360;
    return ang;
  }

  function startBoundaryDrag(e: Event) {
    const pe = e as PointerEvent;
    pe.preventDefault();
    const i = (pe.target as any)._boundaryIdx as number;
    drag = { type: 'between', i, leftMin: s.blocks[i].minutes, rightMin: s.blocks[i+1].minutes };
    window.addEventListener('pointermove', onDrag);
    window.addEventListener('pointerup', endDrag);
  }
  function startEndDrag(e: Event) {
    (e as PointerEvent).preventDefault();
    drag = { type: 'end' };
    window.addEventListener('pointermove', onDrag);
    window.addEventListener('pointerup', endDrag);
  }
  function startStartDrag(e: Event) {
    const pe = e as PointerEvent;
    pe.preventDefault();
    drag = { type: 'start', startMin0: s.startMin, endMin0: s.startMin + totalMin(), pointerAng0: pointerAngle(pe) };
    window.addEventListener('pointermove', onDrag);
    window.addEventListener('pointerup', endDrag);
  }

  function scaleMinutesTo(newTotal: number) {
    const old = totalMin();
    let newMins: number[];
    if (old <= 0) {
      const each = Math.max(2, Math.round(newTotal / s.blocks.length));
      newMins = s.blocks.map(() => each);
    } else {
      const factor = newTotal / old;
      newMins = s.blocks.map(b => Math.max(2, b.minutes * factor));
    }
    newMins = newMins.map(m => Math.round(m));
    const drift = newTotal - newMins.reduce((a,b)=>a+b, 0);
    newMins[newMins.length-1] = Math.max(2, newMins[newMins.length-1] + drift);
    s.blocks.forEach((b, i) => { b.minutes = newMins[i]; });
  }

  function onDrag(e: PointerEvent) {
    if (!drag) return;
    const ang = pointerAngle(e);
    const sa = startAngle();
    let rel = ang - sa;
    while (rel < 0) rel += 360;

    if (drag.type === 'end') {
      let newTotal = (rel / 360) * s.clockSpan;
      const minTotal = s.blocks.length * 2;
      if (newTotal < minTotal) newTotal = minTotal;
      if (newTotal > s.clockSpan) newTotal = s.clockSpan;
      scaleMinutesTo(Math.round(newTotal));
      renderEndControl(); renderClock(); return;
    }
    if (drag.type === 'start') {
      let delta = ang - drag.pointerAng0;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      const minDelta = (delta / 360) * s.clockSpan;
      let newStart = Math.round(drag.startMin0 + minDelta);
      let newTotal = drag.endMin0 - newStart;
      const minTotal = s.blocks.length * 2;
      if (newTotal < minTotal) { newTotal = minTotal; newStart = drag.endMin0 - newTotal; }
      if (newTotal > s.clockSpan) { newTotal = s.clockSpan; newStart = drag.endMin0 - newTotal; }
      s.startMin = newStart;
      scaleMinutesTo(newTotal);
      if (startTimeInput) startTimeInput.value = fmtHM(s.startMin);
      renderEndControl(); renderClock(); return;
    }
    const targetCumMin = (rel / 360) * s.clockSpan;
    let cumBefore = 0;
    for (let k = 0; k < drag.i; k++) cumBefore += s.blocks[k].minutes;
    let newLeft = targetCumMin - cumBefore;
    const pair = drag.leftMin + drag.rightMin;
    newLeft = Math.max(2, Math.min(pair - 2, newLeft));
    s.blocks[drag.i].minutes = Math.round(newLeft);
    s.blocks[drag.i + 1].minutes = pair - Math.round(newLeft);
    renderEndControl(); renderClock();
  }

  function endDrag() {
    drag = null;
    window.removeEventListener('pointermove', onDrag);
    window.removeEventListener('pointerup', endDrag);
    appState.persist();
  }

  // ── End control ──
  function renderEndControl() {
    if (!endControlEl) return;
    endControlEl.innerHTML = '';
    const style = 'background:var(--menu-surface);color:var(--menu-fg);border:1px solid var(--menu-border);border-radius:8px;padding:8px 10px;font-size:14px;width:100%;font-family:inherit;';
    if (endMode === 'end') {
      const inp = document.createElement('input');
      inp.type = 'time'; inp.value = fmtHM(s.startMin + totalMin()); inp.style.cssText = style;
      inp.addEventListener('input', () => {
        const [h, m] = inp.value.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return;
        let end = h * 60 + m;
        if (end <= s.startMin) end += 24 * 60;
        const diff = end - s.startMin;
        if (diff < s.blocks.length * 2) return;
        scaleMinutesTo(diff);
        renderClock(); updateTimeFeedback();
      });
      endControlEl.appendChild(inp);
    } else {
      const inp = document.createElement('input');
      inp.type = 'number'; inp.min = String(s.blocks.length * 2); inp.value = String(totalMin()); inp.style.cssText = style;
      inp.addEventListener('input', () => {
        const v = Number(inp.value);
        if (!v || v < s.blocks.length * 2) return;
        scaleMinutesTo(v);
        renderClock(); updateTimeFeedback();
      });
      endControlEl.appendChild(inp);
    }
  }

  function updateTimeFeedback() {
    const t = totalMin();
    if (timeFeedback) timeFeedback.textContent = `${t} min → slutar ${fmtHM(s.startMin + t)}`;
    if (partsFeedback) partsFeedback.textContent = s.blocks.length + (s.blocks.length === 1 ? ' del' : ' delar');
  }

  // ── Audio & flash ──
  let audioCtx: AudioContext | null = null;
  const warnedSet = new Set<string>();

  function beep(offset = 0) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const t0 = audioCtx.currentTime + offset;
      const dur = 1.4;
      const freqs = [1568, 3136];
      const gains = [0.18, 0.06];
      freqs.forEach((f, i) => {
        const o = audioCtx!.createOscillator();
        const g = audioCtx!.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(gains[i], t0 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(audioCtx!.destination);
        o.start(t0); o.stop(t0 + dur + 0.05);
      });
    } catch { /* ignore */ }
  }

  function doFlash() {
    if (!flashEl) return;
    flashEl.classList.add('on');
    setTimeout(() => flashEl.classList.remove('on'), 400);
  }

  function checkWarnings() {
    const elapsed = elapsedMin();
    let cum = 0;
    s.blocks.forEach((b, i) => {
      const segEnd = cum + b.minutes;
      if (b.warning) {
        const warnAt = segEnd - 2;
        const keyWarn = `w-${i}-${s.startMin}-${segEnd}`;
        const keyEnd = `e-${i}-${s.startMin}-${segEnd}`;
        if (elapsed >= warnAt && elapsed < warnAt + 1/60 && !warnedSet.has(keyWarn)) {
          warnedSet.add(keyWarn); beep(); doFlash();
        }
        if (elapsed >= segEnd && elapsed < segEnd + 1/60 && !warnedSet.has(keyEnd)) {
          warnedSet.add(keyEnd); beep(); beep(0.45); doFlash();
        }
      }
      cum = segEnd;
    });
  }

  function tick() {
    const now = new Date();
    nowMinLive = nowMinutes();
    nowText = pad(now.getHours()) + ':' + pad(now.getMinutes());
    const tot = totalMin();
    const nowMin = nowMinutes();
    if (nowMin < s.startMin) {
      leftText = fmtTillStart(s.startMin - nowMin);
    } else {
      leftText = fmtLeft((s.startMin + tot) - nowMin);
    }
    checkAutoLoad();
    renderClock();
    checkWarnings();
  }

  function handlePartsInput() {
    if (!partsArea) return;
    const result = parseParts(partsArea.value, s.blocks);
    s.blocks = result.blocks;
    if (result.dayTitle) s.dayTitle = result.dayTitle;
    if (result.extraInfo) s.extraInfo = result.extraInfo;
    updateTimeFeedback();
    renderEndControl();
    appState.persist();
  }

  function saveFlow() {
    const title = s.dayTitle.trim() || 'Utan rubrik';
    if (!s.flows) s.flows = [];
    const existing = s.flows.find(f => f.title === title);
    const data = {
      id: existing ? existing.id : 'f-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      title,
      parts: s.blocks.map(b => b.title),
      minutes: s.blocks.map(b => b.minutes),
      warnings: s.blocks.map(b => b.warning),
      notes: s.blocks.map(b => b.note),
      extraInfo: s.extraInfo || '',
    };
    if (existing) { Object.assign(existing, data); }
    else { s.flows.push(data); }
    flowsOpen = true;
    appState.persist();
  }

  function loadFlow(id: string) {
    const f = s.flows.find(x => x.id === id);
    if (!f) return;
    s.dayTitle = f.title;
    s.blocks = f.parts.map((title, i) => ({
      id: Math.random().toString(36).slice(2, 9),
      title, minutes: f.minutes[i] ?? 45,
      note: f.notes?.[i] ?? '', warning: f.warnings?.[i] ?? false, pinned: true,
    }));
    s.extraInfo = f.extraInfo || '';
    warnedSet.clear();
    if (titleInput) titleInput.value = s.dayTitle;
    if (partsArea) partsArea.value = serializeBlocks(s.blocks);
    updateTimeFeedback(); renderEndControl(); appState.persist();
  }

  function deleteFlow(id: string) {
    if (!confirm(`Radera flödet?`)) return;
    s.flows = s.flows.filter(f => f.id !== id);
    appState.persist();
  }

  const SYNC_KEY_STORAGE = 'timer-sync-key';
  let syncStatusTimer: ReturnType<typeof setTimeout>;

  function showSyncStatus(msg: string, isError = false) {
    syncStatusText = msg; syncStatusError = isError;
    clearTimeout(syncStatusTimer);
    syncStatusTimer = setTimeout(() => { syncStatusText = ''; }, 3000);
  }

  async function syncLoad() {
    const key = s.syncKey || '';
    if (!key) { showSyncStatus('Inte inloggad', true); return; }
    try {
      const res = await fetch('/api/sync?key=' + encodeURIComponent(key));
      if (!res.ok) throw new Error();
      const data = await res.json();
      s.flows = data.flows || []; appState.persist(); showSyncStatus('Flöden laddade ✓');
    } catch { showSyncStatus('Kunde inte ladda', true); }
  }

  async function syncSave() {
    const key = s.syncKey || '';
    if (!key) { showSyncStatus('Inte inloggad', true); return; }
    try {
      const res = await fetch('/api/sync?key=' + encodeURIComponent(key), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flows: s.flows || [] }),
      });
      if (!res.ok) throw new Error();
      showSyncStatus('Sparat till moln ✓');
    } catch { showSyncStatus('Kunde inte spara', true); }
  }

  function login() {
    const name = loginNameInput?.value.trim() ?? '';
    const pass = loginPassInput?.value.trim() ?? '';
    if (!name || !pass) { showSyncStatus('Ange namn och lösenord', true); return; }
    s.syncKey = name + ':' + pass;
    loggedInUser = name;
    localStorage.setItem(SYNC_KEY_STORAGE, s.syncKey);
    localStorage.setItem('timer-login-user', name);
    appState.persist();
    syncLoad();
  }

  function logout() {
    loggedInUser = '';
    s.syncKey = '';
    localStorage.removeItem(SYNC_KEY_STORAGE);
    localStorage.removeItem('timer-login-user');
    appState.persist();
  }

  function saveAgenda() {
    appState.persist();
    savedAgendaMsg = 'Sparat ✓';
    setTimeout(() => { savedAgendaMsg = ''; }, 2000);
  }

  function aiPayload(extra: Record<string, unknown>) {
    return {
      provider: aiConfig.provider,
      apiKey: aiConfig.apiKey,
      planMode: aiConfig.planMode,
      ...(aiConfig.provider === 'custom' ? { baseUrl: aiConfig.baseUrl, customModel: aiConfig.customModel } : {}),
      ...extra
    };
  }

  async function runAiParts() {
    if (!aiInput.trim()) return;
    aiLoading = true; aiError = '';
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiPayload({ message: aiInput, mode: 'parts', context: { startMin: s.startMin } }))
      });
      const data = await res.json();
      if (data.error) { aiError = data.error; return; }
      if (partsArea) {
        partsArea.value = data.text;
        partsArea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      aiPanelOpen = false;
      aiInput = '';
    } catch { aiError = 'Nätverksfel'; }
    finally { aiLoading = false; }
  }

  async function runAiAgenda() {
    if (!agendaAiInput.trim()) return;
    agendaAiLoading = true; agendaAiError = '';
    try {
      const todayISO = new Date().toISOString().slice(0, 10);
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiPayload({ message: agendaAiInput, mode: 'agenda', context: { date: todayISO } }))
      });
      const data = await res.json();
      if (data.error) { agendaAiError = data.error; return; }
      s.agendaText = data.text;
      appState.persist();
      agendaAiOpen = false;
      agendaAiInput = '';
    } catch { agendaAiError = 'Nätverksfel'; }
    finally { agendaAiLoading = false; }
  }

  function setFlowMinutes(flow: Flow, newTotal: number): Flow {
    const oldTotal = flow.minutes.reduce((a, b) => a + b, 0);
    if (oldTotal === 0) return { ...flow, minutes: flow.minutes.map(() => Math.max(1, Math.round(newTotal / flow.minutes.length))) };
    const scaled = flow.minutes.map(m => Math.max(1, Math.round(m * newTotal / oldTotal)));
    const drift = newTotal - scaled.reduce((a, b) => a + b, 0);
    scaled[scaled.length - 1] = Math.max(1, scaled[scaled.length - 1] + drift);
    return { ...flow, minutes: scaled };
  }

  function startAgendaDrag(e: PointerEvent, i: number) {
    if (!agendaDays || !selectedDay || !timelineEl) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const dayIdx = agendaDays.indexOf(selectedDay);
    if (dayIdx < 0) return;
    agendaDragState = {
      i, dayIdx,
      startY: e.clientY,
      startMinA: agendaItems[i].totalMin,
      startMinB: agendaItems[i + 1]?.totalMin ?? 0,
      containerH: timelineEl.clientHeight,
    };
    window.addEventListener('pointermove', onAgendaDrag);
    window.addEventListener('pointerup', endAgendaDrag);
  }

  function onAgendaDrag(e: PointerEvent) {
    const d = agendaDragState;
    if (!d || !agendaDays) return;
    const deltaY = e.clientY - d.startY;
    if (Math.abs(deltaY) < 4) return;
    const deltaMin = Math.round(deltaY / d.containerH * 720);
    const total = d.startMinA + d.startMinB;
    const newA = Math.max(5, Math.min(total - 5, d.startMinA + deltaMin));
    const newB = total - newA;
    const newDays = agendaDays.map((day, di) => {
      if (di !== d.dayIdx) return day;
      return {
        ...day,
        flows: day.flows.map((flow, fi) => {
          if (fi === d.i) return setFlowMinutes(flow, newA);
          if (fi === d.i + 1) return setFlowMinutes(flow, newB);
          return flow;
        }),
      };
    });
    s.agendaText = serializeAgenda(newDays);
  }

  function endAgendaDrag() {
    agendaDragState = null;
    window.removeEventListener('pointermove', onAgendaDrag);
    window.removeEventListener('pointerup', endAgendaDrag);
    appState.persist();
  }

  const AI_PROMPT_PARTS = `Du är en assistent som hjälper mig planera närmsta timmen eller mindre.
Jag beskriver vad jag ska göra, i valfri ordning och hur informellt som helst.

Returnera BARA en färdig lista i det här formatet — inget annat, inga förklaringar:

Vakna 5m

Toa 5m
- ta med telefonen

Medicin 2m

Frukost 15m
- kolla inte skärm

& Kom ihåg att det är möte kl 9.

Regler:
- Realistiska minutuppskattningar baserat på aktiviteten
- Rimlig ordning (t.ex. vakna → toa → medicin → frukost → promenad)
- Lägg till 2–3 aktiviteter om jag troligen glömt men som passar sammanhanget
- Namn på svenska, korta (max 3 ord)
- Underpunkter måste börja med ett streck: -
- Underpunkter har ingen tid
- Ny rad mellan varje aktivitet
- Kommentarer under listan börjar med & i början av raden
- Inga rubriker, ingen inledning, ingen avslutning — bara listan

---

[Klistra in dina aktiviteter här]`;

  const AI_PROMPT_AGENDA = `Du är en assistent som hjälper mig planera hela eller delar av en dag.
Jag beskriver vad jag ska göra — hur informellt som helst.

Returnera BARA en dagplan i exakt det här formatet — inget annat, inga förklaringar:

@260509
#Morgonrutin 07:00
Vakna 5m
Toa 5m
Frukost 20m
- kolla inte skärm

#Arbetspass 09:00
Planering 10m
Epost 20m
Djuparbete 60m
- stäng av notiser

& Glöm inte: möte kl 14

Format:
- @YYMMDD = datum (exempel: @260509 för 9 maj 2026)
- #Rubrik HH:MM = session med starttid (rubrik max 3 ord)
- Aktivitet Nm = aktivitet med tid
- - notering = underpunkt utan tid
- & kommentar = notering för hela dagen (sist i texten)
- Realistiska minutuppskattningar
- Lägg till pauser och övergångar om det behövs
- Namn på svenska, korta (max 3 ord per aktivitet)
- Inga förklaringar, ingen inledning — bara planen

---

[Beskriv din dag här]`;

  const currentAiPrompt = $derived(
    s.agendaOpen && s.clockSpan === 720 ? AI_PROMPT_AGENDA : AI_PROMPT_PARTS
  );

  function startSidebarResize(e: PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', onSidebarResize);
    window.addEventListener('pointerup', endSidebarResize);
  }
  function onSidebarResize(e: PointerEvent) {
    if (!sidebarEl) return;
    const newW = Math.max(160, Math.min(720, e.clientX - sidebarEl.getBoundingClientRect().left));
    sidebarEl.style.width = newW + 'px';
    document.documentElement.style.setProperty('--sb-w', newW + 'px');
  }
  function endSidebarResize() {
    window.removeEventListener('pointermove', onSidebarResize);
    window.removeEventListener('pointerup', endSidebarResize);
  }

  function startAgendaResize(e: PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', onAgendaResize);
    window.addEventListener('pointerup', endAgendaResize);
  }
  function onAgendaResize(e: PointerEvent) {
    if (!agendaEl) return;
    const newW = Math.max(160, Math.min(720, agendaEl.getBoundingClientRect().right - e.clientX));
    agendaEl.style.width = newW + 'px';
    document.documentElement.style.setProperty('--ag-w', newW + 'px');
  }
  function endAgendaResize() {
    window.removeEventListener('pointermove', onAgendaResize);
    window.removeEventListener('pointerup', endAgendaResize);
  }

  onMount(() => {
    if (!localStorage.getItem('day_timer_v1')) {
      const d = new Date();
      s.startMin = d.getHours() * 60;
    }
    syncBodyClasses();
    if (startTimeInput) startTimeInput.value = fmtHM(s.startMin);
    if (titleInput) titleInput.value = s.dayTitle || '';
    if (partsArea) partsArea.value = serializeBlocks(s.blocks);
    if (sidebarEl && window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        document.documentElement.style.setProperty('--sb-w', sidebarEl.offsetWidth + 'px');
      });
      ro.observe(sidebarEl);
      document.documentElement.style.setProperty('--sb-w', sidebarEl.offsetWidth + 'px');
    }
    if (agendaEl && window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        document.documentElement.style.setProperty('--ag-w', agendaEl.offsetWidth + 'px');
      });
      ro.observe(agendaEl);
      document.documentElement.style.setProperty('--ag-w', agendaEl.offsetWidth + 'px');
    }
    const savedKey = localStorage.getItem(SYNC_KEY_STORAGE);
    if (savedKey) s.syncKey = savedKey;
    const savedUser = localStorage.getItem('timer-login-user');
    if (savedUser) loggedInUser = savedUser;
    const savedAiConfig = localStorage.getItem('daytimer_ai_config');
    if (savedAiConfig) {
      try { aiConfig = { ...aiConfig, ...JSON.parse(savedAiConfig) }; } catch { /* ignore */ }
    } else {
      // migrate from old single-key format
      const oldKey = localStorage.getItem('daytimer_ai_key');
      if (oldKey) { aiConfig = { provider: 'anthropic', apiKey: oldKey, baseUrl: '', customModel: '' }; saveAiConfig(); }
    }
    renderEndControl();
    updateTimeFeedback();
    tick();
    const id = setInterval(tick, 1000);

    function handleOutsideClick(e: MouseEvent) {
      if (!(e.target as Element).closest('.toolbar')) popoverOpen = false;
    }
    document.addEventListener('click', handleOutsideClick);

    function handleKeydown(e: KeyboardEvent) {
      if (e.altKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault();
        if (confirm('Återställ timern? All sparad data raderas.')) appState.reset();
      }
    }
    window.addEventListener('keydown', handleKeydown);

    return () => {
      clearInterval(id);
      document.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  $effect(() => {
    const _ = s.palette + s.dark + s.sbCollapsed + s.agendaOpen + mobileTab;
    if (typeof document !== 'undefined') syncBodyClasses();
  });

  $effect(() => {
    const _ = JSON.stringify(s.blocks) + s.palette + s.dark + s.hollow + s.textOutside +
      s.showMin + s.showFive + s.showQuarter + s.showSegLabels + s.showCenterEnd + s.segMinutesMode + s.clockSpan +
      s.agendaText + s.agendaDate;
    agendaItems; // track agenda for 12h mode
    renderClock();
  });

  function toggleCollapse() {
    s.sbCollapsed = !s.sbCollapsed;
    appState.persist();
  }

  function toggleAgenda() {
    s.agendaOpen = !s.agendaOpen;
    appState.persist();
  }

  function cycleClockSpan() {
    s.clockSpan = s.clockSpan === 720 ? 60 : 720;
    appState.persist();
  }

  function checkAutoLoad() {
    if (!agendaItems.length) return;
    const nowMin = nowMinutes();
    const active = agendaItems.find(item =>
      nowMin >= item.startMin && nowMin < item.startMin + item.totalMin
    );
    if (!active) return;
    const key = `${active.startMin}-${active.flow.title}`;
    if (key === lastAutoLoadKey) return;
    lastAutoLoadKey = key;
    s.dayTitle = active.flow.title;
    s.blocks = active.flow.parts.map((title, i) => ({
      id: uid(),
      title,
      minutes: active.flow.minutes[i] ?? 45,
      note: active.flow.notes?.[i] ?? '',
      warning: active.flow.warnings?.[i] ?? false,
      pinned: (active.flow.minutes[i] ?? 0) > 0,
    }));
    s.extraInfo = active.flow.extraInfo || '';
    s.startMin = active.flow.startMin ?? active.startMin;
    warnedSet.clear();
    if (titleInput) titleInput.value = s.dayTitle;
    if (startTimeInput) startTimeInput.value = fmtHM(s.startMin);
    if (partsArea) partsArea.value = serializeBlocks(s.blocks);
    updateTimeFeedback();
    renderEndControl();
    appState.persist();
  }

  function loadAgendaFlow(flow: Flow, computedStart: number) {
    s.dayTitle = flow.title;
    s.blocks = flow.parts.map((title, i) => ({
      id: uid(),
      title,
      minutes: flow.minutes[i] ?? 45,
      note: flow.notes?.[i] ?? '',
      warning: flow.warnings?.[i] ?? false,
      pinned: flow.minutes[i] > 0,
    }));
    s.extraInfo = flow.extraInfo || '';
    s.startMin = flow.startMin ?? computedStart;
    s.clockSpan = 60;
    warnedSet.clear();
    if (titleInput) titleInput.value = s.dayTitle;
    if (startTimeInput) startTimeInput.value = fmtHM(s.startMin);
    if (partsArea) partsArea.value = serializeBlocks(s.blocks);
    updateTimeFeedback(); renderEndControl(); appState.persist();
    mobileTab = 'timer'; syncBodyClasses();
  }

  function goToTimerNow() {
    const now = nowMinutes();
    if (agendaDays) {
      const active = agendaItems.find(item => now >= item.startMin && now < item.startMin + item.totalMin);
      if (active) { loadAgendaFlow(active.flow, active.startMin); mobileTab = 'timer'; syncBodyClasses(); return; }
    }
    s.startMin = Math.floor(now / 60) * 60;
    appState.persist();
    mobileTab = 'timer'; syncBodyClasses();
  }
</script>

<div class="app">
  <aside class="sidebar" bind:this={sidebarEl}>
    <div class="seglist">
      {#each s.blocks as b, i (b.id)}
        {@const elapsed = elapsedMin()}
        {@const ct = clockTheme(s.palette, s.dark)}
        {@const cumMin = s.blocks.slice(0, i).reduce((a, x) => a + x.minutes, 0)}
        {@const segEnd = cumMin + b.minutes}
        {@const isActive = elapsed >= cumMin && elapsed < segEnd}
        {@const isPast = elapsed >= segEnd}
        <div class="row" class:active={isActive} class:past={isPast}>
          <span class="dot" style="background:{ct.colors[i % 8]}"></span>
          <span class="name">{b.title}</span>
          {#if s.segMinutesMode === 'planned'}
            <span class="min">{b.minutes}m</span>
          {:else if s.segMinutesMode === 'remaining'}
            <span class="min">{isPast ? 0 : isActive ? Math.max(0, Math.ceil(segEnd - elapsed)) : b.minutes}m kvar</span>
          {/if}
        </div>
        {#if b.note && s.showSegNotes}
          <div class="note">{b.note}</div>
        {/if}
      {/each}
      {#if s.extraInfo && s.showExtraInfo}
        <div class="infobox">{s.extraInfo}</div>
      {/if}
    </div>
  </aside>

  <div class="resize-handle-sb" onpointerdown={startSidebarResize}></div>
  <button class="collapse-btn" onclick={toggleCollapse} title="Dölj panel">
    {s.sbCollapsed ? '›' : '‹'}
  </button>

  <main class="main">
    <div class="main-header">
      {#if s.dayTitle}
        <div class="lesson-title">{s.dayTitle}</div>
      {/if}
      <div class="top-time">
        <div class="now">{nowText}</div>
        <div class="left" style="opacity:{s.showLeft ? 1 : 0}">{leftText}</div>
      </div>
    </div>

    <div class="clock-wrap">
      <svg class="clock" viewBox="0 0 360 360" style="overflow:visible" bind:this={svgEl}></svg>
    </div>

    <div class="toolbar">
      <button class="icon" onclick={(e) => { e.stopPropagation(); popoverOpen = !popoverOpen; }} title="Visningsalternativ">⚙︎</button>
      <button class="icon" onclick={() => { s.showControls = !s.showControls; appState.persist(); }} title="Inställningar">⚒︎</button>
      <div class="toolbar-spacer"></div>
      <button class="icon clock-span-btn" class:active={s.clockSpan === 720} onclick={cycleClockSpan} title="Klockvy">{s.clockSpan === 720 ? '12h' : ''}</button>
      <div class="toolbar-spacer"></div>
      <button class="icon" onclick={() => helpOpen = true} title="Hjälp">ⓘ</button>
      <div class="warn-dots">
        {#each s.blocks as b, i (b.id)}
          {@const ct = clockTheme(s.palette, s.dark)}
          <button class="wd" class:on={b.warning} style="color:{ct.colors[i % 8]}"
            title={`2-min varning för "${b.title}"`}
            onclick={() => { b.warning = !b.warning; appState.persist(); }}
          ></button>
        {/each}
      </div>
      {#if loggedInUser}
        <span style="font-size:11px;opacity:.55;padding:0 4px;font-weight:500;border-left:1px solid var(--border);">👤 {loggedInUser}</span>
      {/if}
      <div class="popover" class:open={popoverOpen}>
        <button class="pill" class:on={s.clockSpan === 120} onclick={() => { s.clockSpan = s.clockSpan === 120 ? 60 : 120; appState.persist(); }}>2h-vy <span>•</span></button>
        <button class="pill" class:on={s.clockSpan === 720} onclick={() => { s.clockSpan = s.clockSpan === 720 ? 60 : 720; appState.persist(); }}>12h-vy <span>•</span></button>
        <button class="pill" class:on={s.showLeft} onclick={() => { s.showLeft = !s.showLeft; appState.persist(); }}>Tid kvar <span>•</span></button>
        <button class="pill" class:on={s.showCenterEnd} onclick={() => { s.showCenterEnd = !s.showCenterEnd; appState.persist(); }}>Sluttid i mitten <span>•</span></button>
        <button class="pill" class:on={s.hollow} onclick={() => { s.hollow = !s.hollow; appState.persist(); }}>Ihålig mitt <span>•</span></button>
        <button class="pill" class:on={s.textOutside} onclick={() => { s.textOutside = !s.textOutside; appState.persist(); }}>Text utanför <span>•</span></button>
        <button class="pill" class:on={s.showQuarter} onclick={() => { s.showQuarter = !s.showQuarter; appState.persist(); }}>Kvartmarkeringar <span>•</span></button>
        <button class="pill" class:on={s.showFive} onclick={() => { s.showFive = !s.showFive; appState.persist(); }}>5-minutersmarkeringar <span>•</span></button>
        <button class="pill" class:on={s.showMin} onclick={() => { s.showMin = !s.showMin; appState.persist(); }}>Minutmarkeringar <span>•</span></button>
        <button class="pill" class:on={s.segMinutesMode !== 'off'} onclick={() => {
          const order: ('off'|'planned'|'remaining')[] = ['off','planned','remaining'];
          s.segMinutesMode = order[(order.indexOf(s.segMinutesMode) + 1) % order.length];
          appState.persist();
        }}>{{ off:'Minuter: av', planned:'Minuter: planerade', remaining:'Minuter: kvar' }[s.segMinutesMode]}</button>
        <button class="pill" class:on={s.showSegNotes} onclick={() => { s.showSegNotes = !s.showSegNotes; appState.persist(); }}>Underrubriker i sidopanel <span>•</span></button>
        <button class="pill" class:on={s.showExtraInfo} onclick={() => { s.showExtraInfo = !s.showExtraInfo; appState.persist(); }}>Info-ruta i sidopanel <span>•</span></button>
        <button class="pill" class:on={s.showSegLabels} onclick={() => { s.showSegLabels = !s.showSegLabels; appState.persist(); }}>Visa rubriker <span>•</span></button>
      </div>
    </div>

    {#if s.showControls}
      <div class="controls">
        <div>
          <label>Huvudrubrik</label>
          <input type="text" bind:this={titleInput} placeholder="Matematik"
            oninput={(e) => { s.dayTitle = (e.target as HTMLInputElement).value; appState.persist(); }} />
        </div>
        <button id="quickStartBtn" class="quickstart" onclick={() => {
          const d = new Date();
          s.startMin = d.getHours() * 60 + d.getMinutes();
          if (startTimeInput) startTimeInput.value = fmtHM(s.startMin);
          warnedSet.clear(); renderEndControl(); updateTimeFeedback(); appState.persist();
        }}><span class="ico">⚡︎</span> Snabbstart nu</button>
        <div>
          <label style="display:flex;align-items:center;gap:8px;">
            Lektionsdelar (en per rad)
            <button onclick={() => {
              navigator.clipboard.writeText(currentAiPrompt).then(() => {
                copyBtnText = '✓ Kopierad';
                setTimeout(() => { copyBtnText = 'AI-prompt'; }, 1500);
              });
            }} style="font-size:11px;padding:1px 7px;border-radius:5px;border:1px solid var(--border);background:var(--pill);color:var(--menu-muted);cursor:pointer;line-height:1.6;">{copyBtnText}</button>
          </label>
          <textarea bind:this={partsArea} placeholder="Genomgång&#10;Eget arbete&#10;Avslut" oninput={handlePartsInput}></textarea>
          <div class="feedback" bind:this={partsFeedback}>1 del</div>
          <div class="feedback" style="opacity:.65;margin-top:4px;">#Rubrik &nbsp;·&nbsp; Aktivitet 10m &nbsp;·&nbsp; - notering &nbsp;·&nbsp; &amp;kommentar</div>
          {#if aiApiKey}
            <div class="ai-panel">
              <button class="ai-panel-toggle" onclick={() => aiPanelOpen = !aiPanelOpen}>
                {aiPanelOpen ? '▲' : '▼'} Planera med AI
              </button>
              {#if aiPanelOpen}
                <textarea class="ai-input" placeholder="Beskriv vad du vill planera... t.ex. &quot;45-minuterslektion om bråk för åk 5&quot;" bind:value={aiInput}></textarea>
                <div class="ai-mode-row">
                  <button class="ai-mode-btn" class:on={aiConfig.planMode === 'strict'}
                    onclick={() => { aiConfig.planMode = 'strict'; saveAiConfig(); }}>Strikt</button>
                  <button class="ai-mode-btn" class:on={aiConfig.planMode === 'helpful'}
                    onclick={() => { aiConfig.planMode = 'helpful'; saveAiConfig(); }}>Hjälpsam</button>
                  <span class="ai-mode-hint">
                    {aiConfig.planMode === 'strict' ? 'Bara det du skriver, inga tillägg' : 'Lägger till marginaler, ställtid och pauser'}
                  </span>
                </div>
                {#if aiError}<div class="ai-error">{aiError}</div>{/if}
                <button class="quickstart ai-generate-btn" onclick={runAiParts} disabled={aiLoading || !aiInput.trim()}>
                  {aiLoading ? 'Tänker...' : 'Generera ▶'}
                </button>
              {/if}
            </div>
          {/if}
        </div>
        <div>
          <label>Info-ruta (fri text, visas som egen ruta i sidopanelen)</label>
          <textarea placeholder="T.ex. Att ta med: bok, penna&#10;Läxa: sida 42"
            oninput={(e) => { s.extraInfo = (e.target as HTMLTextAreaElement).value; appState.persist(); }}>{s.extraInfo}</textarea>
        </div>
        <div class="row2">
          <div>
            <label>Starttid</label>
            <input type="time" bind:this={startTimeInput} oninput={(e) => {
              const [h, m] = (e.target as HTMLInputElement).value.split(':').map(Number);
              if (isNaN(h) || isNaN(m)) return;
              s.startMin = h * 60 + m; warnedSet.clear();
              renderEndControl(); updateTimeFeedback(); appState.persist();
            }} />
          </div>
          <div>
            <label>{endMode === 'end' ? 'Sluttid' : 'Längd (min)'}</label>
            <div bind:this={endControlEl}></div>
          </div>
        </div>
        <div class="mode-toggle">
          <button class:on={endMode === 'end'} onclick={() => { endMode = 'end'; s.endMode = 'end'; renderEndControl(); appState.persist(); }}>Sluttid</button>
          <button class:on={endMode === 'len'} onclick={() => { endMode = 'len'; s.endMode = 'len'; renderEndControl(); appState.persist(); }}>Längd</button>
        </div>
        <div class="feedback" bind:this={timeFeedback}></div>

        <div class="flows">
          <button class="quickstart" onclick={saveFlow}><span class="ico">💾︎</span> Spara flöde</button>
          {#if s.flows.length > 0}
            <button class="flows-toggle" onclick={() => flowsOpen = !flowsOpen}>
              Sparade flöden {flowsOpen ? '▾' : '▸'}
            </button>
            {#if flowsOpen}
              <div class="flow-list">
                {#each s.flows as f (f.id)}
                  <div class="flow-item">
                    <button class="flow-name" onclick={() => loadFlow(f.id)}>{f.title || '(utan rubrik)'}</button>
                    <button class="flow-del" onclick={() => deleteFlow(f.id)}><span class="ico">🗑︎</span></button>
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
        </div>

        <div class="login-form">
          {#if loggedInUser}
            <div class="logged-in-row">
              <span class="username">👤 {loggedInUser}</span>
              <button class="logout-btn" onclick={logout}>Logga ut</button>
            </div>
            <div class="sync-row">
              <button class="quickstart sync-btn" onclick={syncLoad}>☁ Ladda</button>
              <button class="quickstart sync-btn" onclick={syncSave}>☁ Spara</button>
            </div>
          {:else}
            <label>Synkronisering</label>
            <input type="text" class="sync-input" bind:this={loginNameInput}
              placeholder="Namn" autocomplete="username" spellcheck="false" />
            <input type="password" class="sync-input" bind:this={loginPassInput}
              placeholder="Lösenord" autocomplete="current-password" />
            <button class="quickstart" onclick={login}>Logga in & synka</button>
          {/if}
          <div class="sync-status" style="color:{syncStatusError ? '#c0392b' : 'var(--muted)'}">{syncStatusText}</div>
        </div>

        <div class="ai-key-section">
          <label>AI-planering</label>
          <select class="sync-input ai-provider-select"
            value={aiConfig.provider}
            onchange={(e) => { aiConfig.provider = (e.target as HTMLSelectElement).value as AiProvider; aiKeyVisible = false; saveAiConfig(); }}>
            {#each Object.entries(AI_PROVIDER_LABELS) as [val, label]}
              <option value={val}>{label}</option>
            {/each}
          </select>
          {#if aiApiKey}
            <div class="ai-key-row">
              <span class="ai-key-masked">🔑 {aiApiKey.slice(0, 8)}···{aiApiKey.slice(-4)}</span>
              <button class="ai-key-btn" onclick={() => aiKeyVisible = !aiKeyVisible}>{aiKeyVisible ? 'Dölj' : 'Ändra'}</button>
              <button class="ai-key-btn" onclick={clearAiConfig}>✕</button>
            </div>
            {#if aiKeyVisible}
              <input type="password" class="sync-input" placeholder={AI_KEY_PLACEHOLDERS[aiConfig.provider]}
                value={aiConfig.apiKey}
                onchange={(e) => { aiConfig.apiKey = (e.target as HTMLInputElement).value.trim(); saveAiConfig(); }} />
            {/if}
          {:else}
            <input type="password" class="sync-input" placeholder={AI_KEY_PLACEHOLDERS[aiConfig.provider]}
              onchange={(e) => { aiConfig.apiKey = (e.target as HTMLInputElement).value.trim(); saveAiConfig(); }} />
            <div class="sync-status" style="color:var(--muted)">Klistra in din API-nyckel för att aktivera AI-planering</div>
          {/if}
          {#if aiConfig.provider === 'custom'}
            <input type="text" class="sync-input" placeholder="Bas-URL, t.ex. https://api.mistral.ai/v1"
              value={aiConfig.baseUrl}
              onchange={(e) => { aiConfig.baseUrl = (e.target as HTMLInputElement).value.trim(); saveAiConfig(); }} />
            <input type="text" class="sync-input" placeholder="Modell, t.ex. mistral-small-latest"
              value={aiConfig.customModel}
              onchange={(e) => { aiConfig.customModel = (e.target as HTMLInputElement).value.trim(); saveAiConfig(); }} />
          {/if}
        </div>
      </div>
    {/if}
  </main>

  <div class="resize-handle-ag" onpointerdown={startAgendaResize}></div>
  <aside class="agenda" bind:this={agendaEl}>
    <div class="agenda-input-header">
      <span class="agenda-input-label">Dagplan</span>
      <button class="agenda-input-toggle" onclick={() => agendaInputOpen = !agendaInputOpen}>
        {agendaInputOpen ? '△ Dölj' : '▽ Redigera'}
      </button>
    </div>
    {#if agendaInputOpen}
      <textarea
        class="agenda-input"
        placeholder="@260508&#10;#Morgonrutin 08:00&#10;Vakna 5m&#10;Frukost 20m&#10;Promenad&#10;- ta med vatten&#10;&amp; Möte kl 9&#10;&#10;@260509&#10;#Arbete 09:00&#10;..."
        value={s.agendaText}
        oninput={(e) => { s.agendaText = (e.target as HTMLTextAreaElement).value; appState.persist(); }}
      ></textarea>
      <div class="agenda-save-row">
        <button class="agenda-save-btn" onclick={saveAgenda}>
          {savedAgendaMsg || '💾 Spara dagplan'}
        </button>
        {#if aiApiKey}
          <button class="agenda-save-btn agenda-ai-btn" onclick={() => agendaAiOpen = !agendaAiOpen}>
            ✨ AI-dagplan
          </button>
        {/if}
      </div>
      {#if agendaAiOpen && aiApiKey}
        <div class="agenda-ai-panel">
          <textarea class="ai-input" placeholder="Beskriv din dag... t.ex. &quot;Jobbar hemifrån, möte kl 10 och 14, träning på lunch&quot;" bind:value={agendaAiInput}></textarea>
          <div class="ai-mode-row">
            <button class="ai-mode-btn" class:on={aiConfig.planMode === 'strict'}
              onclick={() => { aiConfig.planMode = 'strict'; saveAiConfig(); }}>Strikt</button>
            <button class="ai-mode-btn" class:on={aiConfig.planMode === 'helpful'}
              onclick={() => { aiConfig.planMode = 'helpful'; saveAiConfig(); }}>Hjälpsam</button>
            <span class="ai-mode-hint">
              {aiConfig.planMode === 'strict' ? 'Bara det du skriver, inga tillägg' : 'Lägger till marginaler, ställtid och pauser'}
            </span>
          </div>
          {#if agendaAiError}<div class="ai-error">{agendaAiError}</div>{/if}
          <button class="quickstart ai-generate-btn" onclick={runAiAgenda} disabled={agendaAiLoading || !agendaAiInput.trim()}>
            {agendaAiLoading ? 'Tänker...' : 'Generera dagplan ▶'}
          </button>
        </div>
      {/if}
    {/if}

    {#if agendaDays && agendaDays.length > 0}
      <div class="agenda-nav">
        <button class="agenda-nav-btn" onclick={prevDay} disabled={selectedDayIdx <= 0}>‹</button>
        <span class="agenda-date-label">{fmtAgendaDate(selectedDay?.date ?? null)}</span>
        <button class="agenda-nav-btn" onclick={nextDay} disabled={selectedDayIdx >= (agendaDays.length - 1)}>›</button>
      </div>
    {/if}

    {#if agendaItems.length === 0}
      <p class="agenda-empty">Skriv in dagplanen ovan, eller spara flöden via ⚒︎-panelen.</p>
    {:else}
      {@const windowStart = Math.floor(agendaItems[0].startMin / 60) * 60}
      <div class="agenda-timeline" bind:this={timelineEl}>
        {#each agendaItems as item, ai (item.startMin + item.flow.title)}
          {@const itemColor = sectorColors[ai % sectorColors.length]}
          {@const isPast = nowMinLive >= item.startMin + item.totalMin}
          {@const isActive = nowMinLive >= item.startMin && nowMinLive < item.startMin + item.totalMin}
          {@const topPct = ((item.startMin - windowStart) / 720 * 100).toFixed(3)}
          {@const heightPct = (item.totalMin / 720 * 100).toFixed(3)}
          <div class="agenda-block"
               class:past={isPast}
               class:active={isActive}
               style="top: {topPct}%; height: {heightPct}%; border-left-color: {itemColor}"
               onclick={() => item.fromText ? loadAgendaFlow(item.flow, item.startMin) : loadFlow(item.flow.id)}>
            <span class="agenda-time">{fmtHM(item.startMin)}</span>
            <span class="agenda-name">{item.flow.title || '(utan rubrik)'}</span>
            <span class="agenda-dur">{item.totalMin}m</span>
          </div>
          {#if ai < agendaItems.length - 1 && item.fromText}
            {@const next = agendaItems[ai + 1]}
            {#if next.startMin === item.startMin + item.totalMin}
              <div class="agenda-drag-edge"
                   class:dragging={agendaDragState?.i === ai}
                   style="top: {((item.startMin + item.totalMin - windowStart) / 720 * 100).toFixed(3)}%"
                   onpointerdown={(e) => startAgendaDrag(e, ai)}></div>
            {/if}
          {/if}
        {/each}
      </div>
    {/if}
  </aside>

  <button class="agenda-toggle-btn" onclick={toggleAgenda} title="Dagagenda">
    {s.agendaOpen ? '›' : '‹'}
  </button>

  <nav class="mobile-tabs">
    <button class:active={mobileTab === 'delar'} onclick={() => { mobileTab = 'delar'; syncBodyClasses(); }}>
      <span>☰</span> Delar
    </button>
    <button class:active={mobileTab === 'timer'} onclick={goToTimerNow}>
      <span>◷</span> Timer
    </button>
    <button class:active={mobileTab === 'plan'} onclick={() => { mobileTab = 'plan'; syncBodyClasses(); }}>
      <span>▦</span> Plan
    </button>
  </nav>
</div>

<div class="theme-dots" class:open={themePickerOpen}
  use:clickOutside={() => { themePickerOpen = false; }}>
  <button class="theme-trigger"
    style="background:{PALETTE_COLORS[s.palette]}"
    onclick={() => themePickerOpen = !themePickerOpen}
    title="Välj tema"></button>
  <div class="theme-panel">
    {#each PALETTES as p}
      <button class="theme-dot" class:active={s.palette === p}
        style="background:{PALETTE_COLORS[p]}" title={p}
        onclick={() => { s.palette = p; syncBodyClasses(); appState.persist(); themePickerOpen = false; }}
      ></button>
    {/each}
    <button id="darkToggle" class:active={s.dark} title="Dag/Natt"
      onclick={() => { if (s.palette !== 'psychedelic') { s.dark = !s.dark; syncBodyClasses(); appState.persist(); } }}
    >{s.dark ? '☾' : '☀'}</button>
  </div>
</div>

<div class="flash" bind:this={flashEl}></div>

<div class="help-modal" class:open={helpOpen}
  onclick={(e) => { if ((e.target as Element).classList.contains('help-modal')) helpOpen = false; }}>
  <div class="help-card">
    <button class="help-close" onclick={() => helpOpen = false} title="Stäng">×</button>
    <h2>Så här använder du Day Timer</h2>

    <h3>Grunderna</h3>
    <ul>
      <li><b>Skapa ett schema</b> via <span class="ico">⚒︎</span> — skriv aktiviteter i textfältet, en per rad.</li>
      <li><b>Dra för att ändra tid</b> — håll på gränsen mellan två sektorer och dra.</li>
      <li><b>Snabbstart</b> ⚡︎ ställer in starttid till just nu.</li>
      <li><b>Allt sparas automatiskt</b> i webbläsaren (ingen inloggning krävs).</li>
    </ul>

    <h3>Inmatningsformat</h3>
    <ul>
      <li><code>#Rubrik</code> — sätter dag­titeln (visas i klockan och sidopanelen)</li>
      <li><code>Frukost 20m</code> — aktivitet med fast tid (pinnad)</li>
      <li><code>Promenad</code> — aktivitet utan tid (fördelas automatiskt)</li>
      <li><code>- ta med vatten</code> — undernotering på föregående aktivitet</li>
      <li><code>&amp;Kom ihåg möte kl 9</code> — kommentar som visas som egen ruta</li>
    </ul>

    <h3>Klockvyer</h3>
    <ul>
      <li><b>1h-vy</b> (standard) — visar kommande timme, minutvisare.</li>
      <li><b>2h-vy</b> — slå på i <span class="ico">⚙︎</span>. Visar två timmar.</li>
      <li><b>12h-vy</b> — slå på i <span class="ico">⚙︎</span>. Visar hela dagen med timvisare. Kombinera med Dagplan.</li>
    </ul>

    <h3>Dagplan (agenda)</h3>
    <ul>
      <li>Öppna agendapanelen med <b>▷</b>-knappen till höger om klockan.</li>
      <li>Skriv in planen med <code>@YYMMDD</code> för datum, <code>#Rubrik HH:MM</code> för session.</li>
      <li>Klicka på ett block i tidslinjen för att ladda den sessionen i klockan.</li>
      <li>Bläddra mellan dagar med <b>‹ ›</b>-pilarna.</li>
    </ul>

    <h3>AI-planering</h3>
    <ul>
      <li>Öppna <span class="ico">⚒︎</span> och scrolla ner till <b>AI-planering</b>.</li>
      <li>Välj provider: <b>Claude</b>, <b>GPT</b>, <b>Gemini</b> eller <b>Anpassad</b> (valfri OpenAI-kompatibel, t.ex. Mistral, Groq).</li>
      <li>Klistra in din API-nyckel — sparas lokalt, skickas aldrig vidare.</li>
      <li>Klicka <b>▽ Planera med AI</b> under aktivitets­fältet → beskriv på fritt språk → schemat fylls i automatiskt.</li>
      <li>I agendapanelen: klicka <b>✨ AI-dagplan</b> för att generera ett fler­dagars schema.</li>
      <li><b>AI-prompt</b>-knappen bredvid aktivitetsfältet kopierar en prompt du kan klistra in i valfritt AI-verktyg manuellt.</li>
    </ul>

    <h3>Flöden &amp; synkronisering</h3>
    <ul>
      <li><b>Spara flöde</b> 💾 sparar det aktuella schemat lokalt som ett återanvändbart flöde.</li>
      <li><b>Logga in</b> med namn + lösenord för att synka flöden mellan enheter.</li>
      <li><b>☁ Ladda / ☁ Spara</b> hämtar resp. skickar upp dina flöden till molnet.</li>
    </ul>

    <h3>Utseende</h3>
    <ul>
      <li><b>Paletter</b> — färgpunkterna längst ner till höger byter tema.</li>
      <li><b>Mörkt läge</b> — ☽/☀-knappen bredvid paletterna.</li>
      <li><b>Toggle-pills</b> (<span class="ico">⚙︎</span>) styr vad som visas: tid kvar, etiketter, markeringar m.m.</li>
      <li><b>Mobilvy</b> — flikarna Timer / Delar / Plan längst ner på skärmen.</li>
    </ul>

    <p class="help-foot" style="margin-top:12px">Genväg: <code>Alt+Shift+R</code> återställer timern (all data raderas).</p>
    <p class="help-foot">Klockan följer faktisk klocktid — visaren är alltid rätt.</p>
    <p class="help-foot">Frågor? Mejla <a href="mailto:timer@ximon.se">timer@ximon.se</a></p>
  </div>
</div>

