<script lang="ts">
  import { CX, CY, R, Ri, polar, arcPath, fmtHM, truncate, isOnlyEmoji } from '$lib/clock.js';
  import { clockTheme, labelColorFor, type Palette } from '$lib/theme.js';
  import type { Block, Flow } from '$lib/state.svelte.js';

  interface Props {
    palette: Palette;
    dark: boolean;
    blocks: Block[];
    startMin: number;
    clockSpan: number;
    hollow: boolean;
    textOutside: boolean;
    showCenterEnd: boolean;
    showMin: boolean;
    showFive: boolean;
    showQuarter: boolean;
    showSegLabels: boolean;
    segMinutesMode: 'off' | 'planned' | 'remaining';
    nowMin: number;
    agendaItems: { flow: Flow; startMin: number; totalMin: number }[];
    isViewMode?: boolean;
    locked?: boolean;
    svgEl?: SVGSVGElement;
    onLoadAgendaFlow?: (flow: Flow, startMin: number) => void;
    onStartBoundaryDrag?: (e: PointerEvent, i: number) => void;
    onStartEndDrag?: (e: PointerEvent) => void;
    onStartStartDrag?: (e: PointerEvent) => void;
  }

  let {
    palette,
    dark,
    blocks,
    startMin,
    clockSpan,
    hollow,
    textOutside,
    showCenterEnd,
    showMin,
    showFive,
    showQuarter,
    showSegLabels,
    segMinutesMode,
    nowMin,
    agendaItems,
    isViewMode = false,
    locked = false,
    svgEl = $bindable(),
    onLoadAgendaFlow,
    onStartBoundaryDrag,
    onStartEndDrag,
    onStartStartDrag
  }: Props = $props();

  const ct = $derived(clockTheme(palette, dark));
  const sectorColors = $derived(ct.colors);
  const { bg, dimSuffix, mark: markColor, centerMain, centerMuted, handDark, handLight, chip: chipFill } = $derived(ct);
  
  const totalMin = $derived(blocks.reduce((a: number, b: Block) => a + b.minutes, 0));
  const startAngle = $derived(((startMin % clockSpan) / clockSpan) * 360);
  const elapsed = $derived(nowMin - startMin);
  const ri = $derived(hollow ? Ri : 0);

  const use12hAgenda = $derived(clockSpan === 720 && agendaItems.length > 0);

  // 12h Mode Data
  const periodStart = $derived(Math.floor(nowMin / 720) * 720);
  const agendaSectors = $derived.by(() => {
    if (!use12hAgenda) return [];
    return agendaItems.map((item: { flow: Flow; startMin: number; totalMin: number }, i: number) => {
      const itemEnd = item.startMin + item.totalMin;
      if (itemEnd <= periodStart || item.startMin >= periodStart + 720) return null;
      
      const clampStart = Math.max(item.startMin, periodStart);
      const clampEnd = Math.min(itemEnd, periodStart + 720);
      const a0 = ((clampStart - periodStart) / 720) * 360;
      const a1 = ((clampEnd - periodStart) / 720) * 360;
      
      if (a1 - a0 < 0.1) return null;
      
      const baseColor = sectorColors[i % sectorColors.length];
      const isPast = nowMin >= itemEnd;
      const isActive = nowMin >= item.startMin && nowMin < itemEnd;
      const midAngle = (a0 + a1) / 2;
      const [lx, ly] = textOutside ? polar(midAngle, R + 22) : polar(midAngle, ri > 0 ? (R + ri) / 2 : R * 0.65);

      const pureEmoji = isOnlyEmoji(item.flow.title);

      return {
        id: `agenda-${i}`,
        item,
        a0, a1,
        baseColor,
        isPast,
        isActive,
        lx, ly,
        splitAngle: ((nowMin - periodStart) / 720) * 360,
        fillText: labelColorFor(baseColor, i, isPast, palette, dark),
        label: pureEmoji ? item.flow.title : `${truncate(item.flow.title, 10)} ${fmtHM(item.startMin)}`,
        fontSize: pureEmoji ? 24 : (textOutside ? 14 : 13),
        pureEmoji
      };
    }).filter((s): s is NonNullable<typeof s> => s !== null);
  });

  // 1h/2h Mode Data
  const blockSectors = $derived.by(() => {
    if (use12hAgenda) return [];
    let cumMin = 0;
    return blocks.map((b: Block, i: number) => {
      const segStartMin = cumMin;
      const segEndMin = cumMin + b.minutes;
      const a0 = startAngle + (segStartMin / clockSpan) * 360;
      const a1 = startAngle + (segEndMin / clockSpan) * 360;
      const baseColor = sectorColors[i % sectorColors.length];
      const isPast = elapsed >= segEndMin;
      const isActive = elapsed >= segStartMin && elapsed < segEndMin;
      const midAngle = (a0 + a1) / 2;
      const [lx, ly] = textOutside ? polar(midAngle, R + 22) : polar(midAngle, ri > 0 ? (R + ri) / 2 : R / 2);
      
      const pureEmoji = isOnlyEmoji(b.title);
      let labelText = pureEmoji ? b.title : truncate(b.title, 14);

      if (!pureEmoji) {
        if (segMinutesMode === 'planned') {
          labelText += ` ${b.minutes}m`;
        } else if (segMinutesMode === 'remaining') {
          const mins = isPast ? 0 : isActive ? Math.max(0, Math.ceil(segEndMin - elapsed)) : b.minutes;
          labelText += ` ${mins}m kvar`;
        }
      }

      const res = {
        id: `block-${b.id}`,
        b, i,
        a0, a1,
        baseColor,
        isPast,
        isActive,
        lx, ly,
        splitAngle: startAngle + (elapsed / clockSpan) * 360,
        fillText: labelColorFor(baseColor, i, isPast, palette, dark),
        label: labelText,
        fontSize: pureEmoji ? 48 : (textOutside ? 14 : 13),
        pureEmoji
      };
      cumMin = segEndMin;
      return res;
    });
  });

  // Marks
  const marks = $derived.by(() => {
    const res: { ang: number; len: number; w: number; op: number }[] = [];
    const cs = clockSpan;
    if (cs === 720) {
      if (showMin)     for (let m = 0; m < 720; m += 15)  res.push({ ang: (m/720)*360, len: 5,  w: 1,   op: 0.45 });
      if (showFive)    for (let m = 0; m < 720; m += 60)  res.push({ ang: (m/720)*360, len: 11, w: 1.8, op: 0.7 });
      if (showQuarter) for (let m = 0; m < 720; m += 180) res.push({ ang: (m/720)*360, len: 18, w: 3,   op: 0.95 });
    } else {
      const f = cs / 60;
      if (showMin)     for (let m = 0; m < cs; m += f)    res.push({ ang: (m/cs)*360, len: 5,  w: 1,   op: 0.45 });
      if (showFive)    for (let m = 0; m < cs; m += 5*f)  res.push({ ang: (m/cs)*360, len: 11, w: 1.8, op: 0.7 });
      if (showQuarter) for (let m = 0; m < cs; m += 15*f) res.push({ ang: (m/cs)*360, len: 18, w: 3,   op: 0.95 });
    }
    return res;
  });

  // Hand / Spike
  const handData = $derived.by(() => {
    const ang = (nowMin % clockSpan / clockSpan) * 360;
    const innerR = 30, tipR = R + 2, baseWidth = 22;
    const [tx, ty] = polar(ang, tipR);
    const aRad = (ang - 90) * Math.PI / 180;
    const dx = Math.cos(aRad), dy = Math.sin(aRad);
    const px = -dy, py = dx;
    const cxB = CX + dx * innerR, cyB = CY + dy * innerR;
    const halfW = baseWidth / 2;
    const bx1 = cxB + px * halfW, by1 = cyB + py * halfW;
    const bx2 = cxB - px * halfW, by2 = cyB - py * halfW;
    const nowInView = nowMin >= startMin && nowMin < startMin + clockSpan;
    return {
      points: `${tx},${ty} ${bx1},${by1} ${bx2},${by2}`,
      opacity: nowInView ? 1 : 0.1
    };
  });

  // Center display data
  const centerData = $derived.by(() => {
    const now = new Date();
    const dayNames = ['Söndag','Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag'];
    const monthNames = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];
    return {
      day: dayNames[now.getDay()],
      date: `${now.getDate()} ${monthNames[now.getMonth()]}`,
      endTime: fmtHM(startMin + totalMin)
    };
  });

  // Session markers for 60m view
  const sessionMarkers = $derived.by(() => {
    if (use12hAgenda || clockSpan !== 60) return [];
    return [startAngle, startAngle + (totalMin / 60) * 360];
  });

  // Label measurement logic
  let labelRects = $state<Record<string, { x: number, y: number, w: number, h: number }>>({});
  let labelRefs = $state<Record<string, SVGTextElement>>({});

  $effect(() => {
    // Re-measure whenever labels or their positions might change
    // Access reactive values to trigger the effect
    agendaSectors;
    blockSectors;
    showSegLabels;
    
    // Use a small delay to ensure SVG has rendered the new positions
    const timeout = setTimeout(() => {
      const newRects: Record<string, { x: number, y: number, w: number, h: number }> = {};
      for (const [id, node] of Object.entries(labelRefs)) {
        if (node) {
          try {
            const bb = node.getBBox();
            newRects[id] = { x: bb.x, y: bb.y, w: bb.width, h: bb.height };
          } catch (e) { /* ignore */ }
        }
      }
      labelRects = newRects;
    }, 0);

    return () => clearTimeout(timeout);
  });
  
  function registerLabel(node: SVGTextElement, id: string) {
    labelRefs[id] = node;
    return {
      destroy() {
        delete labelRefs[id];
      }
    };
  }

