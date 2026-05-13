<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { appState, uid, type AppSection, type Flow } from '$lib/state.svelte.js';
  import { PALETTES, PALETTE_COLORS, clockTheme, labelColorFor } from '$lib/theme.js';
  import { CX, CY, R, Ri, polar, arcPath, nowMinutes, fmtHM, truncate } from '$lib/clock.js';
  import { localDateISO } from '$lib/date.js';
  import { parseParts, serializeBlocks, parseAgenda, serializeAgenda, type AgendaDay } from '$lib/parse.js';
  import { createShareTokens, deriveSyncToken, validateSyncToken } from '$lib/security.js';

  const s = appState.value;
  const NS = 'http://www.w3.org/2000/svg';

  function clickOutside(node: HTMLElement, cb: () => void) {
    function handle(e: MouseEvent) {
      if (!node.contains(e.target as Node)) cb();
    }
    document.addEventListener('click', handle, true);
    return { destroy() { document.removeEventListener('click', handle, true); } };
  }

  function focusOnMount(node: HTMLInputElement) {
    node.focus();
    node.select();
    return {};
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
  let shareToken = $state('');
  let shareOwnerToken = $state('');
  let shareCopyText = $state('Kopiera länk');
  let isViewMode = $state(false);
  let viewToken = $state('');
  let agendaInputOpen = $state(true);
  let savedAgendaMsg = $state('');
  let savedFlowMsg = $state('');
  let copyAgendaPromptText = $state('AI-prompt');
  let agendaDragState = $state<{ i: number; dayIdx: number; startY: number; startMinA: number; blockStart: number; blockEnd: number; clampMin: number; clampMax: number; edge: 'top' | 'bottom'; containerH: number } | null>(null);
  let activeAgendaFlow = $state<{ dayIdx: number; flowIdx: number } | null>(null);
  type SessionSource =
    | { kind: 'unscheduled' }
    | { kind: 'template'; templateId: string; title: string }
    | { kind: 'agenda'; date: string | null; title: string; startMin: number };
  let sessionSource = $state<SessionSource>({ kind: 'unscheduled' });
  let agendaDragMoved = false;
  let editingBlockId = $state<string | null>(null);
  let editingBlockField = $state<'name' | 'min' | null>(null);
  let agendaEl = $state<HTMLElement>(null!);
  let timelineEl = $state<HTMLElement>(null!);
  let agendaDraft = $state('');
  let locked = $state(false);
  let titleDraftValue = $state('');
  let agendaDayStart = $state(s.startMin);


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
  const SECTION_LABELS: Record<AppSection, string> = {
    now: 'Nu',
    plan: 'Plan',
    library: 'Bibliotek',
    workspace: 'Arbetsyta'
  };

  function saveAiConfig() {
    localStorage.setItem('daytimer_ai_config', JSON.stringify(aiConfig));
    localStorage.removeItem('daytimer_ai_key'); // migrate away from old key
  }
  function clearAiConfig() {
    aiConfig = { provider: 'anthropic', apiKey: '', baseUrl: '', customModel: '', planMode: 'helpful' };
    localStorage.removeItem('daytimer_ai_config');
    localStorage.removeItem('daytimer_ai_key');
  }

  // derived shorthand used in templates
  const aiApiKey = $derived(aiConfig.apiKey);

  const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');
  const totalMin = () => s.blocks.reduce((a, b) => a + b.minutes, 0);

  const sectorColors = $derived(clockTheme(s.palette, s.dark).colors);

  function schoolPrimary() { return s.agendaView === 'school' || s.agendaView === 'school+private'; }
  function activeAgendaText(): string { return schoolPrimary() ? s.agendaText : s.agendaText2; }
  function activeAgendaDate(): string { return schoolPrimary() ? s.agendaDate : s.agendaDate2; }
  function setActiveAgendaText(v: string) { if (schoolPrimary()) s.agendaText = v; else s.agendaText2 = v; }
  function setActiveAgendaDate(v: string) { if (schoolPrimary()) s.agendaDate = v; else s.agendaDate2 = v; }
  function hasOverlay() { return s.agendaView === 'school+private' || s.agendaView === 'private+school'; }

  const agendaDays = $derived.by<AgendaDay[] | null>(() => {
    const stored = activeAgendaText();
    return stored.trim() ? parseAgenda(stored) : null;
  });

  const selectedDay = $derived.by<AgendaDay | null>(() => {
    if (!agendaDays?.length) return null;
    const date = activeAgendaDate();
    if (date) {
      const hit = agendaDays.find(d => d.date === date);
      if (hit) return hit;
    }
    const today = localDateISO();
    return agendaDays.find(d => d.date === today)
      ?? agendaDays.find(d => d.date === null)
      ?? agendaDays[0];
  });

  const overlayDays = $derived.by<AgendaDay[] | null>(() => {
    if (!hasOverlay()) return null;
    const otherText = schoolPrimary() ? s.agendaText2 : s.agendaText;
    return otherText.trim() ? parseAgenda(otherText) : null;
  });

  const selectedDayIdx = $derived.by(() =>
    agendaDays && selectedDay ? agendaDays.indexOf(selectedDay) : -1
  );

  const selectedAgendaDetails = $derived.by(() => {
    if (!activeAgendaFlow || !agendaDays) return null;
    const day = agendaDays[activeAgendaFlow.dayIdx];
    const flow = day?.flows[activeAgendaFlow.flowIdx];
    if (!day || !flow) return null;
    const computed = agendaItems.find(item => item.flow === flow);
    const startMin = flow.startMin ?? computed?.startMin ?? s.startMin;
    const totalMin = flow.minutes.reduce((sum, minutes) => sum + minutes, 0);
    return { day, flow, startMin, totalMin };
  });

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

  const overlayItems = $derived.by(() => {
    if (!overlayDays) return [];
    const activeDate = activeAgendaDate();
    const today = localDateISO();
    const target = activeDate || today;
    const day = overlayDays.find(d => d.date === target)
      ?? overlayDays.find(d => d.date === today)
      ?? overlayDays.find(d => d.date === null)
      ?? overlayDays[0]
      ?? null;
    if (!day) return [];
    let t = s.startMin;
    return day.flows.map(flow => {
      if (flow.startMin !== undefined) t = flow.startMin;
      const startMin = t;
      const totalMin = flow.minutes.reduce((a, b) => a + b, 0);
      t += totalMin;
      return { flow, startMin, totalMin };
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
    setActiveAgendaDate(agendaDays[selectedDayIdx - 1].date ?? '');
    appState.persist();
  }
  function nextDay() {
    if (!agendaDays || selectedDayIdx >= agendaDays.length - 1) return;
    setActiveAgendaDate(agendaDays[selectedDayIdx + 1].date ?? '');
    appState.persist();
  }

  function setActiveSection(section: AppSection) {
    s.activeSection = section;
    if (section === 'plan') s.agendaOpen = true;
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
  function sessionSourceText(): string {
    if (sessionSource.kind === 'agenda') {
      return `Från dagplan: ${sessionSource.title || 'Session'} ${fmtHM(sessionSource.startMin)}`;
    }
    if (sessionSource.kind === 'template') {
      return `Från mall: ${sessionSource.title || 'Utan rubrik'}`;
    }
    return 'Fristående session';
  }
  const elapsedMin = () => nowMinutes() - s.startMin;
  const startAngle = () => ((s.startMin % s.clockSpan) / s.clockSpan) * 360;

  function syncBodyClasses() {
    const PALETTE_CLASSES = ['sansad','meadow','mlp','bright','clear','psychedelic'];
    document.body.classList.remove(...PALETTE_CLASSES, 'dark', 'sb-collapsed', 'ag-open', 'm-timer', 'm-delar', 'm-plan', 'page-locked');
    if (s.palette) document.body.classList.add(s.palette);
    if (s.dark && s.palette !== 'psychedelic') document.body.classList.add('dark');
    if (s.sbCollapsed) document.body.classList.add('sb-collapsed');
    if (s.agendaOpen) document.body.classList.add('ag-open');
    document.body.classList.add('m-' + mobileTab);
    if (locked) document.body.classList.add('page-locked');
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
      const startHit = document.createElementNS(NS, 'line');
      startHit.setAttribute('x1', String(sx0)); startHit.setAttribute('y1', String(sy0));
      startHit.setAttribute('x2', String(sx1)); startHit.setAttribute('y2', String(sy1));
      startHit.setAttribute('stroke', 'transparent'); startHit.setAttribute('stroke-width', '36');
      startHit.setAttribute('pointer-events', 'stroke'); startHit.style.cursor = 'grab';
      startHit.addEventListener('pointerdown', startStartDrag);
      svgEl.appendChild(startHit);
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
      const nowInView = nowMin >= s.startMin && nowMin < s.startMin + s.clockSpan;
      const spike = document.createElementNS(NS, 'polygon');
      spike.setAttribute('points', `${tx},${ty} ${bx1},${by1} ${bx2},${by2}`);
      spike.setAttribute('fill', handDark); spike.setAttribute('stroke', handLight);
      spike.setAttribute('stroke-width', '1.5'); spike.setAttribute('stroke-linejoin', 'round');
      spike.setAttribute('opacity', nowInView ? '1' : '0.1');
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
    if (isViewMode) return;
    const pe = e as PointerEvent;
    pe.preventDefault();
    const i = (pe.target as any)._boundaryIdx as number;
    drag = { type: 'between', i, leftMin: s.blocks[i].minutes, rightMin: s.blocks[i+1].minutes };
    window.addEventListener('pointermove', onDrag);
    window.addEventListener('pointerup', endDrag);
  }
  function startEndDrag(e: Event) {
    if (isViewMode) return;
    (e as PointerEvent).preventDefault();
    drag = { type: 'end' };
    window.addEventListener('pointermove', onDrag);
    window.addEventListener('pointerup', endDrag);
  }
  function startStartDrag(e: Event) {
    if (isViewMode) return;
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

  function syncTimerToAgenda() {
    if (!activeAgendaFlow || !agendaDays) return;
    const { dayIdx, flowIdx } = activeAgendaFlow;
    if (!agendaDays[dayIdx]?.flows[flowIdx]) return;
    const newDays = agendaDays.map((d, di) => di !== dayIdx ? d : {
      ...d,
      flows: d.flows.map((f, fi) => fi !== flowIdx ? f : {
        ...f,
        title: s.dayTitle,
        startMin: s.startMin,
        minutes: s.blocks.map(b => b.minutes),
        parts: s.blocks.map(b => b.title),
        notes: s.blocks.map(b => b.note),
        warnings: s.blocks.map(b => b.warning),
        extraInfo: s.extraInfo,
      }),
    });
    setActiveAgendaText(serializeAgenda(newDays));
  }

  function endDrag() {
    drag = null;
    window.removeEventListener('pointermove', onDrag);
    window.removeEventListener('pointerup', endDrag);
    syncTimerToAgenda();
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
        syncTimerToAgenda(); appState.persist();
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
        syncTimerToAgenda(); appState.persist();
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
    s.extraInfo = result.extraInfo;
    updateTimeFeedback();
    renderEndControl();
    syncTimerToAgenda();
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
    savedFlowMsg = 'Sparat ✓';
    setTimeout(() => { savedFlowMsg = ''; }, 2000);
    if (loggedInUser) syncSave();
  }

  function addFlowToAgendaToday(f: Flow, activate = false) {
    const today = localDateISO();
    const flowToAdd: Flow = { ...f, id: uid(), startMin: s.startMin };
    let days: AgendaDay[] = agendaDays
      ? agendaDays.map(d => ({ ...d, flows: [...d.flows] }))
      : [];

    let dayIdx = days.findIndex(d => d.date === today);
    if (dayIdx < 0) {
      const insertAt = days.findIndex(d => d.date !== null && d.date > today);
      const newDay: AgendaDay = { date: today, flows: [] };
      if (insertAt < 0) { days.push(newDay); dayIdx = days.length - 1; }
      else { days.splice(insertAt, 0, newDay); dayIdx = insertAt; }
    }

    const dayFlows = [...days[dayIdx].flows];
    // Replace flow with same startMin or same title, otherwise insert sorted by time
    const replaceIdx = dayFlows.findIndex(
      fl => fl.startMin === s.startMin || fl.title === f.title
    );
    let flowIdx: number;
    if (replaceIdx >= 0) {
      dayFlows[replaceIdx] = flowToAdd;
      flowIdx = replaceIdx;
    } else {
      const insertAt = dayFlows.findIndex(fl => (fl.startMin ?? 0) > s.startMin);
      if (insertAt < 0) { dayFlows.push(flowToAdd); flowIdx = dayFlows.length - 1; }
      else { dayFlows.splice(insertAt, 0, flowToAdd); flowIdx = insertAt; }
    }

    days[dayIdx] = { ...days[dayIdx], flows: dayFlows };
    setActiveAgendaText(serializeAgenda(days));
    setActiveAgendaDate(today);
    if (activate) {
      activeAgendaFlow = { dayIdx, flowIdx };
      sessionSource = { kind: 'agenda', date: today, title: flowToAdd.title, startMin: flowToAdd.startMin ?? s.startMin };
    }
    appState.persist();
  }

  function loadFlow(id: string) {
    const f = s.flows.find(x => x.id === id);
    if (!f) return;
    f.lastUsed = Date.now();
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
    updateTimeFeedback(); renderEndControl();
    activeAgendaFlow = null;
    sessionSource = { kind: 'template', templateId: f.id, title: f.title };
    s.activeSection = 'now';
    appState.persist();
  }

  function addTemplateToAgendaToday(id: string) {
    const f = s.flows.find(x => x.id === id);
    if (!f) return;
    addFlowToAgendaToday(f, false);
    savedFlowMsg = 'Tillagd i dagplan ✓';
    setTimeout(() => { savedFlowMsg = ''; }, 2000);
    if (loggedInUser) syncSave();
  }

  function deleteFlow(id: string) {
    if (!confirm(`Radera flödet?`)) return;
    s.flows = s.flows.filter(f => f.id !== id);
    appState.persist();
  }

  const SYNC_TOKEN_STORAGE = 'timer-sync-token';
  let syncStatusTimer: ReturnType<typeof setTimeout>;

  function showSyncStatus(msg: string, isError = false) {
    syncStatusText = msg; syncStatusError = isError;
    clearTimeout(syncStatusTimer);
    syncStatusTimer = setTimeout(() => { syncStatusText = ''; }, 3000);
  }

  async function syncLoad() {
    const token = s.syncKey || '';
    if (!validateSyncToken(token)) { showSyncStatus('Inte inloggad', true); return; }
    try {
      const res = await fetch('/api/sync', {
        headers: { 'x-sync-token': token }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      // Merge flows: cloud wins for same ID, keep local-only flows
      const cloudFlows: Flow[] = data.flows || [];
      const cloudIds = new Set(cloudFlows.map((f: Flow) => f.id));
      const localOnly = (s.flows || []).filter(f => !cloudIds.has(f.id));
      s.flows = [...cloudFlows, ...localOnly];
      // Restore agenda from cloud if it has content
      if (data.agendaText) {
        s.agendaText = data.agendaText;
        s.agendaDate = data.agendaDate || '';
      }
      if (data.agendaText2) {
        s.agendaText2 = data.agendaText2;
        s.agendaDate2 = data.agendaDate2 || '';
      }
      activeAgendaFlow = null;
      sessionSource = { kind: 'unscheduled' };
      appState.persist();
      showSyncStatus('Laddat från moln ✓');
    } catch { showSyncStatus('Kunde inte ladda', true); }
  }

  async function syncSave() {
    const token = s.syncKey || '';
    if (!validateSyncToken(token)) { showSyncStatus('Inte inloggad', true); return; }
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-token': token
        },
        body: JSON.stringify({
          flows: s.flows || [],
          agendaText: s.agendaText || '',
          agendaDate: s.agendaDate || '',
          agendaText2: s.agendaText2 || '',
          agendaDate2: s.agendaDate2 || '',
        }),
      });
      if (!res.ok) throw new Error();
      showSyncStatus('Sparat till moln ✓');
    } catch { showSyncStatus('Kunde inte spara', true); }
  }

  async function login() {
    const name = loginNameInput?.value.trim() ?? '';
    const pass = loginPassInput?.value.trim() ?? '';
    if (!name || !pass) { showSyncStatus('Ange namn och lösenord', true); return; }
    s.syncKey = await deriveSyncToken(name, pass);
    loggedInUser = name;
    localStorage.setItem(SYNC_TOKEN_STORAGE, s.syncKey);
    localStorage.setItem('timer-login-user', name);
    appState.persist();
    await syncLoad();
  }

  function logout() {
    loggedInUser = '';
    s.syncKey = '';
    localStorage.removeItem(SYNC_TOKEN_STORAGE);
    localStorage.removeItem('timer-login-user');
    appState.persist();
  }

  function buildShareState() {
    return {
      blocks: s.blocks, dayTitle: s.dayTitle, extraInfo: s.extraInfo,
      startMin: s.startMin, endMode: s.endMode, clockSpan: s.clockSpan,
      palette: s.palette, dark: s.dark, showLeft: s.showLeft,
      showCenterEnd: s.showCenterEnd, hollow: s.hollow, textOutside: s.textOutside,
      showMin: s.showMin, showFive: s.showFive, showQuarter: s.showQuarter,
      segMinutesMode: s.segMinutesMode, showSegNotes: s.showSegNotes,
      showExtraInfo: s.showExtraInfo, showSegLabels: s.showSegLabels,
      agendaText: s.agendaText, agendaDate: s.agendaDate,
    };
  }

  let lastPushedHash = '';

  async function pushShareState() {
    if (!shareToken || !shareOwnerToken) return;
    const state = buildShareState();
    const hash = JSON.stringify(state);
    if (hash === lastPushedHash) return;
    try {
      await fetch(`/api/share?token=${encodeURIComponent(shareToken)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-share-owner': shareOwnerToken
        },
        body: hash,
      });
      lastPushedHash = hash;
    } catch { /* silent */ }
  }

  async function loadSharedState(token: string) {
    try {
      const res = await fetch(`/api/share?token=${encodeURIComponent(token)}`);
      if (!res.ok) return;
      const d = await res.json();
      if (d.blocks) s.blocks = d.blocks;
      if (d.dayTitle !== undefined) s.dayTitle = d.dayTitle;
      if (d.extraInfo !== undefined) s.extraInfo = d.extraInfo;
      if (d.startMin !== undefined) s.startMin = d.startMin;
      if (d.endMode) s.endMode = d.endMode;
      if (d.clockSpan) s.clockSpan = d.clockSpan;
      if (d.palette) s.palette = d.palette;
      if (d.dark !== undefined) s.dark = d.dark;
      if (d.showLeft !== undefined) s.showLeft = d.showLeft;
      if (d.showCenterEnd !== undefined) s.showCenterEnd = d.showCenterEnd;
      if (d.hollow !== undefined) s.hollow = d.hollow;
      if (d.textOutside !== undefined) s.textOutside = d.textOutside;
      if (d.showMin !== undefined) s.showMin = d.showMin;
      if (d.showFive !== undefined) s.showFive = d.showFive;
      if (d.showQuarter !== undefined) s.showQuarter = d.showQuarter;
      if (d.segMinutesMode) s.segMinutesMode = d.segMinutesMode;
      if (d.showSegNotes !== undefined) s.showSegNotes = d.showSegNotes;
      if (d.showExtraInfo !== undefined) s.showExtraInfo = d.showExtraInfo;
      if (d.showSegLabels !== undefined) s.showSegLabels = d.showSegLabels;
      if (d.agendaText !== undefined) s.agendaText = d.agendaText;
      if (d.agendaDate !== undefined) s.agendaDate = d.agendaDate;
      syncBodyClasses();
    } catch { /* silent */ }
  }

  function startSharing() {
    const tokens = createShareTokens();
    shareToken = tokens.viewToken;
    shareOwnerToken = tokens.ownerToken;
    localStorage.setItem('daytimer_share_token', tokens.viewToken);
    localStorage.setItem('daytimer_share_owner_token', tokens.ownerToken);
    lastPushedHash = '';
    pushShareState();
  }

  async function stopSharing() {
    if (!shareToken || !shareOwnerToken) return;
    try {
      await fetch(`/api/share?token=${encodeURIComponent(shareToken)}`, {
        method: 'DELETE',
        headers: { 'x-share-owner': shareOwnerToken }
      });
    } catch { /* silent */ }
    shareToken = '';
    shareOwnerToken = '';
    lastPushedHash = '';
    localStorage.removeItem('daytimer_share_token');
    localStorage.removeItem('daytimer_share_owner_token');
  }

  async function copyShareLink() {
    const link = `${location.origin}/?view=${shareToken}`;
    await navigator.clipboard.writeText(link);
    shareCopyText = '✓ Kopierad!';
    setTimeout(() => { shareCopyText = 'Kopiera länk'; }, 2000);
  }

  function saveAgenda() {
    const savedText = agendaDraft.trim()
      ? mergeAgendaDays(activeAgendaText(), agendaDraft)
      : activeAgendaText();
    if (agendaDraft.trim()) {
      setActiveAgendaText(savedText);
      agendaDraft = '';
    }
    appState.persist();

    const daysAfterSave = savedText.trim() ? parseAgenda(savedText) : null;
    const dayAfterSave = daysAfterSave
      ? (() => {
          const date = activeAgendaDate();
          if (date) {
            const hit = daysAfterSave.find(d => d.date === date);
            if (hit) return hit;
          }
          const today = localDateISO();
          return daysAfterSave.find(d => d.date === today)
            ?? daysAfterSave.find(d => d.date === null)
            ?? daysAfterSave[0];
        })()
      : null;
    if (daysAfterSave && dayAfterSave) {
      let t = s.startMin;
      const itemsAfterSave = dayAfterSave.flows.map(flow => {
        if (flow.startMin !== undefined) t = flow.startMin;
        const startMin = t;
        const totalMin = flow.minutes.reduce((a, b) => a + b, 0);
        t += totalMin;
        return { flow, startMin, totalMin };
      });
      const now = nowMinutes();
      const active = itemsAfterSave.find(item => now >= item.startMin && now < item.startMin + item.totalMin);
      if (active) {
        loadAgendaFlow(active.flow, active.startMin);
      } else {
        activeAgendaFlow = null;
        sessionSource = { kind: 'unscheduled' };
      }
    }

    if (loggedInUser) syncSave();

    savedAgendaMsg = 'Sparat ✓';
    setTimeout(() => { savedAgendaMsg = ''; }, 2000);
  }

  // Merge pasted agenda text with existing: new date-sections replace matching dates, others are kept
  function mergeAgendaDays(existing: string, incoming: string): string {
    const newDays = parseAgenda(incoming);
    if (newDays.length === 0) return incoming;
    const hasDates = newDays.some(d => d.date !== null);
    if (!existing.trim()) return incoming;
    // If pasted text has no dates, tag it with today so it doesn't wipe existing dated entries
    if (!hasDates) {
      const t = localDateISO();
      const [y, m, d] = t.split('-');
      return mergeAgendaDays(existing, `@${y.slice(2)}${m}${d}\n${incoming}`);
    }
    const baseDays = parseAgenda(existing);
    const merged = [...baseDays];
    for (const day of newDays) {
      const idx = merged.findIndex(d => d.date === day.date);
      if (idx >= 0) {
        merged[idx] = day;
      } else {
        const insertAt = merged.findIndex(d => d.date !== null && day.date !== null && d.date > day.date);
        if (insertAt < 0) merged.push(day);
        else merged.splice(insertAt, 0, day);
      }
    }
    return serializeAgenda(merged);
  }

  function deleteAgendaItem(flowIdx: number) {
    if (!agendaDays || selectedDayIdx < 0) return;
    const days = agendaDays.map((d, i) =>
      i === selectedDayIdx
        ? { ...d, flows: d.flows.filter((_, j) => j !== flowIdx) }
        : d
    );
    setActiveAgendaText(serializeAgenda(days));
    if (activeAgendaFlow?.dayIdx === selectedDayIdx && activeAgendaFlow.flowIdx === flowIdx) {
      activeAgendaFlow = null;
      sessionSource = { kind: 'unscheduled' };
    }
    appState.persist();
  }

  function startBlockEdit(id: string, field: 'name' | 'min') {
    if (isViewMode) return;
    editingBlockId = id;
    editingBlockField = field;
  }

  function commitBlockEdit() {
    editingBlockId = null;
    editingBlockField = null;
    if (partsArea) partsArea.value = serializeBlocks(s.blocks);
    updateTimeFeedback();
    renderEndControl();
    syncTimerToAgenda();
    appState.persist();
  }

  function addBlock() {
    if (isViewMode) return;
    const newId = uid();
    s.blocks = [...s.blocks, { id: newId, title: 'Ny aktivitet', minutes: 10, note: '', warning: false, pinned: false }];
    if (partsArea) partsArea.value = serializeBlocks(s.blocks);
    updateTimeFeedback();
    renderEndControl();
    syncTimerToAgenda();
    appState.persist();
    editingBlockId = newId;
    editingBlockField = 'name';
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
      const todayISO = localDateISO();
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiPayload({ message: agendaAiInput, mode: 'agenda', context: { date: todayISO } }))
      });
      const data = await res.json();
      if (data.error) { agendaAiError = data.error; return; }
      setActiveAgendaText(data.text);
      activeAgendaFlow = null;
      sessionSource = { kind: 'unscheduled' };
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

  function startAgendaDrag(e: PointerEvent, i: number, edge: 'top' | 'bottom') {
    if (isViewMode || !agendaDays || !selectedDay || !timelineEl) return;
    e.preventDefault();
    e.stopPropagation();
    agendaDragMoved = false;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const dayIdx = agendaDays.indexOf(selectedDay);
    if (dayIdx < 0) return;
    const item = agendaItems[i];
    const prev = agendaItems[i - 1];
    const next = agendaItems[i + 1];
    agendaDragState = {
      i, dayIdx,
      startY: e.clientY,
      startMinA: item.totalMin,
      blockStart: item.startMin,
      blockEnd: item.startMin + item.totalMin,
      clampMin: prev ? prev.startMin + prev.totalMin + 5 : 0,
      clampMax: next ? next.startMin - 5 : 24 * 60,
      edge,
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
    agendaDragMoved = true;
    const newDays = agendaDays.map((day, di) => {
      if (di !== d.dayIdx) return day;
      return {
        ...day,
        flows: day.flows.map((flow, fi) => {
          if (fi !== d.i) return flow;
          if (d.edge === 'bottom') {
            const newEnd = Math.max(d.blockStart + 5, Math.min(d.clampMax, d.blockStart + d.startMinA + deltaMin));
            return setFlowMinutes(flow, newEnd - d.blockStart);
          } else {
            const newStart = Math.max(d.clampMin, Math.min(d.blockEnd - 5, d.blockStart + deltaMin));
            return { ...setFlowMinutes(flow, d.blockEnd - newStart), startMin: newStart };
          }
        }),
      };
    });
    setActiveAgendaText(serializeAgenda(newDays));
  }

  function endAgendaDrag() {
    agendaDragState = null;
    window.removeEventListener('pointermove', onAgendaDrag);
    window.removeEventListener('pointerup', endAgendaDrag);
    setTimeout(() => { agendaDragMoved = false; }, 0);
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

& Glöm inte: möte kl 14 imorgon

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
    // View mode: load shared state and start polling
    const vt = new URLSearchParams(location.search).get('view');
    let viewPollId: ReturnType<typeof setInterval> | null = null;
    let viewVisibilityHandler: (() => void) | null = null;
    if (vt) {
      isViewMode = true;
      viewToken = vt;
      document.body.classList.add('view-mode');
      loadSharedState(vt);
      viewPollId = setInterval(() => loadSharedState(vt), 30000);
      viewVisibilityHandler = () => {
        if (document.hidden) {
          if (viewPollId) { clearInterval(viewPollId); viewPollId = null; }
        } else {
          loadSharedState(vt);
          viewPollId = setInterval(() => loadSharedState(vt), 30000);
        }
      };
      document.addEventListener('visibilitychange', viewVisibilityHandler);
    }

    const savedShare = localStorage.getItem('daytimer_share_token');
    const savedShareOwner = localStorage.getItem('daytimer_share_owner_token');
    if (savedShare && savedShareOwner) {
      shareToken = savedShare;
      shareOwnerToken = savedShareOwner;
    } else {
      localStorage.removeItem('daytimer_share_token');
      localStorage.removeItem('daytimer_share_owner_token');
    }

    if (!localStorage.getItem('day_timer_v1')) {
      const d = new Date();
      s.startMin = d.getHours() * 60;
      s.showControls = true;
    }
    // On touch devices with narrow viewport (iPad portrait range), close agenda to avoid crowding
    if (navigator.maxTouchPoints > 1 && window.innerWidth < 1100 && window.innerWidth > 800) {
      s.agendaOpen = false;
      appState.persist();
    }
    syncBodyClasses();
    if (startTimeInput) startTimeInput.value = fmtHM(s.startMin);
    if (titleInput) titleInput.value = s.dayTitle || '';
    if (partsArea) partsArea.value = serializeBlocks(s.blocks);
    const resizeObservers: ResizeObserver[] = [];
    if (sidebarEl && window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        document.documentElement.style.setProperty('--sb-w', sidebarEl.offsetWidth + 'px');
      });
      ro.observe(sidebarEl);
      document.documentElement.style.setProperty('--sb-w', sidebarEl.offsetWidth + 'px');
      resizeObservers.push(ro);
    }
    if (agendaEl && window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        document.documentElement.style.setProperty('--ag-w', agendaEl.offsetWidth + 'px');
      });
      ro.observe(agendaEl);
      document.documentElement.style.setProperty('--ag-w', agendaEl.offsetWidth + 'px');
      resizeObservers.push(ro);
    }
    const savedToken = localStorage.getItem(SYNC_TOKEN_STORAGE);
    const migrateLegacyToken = async () => {
      const sourceToken: string = savedToken || s.syncKey || '';
      if (!sourceToken) return;
      const existingHashedToken = validateSyncToken(sourceToken) ? sourceToken : null;
      if (existingHashedToken) {
        s.syncKey = existingHashedToken;
        return;
      }
      const legacyToken = sourceToken;
      const idx = legacyToken.indexOf(':');
      if (idx > 0) {
        const name = legacyToken.slice(0, idx);
        const pass = legacyToken.slice(idx + 1);
        if (name && pass) {
          s.syncKey = await deriveSyncToken(name, pass);
          localStorage.setItem(SYNC_TOKEN_STORAGE, s.syncKey);
          appState.persist();
        }
      }
    };
    void migrateLegacyToken();
    const savedUser = localStorage.getItem('timer-login-user');
    if (savedUser) loggedInUser = savedUser;
    const savedAiConfig = localStorage.getItem('daytimer_ai_config');
    if (savedAiConfig) {
      try { aiConfig = { ...aiConfig, ...JSON.parse(savedAiConfig) }; } catch { /* ignore */ }
    } else {
      // migrate from old single-key format
      const oldKey = localStorage.getItem('daytimer_ai_key');
      if (oldKey) { aiConfig = { provider: 'anthropic', apiKey: oldKey, baseUrl: '', customModel: '', planMode: 'helpful' }; saveAiConfig(); }
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
      if (e.altKey && !e.ctrlKey && !e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        if (!isViewMode) {
          const order = ['school', 'school+private', 'private', 'private+school'] as const;
          agendaDraft = '';
          s.agendaView = order[(order.indexOf(s.agendaView as typeof order[number]) + 1) % order.length];
          appState.persist();
        }
      }
    }
    window.addEventListener('keydown', handleKeydown);

    return () => {
      clearInterval(id);
      if (viewPollId) clearInterval(viewPollId);
      if (viewVisibilityHandler) document.removeEventListener('visibilitychange', viewVisibilityHandler);
      resizeObservers.forEach(ro => ro.disconnect());
      document.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  $effect(() => {
    const _ = s.palette + s.dark + s.sbCollapsed + s.agendaOpen + mobileTab + locked;
    if (typeof document !== 'undefined') syncBodyClasses();
  });

  $effect(() => {
    if (titleInput) titleInput.value = s.dayTitle || '';
  });

  $effect(() => {
    if (!selectedDay) return;
    const flows = selectedDay.flows;
    const firstExplicitIdx = flows.findIndex(f => f.startMin !== undefined);
    if (firstExplicitIdx >= 0) {
      let t = flows[firstExplicitIdx].startMin!;
      for (let i = firstExplicitIdx - 1; i >= 0; i--) {
        t -= flows[i].minutes.reduce((a, b) => a + b, 0);
      }
      agendaDayStart = t;
    } else {
      agendaDayStart = untrack(() => s.startMin);
    }
  });

  $effect(() => {
    if (!shareToken) return;
    let id: ReturnType<typeof setInterval> | null = null;

    function startPush() {
      if (!id) id = setInterval(pushShareState, 60000);
    }
    function stopPush() {
      if (id) { clearInterval(id); id = null; }
    }

    function onVisibility() {
      document.hidden ? stopPush() : (pushShareState(), startPush());
    }

    startPush();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopPush();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });

  $effect(() => {
    const _ = JSON.stringify(s.blocks) + s.palette + s.dark + s.hollow + s.textOutside +
      s.showMin + s.showFive + s.showQuarter + s.showSegLabels + s.showCenterEnd + s.segMinutesMode + s.clockSpan +
      s.agendaText + s.agendaDate + s.agendaText2 + s.agendaDate2 + s.agendaView;
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
    const fi = selectedDay?.flows.indexOf(active.flow) ?? -1;
    activeAgendaFlow = (agendaDays && fi >= 0) ? { dayIdx: selectedDayIdx, flowIdx: fi } : null;
    sessionSource = activeAgendaFlow
      ? { kind: 'agenda', date: selectedDay?.date ?? null, title: active.flow.title, startMin: s.startMin }
      : { kind: 'unscheduled' };
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
    const fi = selectedDay?.flows.indexOf(flow) ?? -1;
    activeAgendaFlow = (agendaDays && fi >= 0) ? { dayIdx: selectedDayIdx, flowIdx: fi } : null;
    sessionSource = activeAgendaFlow
      ? { kind: 'agenda', date: selectedDay?.date ?? null, title: flow.title, startMin: s.startMin }
      : { kind: 'unscheduled' };
    s.activeSection = 'plan';
    updateTimeFeedback(); renderEndControl(); appState.persist();
    mobileTab = 'timer'; syncBodyClasses();
  }

  function goToTimerNow() {
    const now = nowMinutes();
    if (agendaDays && selectedDay) {
      const flows = selectedDay.flows;
      // Derive day-start independently of s.startMin (which changes on manual loads).
      // Strategy: find the first flow with an explicit time and work backwards.
      let t: number;
      const firstExplicitIdx = flows.findIndex(f => f.startMin !== undefined);
      if (firstExplicitIdx >= 0) {
        t = flows[firstExplicitIdx].startMin!;
        for (let i = firstExplicitIdx - 1; i >= 0; i--) {
          t -= flows[i].minutes.reduce((a, b) => a + b, 0);
        }
      } else {
        t = agendaDayStart;
      }
      for (const flow of flows) {
        if (flow.startMin !== undefined) t = flow.startMin;
        const totalMin = flow.minutes.reduce((a, b) => a + b, 0);
        if (now >= t && now < t + totalMin) {
          loadAgendaFlow(flow, t);
          mobileTab = 'timer'; syncBodyClasses();
          return;
        }
        t += totalMin;
      }
    }
    // No block covers now — create one from the current timer state
    const roundedNow = Math.round(now / 5) * 5;
    const newFlow: Flow = {
      id: uid(),
      title: s.dayTitle || 'Session',
      startMin: roundedNow,
      parts: s.blocks.map(b => b.title),
      minutes: s.blocks.map(b => b.minutes),
      warnings: s.blocks.map(b => b.warning),
      notes: s.blocks.map(b => b.note),
      extraInfo: s.extraInfo,
      lastUsed: Date.now(),
    };
    const today = localDateISO();
    const existingText = activeAgendaText();
    const days = existingText.trim() ? parseAgenda(existingText) : [];
    let todayEntry = days.find(d => d.date === today);
    let dayIdx = days.indexOf(todayEntry as AgendaDay);
    if (!todayEntry) {
      todayEntry = { date: today, flows: [] };
      const insertAt = days.findIndex(d => d.date !== null && d.date > today);
      if (insertAt < 0) { days.push(todayEntry); dayIdx = days.length - 1; }
      else { days.splice(insertAt, 0, todayEntry); dayIdx = insertAt; }
    }
    const insertFlowAt = todayEntry.flows.findIndex(
      f => f.startMin !== undefined && f.startMin > roundedNow
    );
    let flowIdx: number;
    if (insertFlowAt < 0) { todayEntry.flows.push(newFlow); flowIdx = todayEntry.flows.length - 1; }
    else { todayEntry.flows.splice(insertFlowAt, 0, newFlow); flowIdx = insertFlowAt; }
    setActiveAgendaText(serializeAgenda(days));
    setActiveAgendaDate(today);
    lastAutoLoadKey = '';
    loadAgendaFlow(newFlow, roundedNow);
    activeAgendaFlow = { dayIdx, flowIdx };
    sessionSource = { kind: 'agenda', date: today, title: newFlow.title, startMin: roundedNow };
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
          {#if editingBlockId === b.id && editingBlockField === 'name'}
            <input class="inline-edit name-inp" use:focusOnMount
              value={b.title}
              onblur={(e) => { const v = (e.target as HTMLInputElement).value.trim(); if (v) b.title = v; commitBlockEdit(); }}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
              onclick={(e) => e.stopPropagation()} />
          {:else}
            <span class="name" onclick={() => startBlockEdit(b.id, 'name')}>{b.title}</span>
          {/if}
          {#if editingBlockId === b.id && editingBlockField === 'min'}
            <input class="inline-edit min-inp" type="number" min="1" use:focusOnMount
              value={b.minutes}
              onblur={(e) => { const v = parseInt((e.target as HTMLInputElement).value); if (v > 0) { b.minutes = v; b.pinned = true; } commitBlockEdit(); }}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
              onclick={(e) => e.stopPropagation()} />
          {:else if s.segMinutesMode === 'planned'}
            <span class="min" onclick={() => startBlockEdit(b.id, 'min')}>{b.minutes}m</span>
          {:else if s.segMinutesMode === 'remaining'}
            <span class="min" onclick={() => startBlockEdit(b.id, 'min')}>{isPast ? 0 : isActive ? Math.max(0, Math.ceil(segEnd - elapsed)) : b.minutes}m kvar</span>
          {/if}
        </div>
        {#if b.note && s.showSegNotes}
          <div class="note">{b.note}</div>
        {/if}
      {/each}
      {#if !isViewMode}
        <button class="seg-add-btn" onclick={addBlock}>+</button>
      {/if}
      {#if s.extraInfo && s.showExtraInfo}
        <div class="infobox">{s.extraInfo}</div>
      {/if}
    </div>
  </aside>

  <div class="resize-handle-sb" onpointerdown={startSidebarResize}></div>
  <button class="collapse-btn" onclick={toggleCollapse} title="Dölj panel">
    {s.sbCollapsed ? '›' : '‹'}
  </button>

  {#if isViewMode}
    <div class="live-badge">● Live</div>
  {/if}

  <main class="main">
    <div class="main-header">
      {#if !isViewMode && !locked}
        <input class="lesson-title lesson-title-editable"
          placeholder="Rubrik…"
          value={titleDraftValue || s.dayTitle}
          onfocus={() => { titleDraftValue = s.dayTitle; }}
          oninput={(e) => { titleDraftValue = (e.target as HTMLInputElement).value; }}
          onblur={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            if (v !== s.dayTitle) { s.dayTitle = v; syncTimerToAgenda(); appState.persist(); }
            titleDraftValue = '';
          }}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
        />
      {:else if s.dayTitle}
        <div class="lesson-title">{s.dayTitle}</div>
      {/if}
      <div class="top-time">
        <div class="now" onclick={goToTimerNow} style="cursor:pointer" title="Visa nuvarande tid">{nowText}</div>
        {#if s.showLeft}<div class="left">{leftText}</div>{/if}
      </div>
    </div>

    <div class="clock-wrap">
      <svg class="clock" viewBox="0 0 360 360" style="overflow:visible" bind:this={svgEl}></svg>
    </div>

    <div class="toolbar">
      <button class="icon" onclick={(e) => { e.stopPropagation(); popoverOpen = !popoverOpen; }} title="Visningsalternativ">⚙︎</button>
      <button class="icon" onclick={() => { s.showControls = !s.showControls; appState.persist(); }} title="Inställningar">✎</button>
      <div class="toolbar-spacer"></div>
      <button class="icon clock-span-btn" class:active={s.clockSpan === 720} onclick={cycleClockSpan} title="Klockvy">{s.clockSpan === 720 ? '12h' : '1h'}</button>
      <div class="toolbar-spacer"></div>
      <button class="icon" onclick={() => helpOpen = true} title="Hjälp">ⓘ</button>
      <button class="icon lock-btn" class:locked onclick={() => locked = !locked} title={locked ? 'Lås upp' : 'Lås sidan'}>{locked ? '○' : '⊠'}</button>
      <div class="warn-dots">
        {#each s.blocks as b, i (b.id)}
          {@const ct = clockTheme(s.palette, s.dark)}
          <button class="wd" class:on={b.warning} style="color:{ct.colors[i % 8]}"
            title={`2-min varning för "${b.title}"`}
            onclick={() => { b.warning = !b.warning; syncTimerToAgenda(); appState.persist(); }}
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
        {#if !isViewMode}
          <button class="pill" class:on={s.agendaView !== 'school'} onclick={() => {
            const order = ['school', 'school+private', 'private', 'private+school'] as const;
            agendaDraft = '';
            s.agendaView = order[(order.indexOf(s.agendaView as typeof order[number]) + 1) % order.length];
            appState.persist();
          }}>{{ school: 'Jobb', 'school+private': 'Jobb + fritid', private: 'Fritid', 'private+school': 'Fritid + jobb' }[s.agendaView]} <span>•</span></button>
        {/if}
      </div>
    </div>

    {#if s.showControls}
      <div class="controls">
        <nav class="section-nav" aria-label="Appsektioner">
          {#each (Object.keys(SECTION_LABELS) as AppSection[]) as section}
            <button class="section-tab" class:active={s.activeSection === section} onclick={() => setActiveSection(section)}>
              {SECTION_LABELS[section]}
            </button>
          {/each}
        </nav>

        <div class="section-hero">
          <div class="section-title">{SECTION_LABELS[s.activeSection]}</div>
          <div class="section-copy">
            {#if s.activeSection === 'now'}
              Redigera det som körs just nu i timern.
            {:else if s.activeSection === 'plan'}
              Välj ett block i dagplanen och redigera det här.
            {:else if s.activeSection === 'library'}
              Spara och återanvänd mallar utan att blanda ihop dem med dagens plan.
            {:else}
              Hantera synk, delning, AI och framtida importkällor.
            {/if}
          </div>
        </div>

        {#if s.activeSection === 'now' || s.activeSection === 'plan'}
          <div class="session-source" class:from-template={sessionSource.kind === 'template'} class:from-agenda={sessionSource.kind === 'agenda'}>
            {sessionSourceText()}
          </div>

          {#if s.activeSection === 'plan'}
            <div class="section-card">
              <div class="section-card-head">
                <strong>Valt dagplansblock</strong>
                <button class="ai-key-btn" onclick={() => { s.agendaOpen = !s.agendaOpen; appState.persist(); }}>
                  {s.agendaOpen ? 'Dölj tidslinje' : 'Visa tidslinje'}
                </button>
              </div>
              {#if selectedAgendaDetails}
                <div class="section-copy">
                  {selectedAgendaDetails.flow.title || '(utan rubrik)'} • {fmtAgendaDate(selectedAgendaDetails.day.date)} • {fmtHM(selectedAgendaDetails.startMin)}–{fmtHM(selectedAgendaDetails.startMin + selectedAgendaDetails.totalMin)}
                </div>
                <div class="section-copy muted">Ändringar i fälten nedan sparas tillbaka till det markerade blocket.</div>
              {:else}
                <div class="section-copy">Klicka på ett block i dagplanen till höger för att börja redigera ett specifikt pass.</div>
              {/if}
            </div>
          {/if}

          <div class="step-section">
            <div class="step-num">1</div>
            <div class="step-body">
              <label>{s.activeSection === 'plan' ? 'Blockrubrik' : 'Rubrik'}</label>
              <input type="text" bind:this={titleInput} placeholder="Matematik"
                oninput={(e) => { s.dayTitle = (e.target as HTMLInputElement).value; syncTimerToAgenda(); appState.persist(); }} />
            </div>
          </div>

          <div class="step-section">
            <div class="step-num">2</div>
            <div class="step-body">
              <label style="display:flex;align-items:center;gap:8px;">
                {s.activeSection === 'plan' ? 'Blockinnehåll (en rad per del)' : 'Lektionsdelar (en per rad)'}
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
          </div>

          <div class="step-section step-section--action">
            <div class="step-num">3</div>
            <div class="step-body">
              <button id="quickStartBtn" class="quickstart" style="width:100%" onclick={() => {
                const d = new Date();
                s.startMin = d.getHours() * 60 + d.getMinutes();
                if (startTimeInput) startTimeInput.value = fmtHM(s.startMin);
                warnedSet.clear(); renderEndControl(); updateTimeFeedback();
                const f: Flow = {
                  id: uid(), title: s.dayTitle || 'Session',
                  startMin: s.startMin,
                  parts: s.blocks.map(b => b.title),
                  minutes: s.blocks.map(b => b.minutes),
                  warnings: s.blocks.map(b => b.warning),
                  notes: s.blocks.map(b => b.note),
                  extraInfo: s.extraInfo,
                };
                addFlowToAgendaToday(f, true);
              }}><span class="ico">⚡︎</span> Snabbstart nu</button>
            </div>
          </div>

          <div>
            <label>{s.activeSection === 'plan' ? 'Kommentar för valt block' : 'Info-ruta (fri text, visas som egen ruta i sidopanelen)'}</label>
            <textarea placeholder="T.ex. Att ta med: bok, penna&#10;Läxa: sida 42"
              oninput={(e) => { s.extraInfo = (e.target as HTMLTextAreaElement).value; syncTimerToAgenda(); appState.persist(); }}>{s.extraInfo}</textarea>
          </div>
          <div class="row2">
            <div>
              <label>Starttid</label>
              <input type="time" bind:this={startTimeInput} oninput={(e) => {
                const [h, m] = (e.target as HTMLInputElement).value.split(':').map(Number);
                if (isNaN(h) || isNaN(m)) return;
                s.startMin = h * 60 + m; warnedSet.clear();
                renderEndControl(); updateTimeFeedback();
                syncTimerToAgenda(); appState.persist();
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
        {:else if s.activeSection === 'library'}
          <div class="flows">
            <label>Mallar</label>
            <button class="quickstart" onclick={saveFlow}
              title="Sparar nuvarande schema som en återanvändbar mall">
              <span class="ico">💾︎</span> {savedFlowMsg || 'Spara som mall'}
            </button>
            <p class="flows-hint">Här sparar du återanvändbara upplägg. Ladda i timern eller lägg till direkt i dagens plan.</p>
            {#if s.flows.length === 0}
              <p class="flows-hint">Inga mallar sparade ännu.</p>
            {:else}
              <button class="flows-toggle" onclick={() => flowsOpen = !flowsOpen}>
                Sparade mallar {flowsOpen ? '▾' : '▸'}
              </button>
              {#if flowsOpen}
                <div class="flow-list">
                  {#each [...s.flows].sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0)) as f (f.id)}
                    <div class="flow-item">
                      <button class="flow-name" onclick={() => loadFlow(f.id)} title="Ladda mallen i timern utan att ändra dagplanen">{f.title || '(utan rubrik)'}</button>
                      <button class="flow-add" onclick={() => addTemplateToAgendaToday(f.id)} title="Lägg till mallen i dagens dagplan">＋</button>
                      <button class="flow-del" onclick={() => deleteFlow(f.id)}><span class="ico">🗑︎</span></button>
                    </div>
                  {/each}
                </div>
              {/if}
            {/if}
          </div>
        {:else}
          <div class="section-card">
            <div class="section-card-head">
              <strong>Synk och arbetsyta</strong>
            </div>
            <div class="section-copy">Här ligger sådant som hör till kontot och appens infrastruktur, inte till ett enskilt block.</div>
          </div>

          <div class="login-form">
            {#if loggedInUser}
              <label>Synkronisering</label>
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

          <div class="share-section">
            <label>Dela session</label>
            {#if shareToken}
              <div class="share-link-row">
                <span class="share-link-text">{location.origin}/?view={shareToken}</span>
                <button class="ai-key-btn" onclick={copyShareLink}>{shareCopyText}</button>
              </div>
              <button class="quickstart" onclick={stopSharing}>Sluta dela</button>
            {:else}
              <button class="quickstart" onclick={startSharing}>Starta delning</button>
            {/if}
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
        {/if}
      </div>
    {/if}
  </main>

  <div class="resize-handle-ag" onpointerdown={startAgendaResize}></div>
  <aside class="agenda" bind:this={agendaEl}>
    {#if !isViewMode && s.activeSection === 'plan'}
      <div class="agenda-input-header">
        <span class="agenda-input-label">Importera ny dagplan</span>
        <button class="agenda-input-toggle" onclick={() => agendaInputOpen = !agendaInputOpen}>
          {agendaInputOpen ? '△ Dölj' : '▽ Redigera'}
        </button>
      </div>
      {#if agendaInputOpen}
        <textarea
          class="agenda-input"
          placeholder="Klistra in ny dagplan här. Texten slås ihop med sparad dagplan när du klickar Spara.&#10;&#10;@260508&#10;#Morgonrutin 08:00&#10;Vakna 5m&#10;Frukost 20m&#10;Promenad&#10;- ta med vatten&#10;&amp; Möte kl 9"
          value={agendaDraft}
          oninput={(e) => { agendaDraft = (e.target as HTMLTextAreaElement).value; }}
          onpaste={(e) => {
            const pasted = e.clipboardData?.getData('text') ?? '';
            const merged = mergeAgendaDays(agendaDraft, pasted);
            if (merged !== pasted) {
              e.preventDefault();
              agendaDraft = merged;
              (e.target as HTMLTextAreaElement).value = merged;
            }
          }}
        ></textarea>
        <div class="agenda-save-row">
          <button class="agenda-save-btn" onclick={saveAgenda}
            title="Importerar texten till sparad dagplan och synkar till molnet om du är inloggad. Mallbiblioteket påverkas inte.">
            {savedAgendaMsg || '📅 Spara dagplan'}
          </button>
          <button class="agenda-save-btn" onclick={() => {
            navigator.clipboard.writeText(AI_PROMPT_AGENDA).then(() => {
              copyAgendaPromptText = '✓ Kopierad';
              setTimeout(() => { copyAgendaPromptText = 'AI-prompt'; }, 1500);
            });
          }}>{copyAgendaPromptText}</button>
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
    {:else if !isViewMode}
      <div class="agenda-section-note">
        Dagplanen visas här som översikt. Byt till sektionen <strong>Plan</strong> för att importera, ändra block och arbeta med kalenderflödet.
      </div>
    {/if}

    {#if agendaDays && agendaDays.length > 0}
      <div class="agenda-nav">
        <button class="agenda-nav-btn" onclick={prevDay} disabled={selectedDayIdx <= 0}>‹</button>
        <span class="agenda-date-label">{fmtAgendaDate(selectedDay?.date ?? null)}</span>
        {#if !schoolPrimary() && !isViewMode}
          <span class="agenda-mode-badge">Fritid</span>
        {/if}
        <button class="agenda-nav-btn" onclick={nextDay} disabled={selectedDayIdx >= (agendaDays.length - 1)}>›</button>
      </div>
    {/if}

    {#if agendaItems.length === 0}
      <p class="agenda-empty">Skriv in dagplanen ovan, eller spara flöden via ✎-panelen.</p>
    {:else}
      {@const windowStart = Math.floor(agendaItems[0].startMin / 60) * 60}
      <div class="agenda-timeline" class:has-overlay={overlayItems.length > 0} bind:this={timelineEl}>
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
               onclick={() => { if (!agendaDragMoved) item.fromText ? loadAgendaFlow(item.flow, item.startMin) : loadFlow(item.flow.id); }}>
            <span class="agenda-time">{fmtHM(item.startMin)}–{fmtHM(item.startMin + item.totalMin)}</span>
            <span class="agenda-name">{item.flow.title || '(utan rubrik)'}</span>
            {#if item.fromText && !isViewMode}
              <button class="agenda-del-btn" onclick={(e) => { e.stopPropagation(); deleteAgendaItem(ai); }} title="Ta bort block">🗑</button>
              <div class="agenda-drag-top" onpointerdown={(e) => startAgendaDrag(e, ai, 'top')}></div>
              <div class="agenda-drag-bottom" onpointerdown={(e) => startAgendaDrag(e, ai, 'bottom')}></div>
            {/if}
          </div>
        {/each}
        {#each overlayItems as item (item.startMin + item.flow.title + '-overlay')}
          {@const topPct = ((item.startMin - windowStart) / 720 * 100).toFixed(3)}
          {@const heightPct = (item.totalMin / 720 * 100).toFixed(3)}
          <div class="agenda-block ghost"
               style="top: {topPct}%; height: {heightPct}%; border-left-color: var(--muted)">
            <span class="agenda-time">{fmtHM(item.startMin)}–{fmtHM(item.startMin + item.totalMin)}</span>
            <span class="agenda-name">{item.flow.title || '(utan rubrik)'}</span>
          </div>
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
      <li><b>Skapa ett schema</b> via <span class="ico">✎</span> — skriv aktiviteter i textfältet, en per rad.</li>
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
      <li>Importfältet används för att klistra in ny plantext med <code>@YYMMDD</code> och <code>#Rubrik HH:MM</code>.</li>
      <li>Klicka på ett block i tidslinjen för att ladda den sessionen i klockan.</li>
      <li>Bläddra mellan dagar med <b>‹ ›</b>-pilarna.</li>
    </ul>

    <h3>AI-planering</h3>
    <ul>
      <li>Öppna <span class="ico">✎</span> och scrolla ner till <b>AI-planering</b>.</li>
      <li>Välj provider: <b>Claude</b>, <b>GPT</b>, <b>Gemini</b> eller <b>Anpassad</b> (valfri OpenAI-kompatibel, t.ex. Mistral, Groq).</li>
      <li>Klistra in din API-nyckel — sparas lokalt, skickas till vår server enbart för att nå vald AI-leverantör.</li>
      <li>Klicka <b>▽ Planera med AI</b> under aktivitets­fältet → beskriv på fritt språk → schemat fylls i automatiskt.</li>
      <li>I agendapanelen: klicka <b>✨ AI-dagplan</b> för att generera ett fler­dagars schema.</li>
      <li><b>AI-prompt</b>-knappen bredvid aktivitetsfältet kopierar en prompt du kan klistra in i valfritt AI-verktyg manuellt.</li>
    </ul>

    <h3>Flöden &amp; synkronisering</h3>
    <ul>
      <li><b>Spara som mall</b> 💾 sparar det aktuella schemat som en återanvändbar mall.</li>
      <li>Mallnamnet laddar mallen i timern. <b>＋</b> lägger till mallen i dagens dagplan.</li>
      <li><b>☁ Ladda / ☁ Spara</b> hämtar eller skickar mallar och dagplaner till molnet.</li>
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