</script>

<svg bind:this={svgEl} class="clock" viewBox="0 0 360 360" style="overflow:visible">
  <!-- Sectors -->
  {#if use12hAgenda}
    {#each agendaSectors as s (s.id)}
      {#if s.isActive}
        {#if s.splitAngle > s.a0}
          <path d={arcPath(s.a0, Math.min(s.splitAngle, s.a1), R, ri)} fill={s.baseColor + dimSuffix} />
        {/if}
        {#if s.splitAngle < s.a1}
          <path d={arcPath(Math.max(s.splitAngle, s.a0), s.a1, R, ri)} fill={s.baseColor} />
        {/if}
      {:else}
        <path d={arcPath(s.a0, s.a1, R, ri)} fill={s.isPast ? s.baseColor + dimSuffix : s.baseColor} />
      {/if}
      <!-- Hit area -->
      <path 
        role="button"
        tabindex="0"
        aria-label="Visa agendaflöde"
        d={arcPath(s.a0, s.a1, R, ri)} 
        fill="transparent" 
        style="cursor:pointer" 
        onclick={() => onLoadAgendaFlow?.(s.item.flow, s.item.startMin)}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLoadAgendaFlow?.(s.item.flow, s.item.startMin); } }} />
    {/each}
  {:else}
    {#each blockSectors as s (s.id)}
      {#if s.isActive}
        <path d={arcPath(s.a0, s.splitAngle, R, ri)} fill={s.baseColor + dimSuffix} />
        <path d={arcPath(s.splitAngle, s.a1, R, ri)} fill={s.baseColor} />
      {:else}
        <path d={arcPath(s.a0, s.a1, R, ri)} fill={s.isPast ? s.baseColor + dimSuffix : s.baseColor} />
      {/if}
      
      <!-- Boundary Drag Handle -->
      {#if s.i > 0}
        {@const [x0, y0] = polar(s.a0, ri || 0)}
        {@const [x1, y1] = polar(s.a0, R)}
        <line 
          role="slider"
          tabindex="0"
          aria-label="Justera blockgräns"
          aria-valuenow={s.a0}
          x1={x0} y1={y0} x2={x1} y2={y1} 
          stroke="transparent" stroke-width="32" pointer-events="stroke" style="cursor:grab;touch-action:none"
          onpointerdown={(e) => onStartBoundaryDrag?.(e, s.i - 1)} />
      {/if}
    {/each}
  {/if}

  <!-- Hollow center circle -->
  {#if hollow}
    <circle cx={CX} cy={CY} r={Ri - 3} fill={bg} />
    {#if showCenterEnd}
      {#if clockSpan === 720}
        <text x={CX} y={CY - 8} text-anchor="middle" font-size="9" fill={centerMuted}>{centerData.day}</text>
        <text x={CX} y={CY + 11} text-anchor="middle" font-size="17" font-weight="200" fill={centerMain}>{centerData.date}</text>
      {:else}
        <text x={CX} y={CY - 8} text-anchor="middle" font-size="11" fill={centerMuted}>slutar</text>
        <text x={CX} y={CY + 12} text-anchor="middle" font-size="20" font-weight="200" letter-spacing="-0.5" style="font-variant-numeric: tabular-nums" fill={centerMain}>{centerData.endTime}</text>
      {/if}
    {/if}
  {/if}

  <!-- Start/End handles for 1h/2h mode -->
  {#if !use12hAgenda}
    {@const [sx0, sy0] = polar(startAngle, ri || 0)}
    {@const [sx1, sy1] = polar(startAngle, R)}
    <line 
      role="slider"
      tabindex="0"
      aria-label="Justera starttid"
      aria-valuenow={startAngle}
      x1={sx0} y1={sy0} x2={sx1} y2={sy1} 
      stroke="transparent" stroke-width="36" pointer-events="stroke" style="cursor:grab;touch-action:none"
      onpointerdown={(e) => onStartStartDrag?.(e)} />

    {#if (totalMin / clockSpan) * 360 < 360 - 2}
      {@const aEnd = startAngle + (totalMin / clockSpan) * 360}
      {@const [ex0, ey0] = polar(aEnd, ri || 0)}
      {@const [ex1, ey1] = polar(aEnd, R)}
      <line 
        role="slider"
        tabindex="0"
        aria-label="Justera sluttid"
        aria-valuenow={aEnd}
        x1={ex0} y1={ey0} x2={ex1} y2={ey1} 
        stroke="transparent" stroke-width="36" pointer-events="stroke" style="cursor:grab;touch-action:none"
        onpointerdown={(e) => onStartEndDrag?.(e)} />
    {/if}
  {/if}

  <!-- Marks -->
  {#each marks as m}
    {@const [mx0, my0] = polar(m.ang, R + 1)}
    {@const [mx1, my1] = polar(m.ang, R - m.len)}
    <line x1={mx0} y1={my0} x2={mx1} y2={my1} 
      stroke={markColor} stroke-width={m.w} stroke-linecap="round" opacity={m.op} pointer-events="none" />
  {/each}

  <!-- Session markers for 60m view -->
  {#each sessionMarkers as ang}
    {@const [hx0, hy0] = polar(ang, R + 6)}
    {@const [hx1, hy1] = polar(ang, R - 6)}
    <line x1={hx0} y1={hy0} x2={hx1} y2={hy1} stroke="#fff" stroke-width="3.2" stroke-linecap="round" opacity="0.38" pointer-events="none" />
    <line x1={hx0} y1={hy0} x2={hx1} y2={hy1} stroke={markColor} stroke-width="1.4" stroke-linecap="round" opacity="0.95" pointer-events="none" />
  {/each}

  <!-- Clock Hand / Spike -->
  <polygon points={handData.points} fill={handDark} stroke={handLight} stroke-width="1.5" stroke-linejoin="round" opacity={handData.opacity} />

  <!-- Labels -->
  {#if showSegLabels}
    {#each (use12hAgenda ? agendaSectors : blockSectors) as s (s.id)}
      {@const id = s.id}
      {@const rect = labelRects[id]}
      <g pointer-events="none">
        {#if rect && !s.pureEmoji}
          <rect 
            x={rect.x - 6} y={rect.y - 1.5} 
            width={rect.w + 12} height={rect.h + 3} 
            rx="3" 
            fill={chipFill} 
            stroke={s.fillText} 
            stroke-width="1"
            opacity="0.95" />
        {/if}
        <text 
          use:registerLabel={id}
          x={s.lx} y={s.ly} 
          text-anchor="middle" dominant-baseline="middle" 
          font-size={s.fontSize} font-weight="600" fill={s.fillText}>
          {s.label}
        </text>
      </g>
    {/each}
  {/if}
</svg>

<style>
  .clock {
    display: block;
    user-select: none;
    touch-action: pan-y;
    overflow: visible;
    width: min(88vh, 55vw);
    height: min(88vh, 55vw);
  }

  @media (max-width: 800px) {
    .clock { width: min(95vw, 70vh); height: min(95vw, 70vh); }
  }

  @media (max-width: 800px) and (orientation: portrait) and (hover: none) and (pointer: coarse) {
    .clock [role='slider'] { pointer-events: none; }
  }

  @media (min-width: 801px) and (max-width: 1100px) {
    .clock { width: min(80vh, 45vw); height: min(80vh, 45vw); }
  }

  @media (orientation: landscape) and (max-height: 500px) {
    .clock { width: 48vh; height: 48vh; }
  }
</style>
