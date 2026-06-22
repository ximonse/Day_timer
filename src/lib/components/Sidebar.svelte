<script lang="ts">
  import { clockTheme, type Palette } from '$lib/theme.js';
  import { uid, type Block } from '$lib/state.svelte.js';
  import { parseMarkdownHtml } from '$lib/markdown.js';
  import { showSegmentDoneControl } from '$lib/session.js';
  import { colorForSegment, stripColorDirective, toggleTitleStrikethrough } from '$lib/title-color.js';

  interface Props {
    blocks: Block[];
    displayBlocks?: Block[];
    palette: Palette;
    dark: boolean;
    segMinutesMode: 'off' | 'planned' | 'remaining';
    showSegNotes: boolean;
    showExtraInfo: boolean;
    extraInfo: string;
    isViewMode: boolean;
    elapsedMin: number;
    agendaView: 'school' | 'private';
    
    // Actions/Callbacks
    onCommitEdit: () => void;
    onToggleSegmentDone?: (id: string) => void;
    doneBlockIds?: string[];
  }

  let {
    blocks = $bindable(),
    displayBlocks,
    palette,
    dark,
    segMinutesMode,
    showSegNotes,
    showExtraInfo,
    extraInfo = $bindable(),
    isViewMode,
    elapsedMin,
    agendaView,
    onCommitEdit,
    onToggleSegmentDone,
    doneBlockIds = []
  }: Props = $props();

  let editingBlockId = $state<string | null>(null);
  let editingBlockField = $state<'name' | 'min' | 'note' | 'extra' | null>(null);
  let revealedCheckId = $state<string | null>(null);

  let armedBlockId = $state<string | null>(null);
  let dragOverIdx = $state<number | null>(null);
  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  let pressStartX = 0;
  let pressStartY = 0;
  let pressBlockId: string | null = null;
  let suppressNextClick = false;
  const rowRefs = new Map<string, HTMLElement>();

  function bindRow(node: HTMLElement, id: string) {
    rowRefs.set(id, node);
    return {
      destroy() { rowRefs.delete(id); }
    };
  }

  function rowPointerDown(e: PointerEvent, id: string) {
    if (e.pointerType === 'mouse') return;
    if (isViewMode) return;
    if (editingBlockId !== null) return;
    pressStartX = e.clientX;
    pressStartY = e.clientY;
    pressBlockId = id;
    window.addEventListener('pointermove', windowPointerMove);
    window.addEventListener('pointerup', windowPointerUp);
    window.addEventListener('pointercancel', windowPointerUp);
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      pressTimer = null;
      if (pressBlockId === id) {
        armedBlockId = id;
        suppressNextClick = true;
        dragOverIdx = blocks.findIndex(b => b.id === id);
      }
    }, 350);
  }

  function windowPointerMove(e: PointerEvent) {
    if (pressBlockId === null) return;
    if (armedBlockId === null) {
      // Pre-arm: cancel timer if user moves (scrolling)
      if (Math.hypot(e.clientX - pressStartX, e.clientY - pressStartY) > 8) {
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
        cleanupWindowListeners();
        pressBlockId = null;
      }
      return;
    }
    // Armed — compute drop target based on finger Y
    let bestIdx = blocks.length;
    for (let i = 0; i < blocks.length; i++) {
      const row = rowRefs.get(blocks[i].id);
      if (!row) continue;
      const rect = row.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        bestIdx = i;
        break;
      }
    }
    dragOverIdx = bestIdx;
  }

  function windowPointerUp() {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    if (armedBlockId !== null && dragOverIdx !== null) {
      const fromIdx = blocks.findIndex(b => b.id === armedBlockId);
      let toIdx = dragOverIdx;
      if (fromIdx >= 0 && toIdx !== fromIdx && toIdx !== fromIdx + 1) {
        const next = [...blocks];
        const [moved] = next.splice(fromIdx, 1);
        if (toIdx > fromIdx) toIdx -= 1;
        next.splice(toIdx, 0, moved);
        blocks = next;
        onCommitEdit();
      }
    }
    armedBlockId = null;
    dragOverIdx = null;
    pressBlockId = null;
    cleanupWindowListeners();
    // Reset suppress on next tick (after the click event fires)
    setTimeout(() => { suppressNextClick = false; }, 0);
  }

  function cleanupWindowListeners() {
    window.removeEventListener('pointermove', windowPointerMove);
    window.removeEventListener('pointerup', windowPointerUp);
    window.removeEventListener('pointercancel', windowPointerUp);
  }

  function maybeSuppressClick(e: MouseEvent) {
    if (suppressNextClick) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }

  function focusOnMount(node: HTMLElement) {
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
      node.focus();
      if (node instanceof HTMLInputElement) node.select();
    }
    return {};
  }

  function startBlockEdit(id: string, field: 'name' | 'min' | 'note') {
    if (isViewMode) return;
    editingBlockId = id;
    editingBlockField = field;
  }

  function startExtraEdit() {
    if (isViewMode) return;
    editingBlockId = null;
    editingBlockField = 'extra';
  }

  function commitEdit() {
    editingBlockId = null;
    editingBlockField = null;
    revealedCheckId = null;
    onCommitEdit();
  }

  function addBlock() {
    if (isViewMode) return;
    const newId = uid();
    blocks = [...blocks, { id: newId, title: '', minutes: 10, note: '', warning: true, pinned: false }];
    editingBlockId = newId;
    editingBlockField = 'name';
    onCommitEdit();
  }

  function addBlockAfter(id: string) {
    if (isViewMode) return;
    const idx = blocks.findIndex((x: Block) => x.id === id);
    if (idx < 0) return;
    
    const newId = uid();
    const newBlock: Block = { id: newId, title: '', minutes: 10, note: '', warning: true, pinned: false };
    const next = [...blocks];
    next.splice(idx + 1, 0, newBlock);
    blocks = next;
    
    editingBlockId = newId;
    editingBlockField = 'name';
    onCommitEdit();
  }

  function deleteBlock(id: string) {
    blocks = blocks.filter((x: Block) => x.id !== id);
    if (blocks.length === 0) {
      blocks = [{ id: uid(), title: '', minutes: 10, note: '', warning: true, pinned: false }];
      editingBlockId = blocks[0].id;
      editingBlockField = 'name';
    }
    onCommitEdit();
  }

  function toggleCheck(b: Block, lineIdx: number) {
    if (isViewMode) return;
    const lines = b.note.split('\n');
    lines[lineIdx] = toggleTitleStrikethrough(lines[lineIdx]);
    b.note = lines.join('\n');
    commitEdit();
  }

  function toggleTitleCheck(b: Block) {
    if (isViewMode) return;
    b.title = toggleTitleStrikethrough(b.title);
    commitEdit();
  }

  function handleSidebarNameKeydown(e: KeyboardEvent, b: Block) {
    if (e.key === 'Escape') {
      e.preventDefault();
      const input = e.target as HTMLInputElement;
      parseAndCommitSidebarName(b, input.value, false);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const input = e.target as HTMLInputElement;
      const val = input.value.trim();
      if (val) {
        b.title = val;
        editingBlockField = 'note';
      } else {
        deleteBlock(b.id);
        editingBlockId = null;
        editingBlockField = null;
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.target as HTMLInputElement;
      parseAndCommitSidebarName(b, input.value, true);
      return;
    }

    if (e.key === '&') {
      e.preventDefault();
      const input = e.target as HTMLInputElement;
      b.title = input.value.trim();
      commitEdit();
      startExtraEdit();
      return;
    }
  }

  function handleSidebarNameBlur(b: Block, value: string) {
    if (editingBlockId === b.id && editingBlockField === 'name') {
      parseAndCommitSidebarName(b, value, false);
    }
  }

  function handleSidebarNoteKeydown(e: KeyboardEvent, b: Block) {
    if (e.key === 'Escape') {
      e.preventDefault();
      const input = e.target as HTMLTextAreaElement;
      b.note = input.value.trim();
      commitEdit();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const input = e.target as HTMLTextAreaElement;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      input.value = input.value.substring(0, start) + "\n" + input.value.substring(end);
      input.selectionStart = input.selectionEnd = start + 1;
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.target as HTMLTextAreaElement;
      b.note = input.value.trim();
      addBlockAfter(b.id);
      return;
    }
    if (e.key === '&') {
      e.preventDefault();
      const input = e.target as HTMLTextAreaElement;
      b.note = input.value.trim();
      commitEdit();
      startExtraEdit();
      return;
    }
  }

  function handleSidebarNoteBlur(b: Block, value: string) {
    if (editingBlockId === b.id && editingBlockField === 'note') {
      b.note = value.trim();
      commitEdit();
    }
  }

  function handleSidebarExtraKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      const input = e.target as HTMLTextAreaElement;
      extraInfo = input.value.trim();
      commitEdit();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.target as HTMLTextAreaElement;
      extraInfo = input.value.trim();
      commitEdit();
    }
  }

  function handleSidebarExtraBlur(value: string) {
    if (editingBlockField === 'extra') {
      extraInfo = value.trim();
      commitEdit();
    }
  }

  function parseAndCommitSidebarName(b: Block, rawValue: string, addNew: boolean) {
    let val = rawValue;

    // Handle && (session-wide prominent comment) before single &
    if (val.includes('&&')) {
      const idx = val.indexOf('&&');
      const before = val.slice(0, idx);
      const after = val.slice(idx + 2).trim();
      val = before.trim();
      if (after) {
        extraInfo = extraInfo ? extraInfo + '\n&&' + after : '&&' + after;
      }
    }
    // Handle single & (regular session-wide extra info)
    if (val.includes('&')) {
      const parts = val.split('&');
      val = parts[0].trim();
      const extra = parts.slice(1).join('&').trim();
      if (extra) {
        extraInfo = extraInfo ? extraInfo + '\n' + extra : extra;
      }
    }

    // Handle - (Note)
    if (val.includes('-')) {
      const parts = val.split('-');
      val = parts[0].trim();
      const note = parts.slice(1).join('-').trim();
      if (note) {
        b.note = b.note ? b.note + '\n' + note : note;
      }
    }

    const runMatch = val.match(/\s+%(?:min)?$/i);
    if (runMatch) {
      b.minutes = 10;
      b.pinned = false;
      b.runUntilChecked = true;
      val = val.slice(0, val.length - runMatch[0].length).trim();
    }

    const mMatch = val.match(/\s+(\d+)m$/i);
    if (mMatch) {
      b.minutes = Math.max(1, parseInt(mMatch[1], 10));
      b.pinned = true;
      delete b.runUntilChecked;
      val = val.slice(0, val.length - mMatch[0].length).trim();
    }

    if (val) {
      b.title = val;
      commitEdit();
    } else {
      deleteBlock(b.id);
    }
    
    if (addNew && val) {
      addBlockAfter(b.id);
    }
  }

  function commitMinutesEdit(b: Block, rawValue: string) {
    const val = rawValue.trim();
    if (/^%(?:min)?$/i.test(val)) {
      b.minutes = 10;
      b.pinned = false;
      b.runUntilChecked = true;
    } else {
      const v = parseInt(val, 10);
      if (v > 0) {
        b.minutes = v;
        b.pinned = true;
        delete b.runUntilChecked;
      }
    }
    commitEdit();
  }
</script>

<div id="sidebar-blocks" class="seglist">
  {#if agendaView === 'private' && !isViewMode}
    <div style="margin-bottom: 8px; align-self: flex-end;">
      <span class="agenda-mode-badge">Eget</span>
    </div>
  {/if}
  {#if blocks.length === 0}
    <div class="empty-session">
      <strong>Inget pass just nu</strong>
      <span>Välj ett pass i agendan eller lägg till en aktivitet.</span>
    </div>
  {/if}
  {#each blocks as b, i (b.id)}
    {@const ct = clockTheme(palette, dark)}
    {@const displayTitle = stripColorDirective(b.title)}
    {@const blockColor = colorForSegment(b.title, ct.colors, i)}
    {@const timingBlocks = displayBlocks ?? blocks}
    {@const timingBlock = timingBlocks[i] ?? b}
    {@const cumMin = timingBlocks.slice(0, i).reduce((a: number, x: Block) => a + x.minutes, 0)}
    {@const segEnd = cumMin + timingBlock.minutes}
    {@const isActive = elapsedMin >= cumMin && elapsedMin < segEnd}
    {@const isPast = elapsedMin >= segEnd}
    {#if dragOverIdx === i && armedBlockId !== b.id}
      <div class="drag-drop-line" aria-hidden="true"></div>
    {/if}
    <div class="row" class:active={isActive} class:past={isPast} class:armed={armedBlockId === b.id} class:done={doneBlockIds.includes(b.id)}
         use:bindRow={b.id}
         onclickcapture={maybySuppressClick}>
      {#if !isViewMode}
        <span class="grip-icon" aria-hidden="true"
              onpointerdown={(e) => rowPointerDown(e, b.id)}></span>
      {/if}
      <span class="dot drag-handle"
            style="background:{blockColor}"
            role="button" tabindex="-1" aria-label="Dra för att flytta blocket"
            onpointerdown={(e) => rowPointerDown(e, b.id)}></span>
      {#if editingBlockId === b.id && editingBlockField === 'name'}
        <input class="inline-edit name-inp" use:focusOnMount
          value={b.title}
          onblur={(e) => handleSidebarNameBlur(b, (e.target as HTMLInputElement).value)}
          onkeydown={(e) => handleSidebarNameKeydown(e, b)}
          onclick={(e) => e.stopPropagation()} />
      {:else}
        <button class="name seg-inline-btn" type="button" onclick={() => startBlockEdit(b.id, 'name')} oncontextmenu={(e) => { e.preventDefault(); revealedCheckId = `${b.id}-title`; }}>
          {@html parseMarkdownHtml(displayTitle)}
        </button>
        {#if !isViewMode && onToggleSegmentDone && showSegmentDoneControl(b.id, isActive ? b.id : null, doneBlockIds)}
          <button type="button" class="title-check-btn seg-done-control" class:done-checked={doneBlockIds.includes(b.id)} onclick={(e) => { e.stopPropagation(); onToggleSegmentDone(b.id); }} title={doneBlockIds.includes(b.id) ? 'Ångra — återställ tid' : 'Klar nu — resterande tid läggs på nästa segment'} aria-label={doneBlockIds.includes(b.id) ? 'Ångra' : 'Klar'}>
            {#if doneBlockIds.includes(b.id)}✓{/if}
          </button>
        {:else if !onToggleSegmentDone}
          <button type="button" class="title-check-btn" class:revealed={revealedCheckId === `${b.id}-title`} onclick={(e) => { e.stopPropagation(); toggleTitleCheck(b); revealedCheckId = null; }} title="Bocka av block" aria-label="Bocka av block">
            {#if b.title.includes('~~')}✓{/if}
          </button>
        {/if}
      {/if}
      {#if editingBlockId === b.id && editingBlockField === 'min'}
        <input class="inline-edit min-inp" type="text" inputmode="numeric" use:focusOnMount
          value={b.runUntilChecked ? '%' : b.minutes}
          onblur={(e) => commitMinutesEdit(b, (e.target as HTMLInputElement).value)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
          onclick={(e) => e.stopPropagation()} />
      {:else if segMinutesMode === 'planned'}
        <button class="min seg-inline-btn" type="button" onclick={() => startBlockEdit(b.id, 'min')}>{b.runUntilChecked && isActive ? `pågår ${Math.max(1, Math.ceil(elapsedMin - cumMin))}m` : b.runUntilChecked ? '%' : `${b.minutes}m`}</button>
      {:else if segMinutesMode === 'remaining'}
        <button class="min seg-inline-btn" type="button" onclick={() => startBlockEdit(b.id, 'min')}>{b.runUntilChecked && isActive ? `pågår ${Math.max(1, Math.ceil(elapsedMin - cumMin))}m` : `${isPast ? 0 : isActive ? Math.max(0, Math.ceil(segEnd - elapsedMin)) : b.minutes}m kvar`}</button>
      {/if}
    </div>
    {#if showSegNotes}
      {#if editingBlockId === b.id && editingBlockField === 'note'}
        <textarea class="inline-edit note note-inp" use:focusOnMount
          onblur={(e) => handleSidebarNoteBlur(b, (e.target as HTMLTextAreaElement).value)}
          onkeydown={(e) => handleSidebarNoteKeydown(e, b)}
          onclick={(e) => e.stopPropagation()}>{b.note}</textarea>
      {:else if b.note}
        <button class="note seg-inline-btn" type="button" onclick={() => startBlockEdit(b.id, 'note')}>
          {#each b.note.split('\n') as line, lineIdx}
            {#if line.trim()}
              <div class="note-line" role="group" oncontextmenu={(e) => { e.preventDefault(); revealedCheckId = `${b.id}-${lineIdx}`; }}>
                <span class="note-text">{@html parseMarkdownHtml(stripColorDirective(line))}</span>
                <div class="check-btn" role="button" tabindex="0" class:revealed={revealedCheckId === `${b.id}-${lineIdx}`} onclick={(e) => { e.stopPropagation(); toggleCheck(b, lineIdx); revealedCheckId = null; }} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleCheck(b, lineIdx); revealedCheckId = null; } }} title="Bocka av" aria-label="Bocka av">
                  {#if line.includes('~~')}✓{/if}
                </div>
              </div>
            {/if}
          {/each}
        </button>
      {/if}
    {/if}
  {/each}
  {#if armedBlockId !== null && dragOverIdx === blocks.length}
    <div class="drag-drop-line" aria-hidden="true"></div>
  {/if}
  {#if showExtraInfo}
    {#if editingBlockField === 'extra'}
      <textarea class="inline-edit infobox extra-inp" use:focusOnMount
        onblur={(e) => handleSidebarExtraBlur((e.target as HTMLTextAreaElement).value)}
        onkeydown={(e) => handleSidebarExtraKeydown(e)}
        onclick={(e) => e.stopPropagation()}>{extraInfo}</textarea>
    {:else if extraInfo}
      <div class="infobox-list">
        {#each extraInfo.split('\n') as line, i}
          {#if line.trim().startsWith('&&')}
            <button class="infobox prominent seg-inline-btn" type="button" onclick={startExtraEdit}>{@html parseMarkdownHtml(line.trim().slice(2).trim())}</button>
          {:else if line.trim()}
            <button class="infobox seg-inline-btn" type="button" onclick={startExtraEdit}>{@html parseMarkdownHtml(line)}</button>
          {/if}
        {/each}
      </div>
    {/if}
  {/if}
  {#if !isViewMode}
    <div class="sidebar-add-row">
      <button class="seg-add-btn" onclick={addBlock}>+</button>
    </div>
    <div class="format-tips" aria-hidden="true">
      <span class="format-tip-code">10m</span> låser tid &nbsp;·&nbsp;
      <span class="format-tip-code">%</span> fortsätter tills avbockad &nbsp;·&nbsp;
      <span class="format-tip-code">&amp;</span> kommentar
    </div>
  {/if}
</div>

<style>
  .seglist { display: flex; flex-direction: column; gap: 4px; }
  .empty-session { display:flex; flex-direction:column; gap:6px; padding:14px 12px; border:1px dashed var(--line); border-radius:8px; color:var(--muted); font-size:14px; line-height:1.35; }
  .empty-session strong { color:var(--text); font-size:15px; }
  .seglist .row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border-radius: 8px; font-size: 42px; font-weight: 400; line-height: 1.16; }
  .seglist .row.active { background: var(--pill); font-weight: 500; }
  .seglist .row.past { opacity: .45; }
  .seglist .row.armed {
    transform: scale(1.015);
    box-shadow: 0 6px 18px rgba(0,0,0,0.22);
    background: color-mix(in srgb, var(--pill) 70%, white 30%);
    z-index: 4; position: relative;
    transition: transform .15s ease-out, box-shadow .15s ease-out;
  }
  :global(body.dark) .seglist .row.armed {
    background: color-mix(in srgb, var(--pill) 60%, black 40%);
  }
  .drag-drop-line {
    height: 0; border-top: 2px solid var(--muted);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--muted) 20%, transparent);
    margin: 2px 8px; pointer-events: none;
  }
  @media (hover: none) {
    .seglist .row {
      -webkit-user-select: none;
      user-select: none;
      -webkit-touch-callout: none;
    }
    .seglist .dot.drag-handle {
      width: 28px; height: 28px; margin-top: 14px;
      touch-action: pinch-zoom;
      cursor: grab;
    }
    .seglist .row.armed .dot.drag-handle { cursor: grabbing; }
  }
  .seglist .dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; margin-top: 17px; }
  .seglist .name {
    flex: 1; overflow: hidden; overflow-wrap: break-word; white-space: normal; cursor: text;
    color: var(--sidebar-heading);
  }
  .seglist .min { color: var(--sidebar-subheading); font-variant-numeric: tabular-nums; font-size: 20px; font-weight: 500; min-width: 4ch; text-align: right; flex-shrink: 0; margin-top: 4px; cursor: text; }
  .seg-inline-btn { background: transparent; border: 0; padding: 0; font: inherit; text-align: left; }
  .seg-done-btn { background: color-mix(in srgb, var(--accent) 5%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--menu-border)); border-radius: 6px; padding: 2px 7px; font-size: 14px; color: color-mix(in srgb, var(--accent) 45%, var(--menu-muted)); cursor: pointer; flex-shrink: 0; margin-left: auto; transition: background 0.15s, color 0.15s, border-color 0.15s; }
  .seg-done-btn:hover { background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); border-color: var(--accent); }
  .seg-done-btn.checked { color: var(--accent); border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
  .row.done { opacity: 0.5; }
  .seglist .inline-edit {
    background: transparent; border: none; border-bottom: 1px solid var(--muted);
    color: var(--fg); font: inherit; padding: 0; outline: none; min-width: 0;
  }
  .seglist .name-inp { flex: 1; font-size: inherit; font-weight: inherit; }
  .seglist .min-inp { width: 5ch; text-align: right; font-size: 20px; font-variant-numeric: tabular-nums; color: var(--muted); font-weight: 500; flex-shrink: 0; margin-top: 4px; }
  .grip-icon {
    flex-shrink: 0;
    width: 10px;
    height: 18px;
    margin-top: 15px;
    background:
      radial-gradient(circle, var(--muted) 1.4px, transparent 1.4px) 0 0 / 5px 6px,
      radial-gradient(circle, var(--muted) 1.4px, transparent 1.4px) 5px 0 / 5px 6px;
    background-repeat: repeat-y;
    opacity: 0.32;
    cursor: grab;
    touch-action: pinch-zoom;
    transition: opacity .15s;
  }
  .row:hover .grip-icon { opacity: 0.55; }
  .row.armed .grip-icon { cursor: grabbing; opacity: 0.75; }
  :global(body.run-mode) .grip-icon { display: none; }
  .seg-add-btn {
    display: block; width: 100%; margin-top: 4px; padding: 6px 10px;
    background: none; border: 0; border-radius: 8px;
    color: var(--muted); font-size: 13px; cursor: pointer; text-align: center;
    transition: opacity .12s; opacity: .58;
  }
  .seg-add-btn:hover { opacity: .9; }
  :global(body.run-mode) .seg-add-btn { opacity: .22; }
  .sidebar-add-row { display: flex; gap: 8px; margin-top: 4px; }
  .sidebar-add-row .seg-add-btn { flex: 1; }
  .format-tips {
    margin-top: 10px;
    padding: 6px 8px;
    font-size: 11px;
    line-height: 1.5;
    color: color-mix(in srgb, var(--muted) 70%, var(--fg) 30%);
    opacity: 0.7;
    text-align: center;
  }
  .format-tip-code {
    font-family: ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    background: color-mix(in srgb, var(--muted) 12%, transparent);
    border-radius: 3px;
    padding: 1px 4px;
  }
  :global(body.run-mode) .format-tips { display: none; }
  .seglist .note { color: var(--sidebar-subheading); font-size: 33px; line-height: 1.2; padding: 0 12px 8px 50px; white-space: pre-wrap; }
  
  .note-line { display: flex; align-items: flex-start; gap: 10px; }
  .note-line .check-btn {
    flex-shrink: 0; margin-top: 5px; padding: 0; font-family: inherit;
    background: transparent; border: 2px solid currentColor; border-radius: 6px;
    color: inherit; opacity: 0; width: 26px; height: 26px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 18px; font-weight: bold; transition: opacity 0.25s ease;
  }
  .note-line:hover .check-btn { opacity: 0.4; }
  .note-line .check-btn:hover, .note-line .check-btn.revealed { opacity: 1 !important; }

  .title-check-btn {
    flex-shrink: 0; margin-top: 10px; margin-right: 4px; padding: 0; font-family: inherit;
    background: transparent; border: 2px solid currentColor; border-radius: 8px;
    color: inherit; opacity: 0; width: 30px; height: 30px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 22px; font-weight: bold; transition: opacity 0.25s ease;
  }
  .row:hover .title-check-btn { opacity: 0.4; }
  .title-check-btn:hover, .title-check-btn.revealed { opacity: 1 !important; }
  .title-check-btn.seg-done-control { opacity: 0.35; }
  .title-check-btn.done-checked { opacity: 1; color: var(--accent); border-color: var(--accent); }

  .seglist .infobox { margin-top: 18px; padding: 16px 18px; border-radius: 12px; background: #ffffff; color: #1a1410; border: 1px solid #b8b0a4; font-size: 26px; line-height: 1.35; white-space: pre-wrap; font-style: italic; }
  :global(.dark) .seglist .infobox { background: #ececec; color: #000000; border: none; }
  .infobox-list { display: flex; flex-direction: column; gap: 6px; }
  .infobox-list .infobox { margin-top: 0; }
  .infobox-list .infobox:first-child { margin-top: 18px; }
  .seglist .infobox.prominent {
    background: color-mix(in srgb, var(--muted) 22%, #ffffff);
    border-left: 5px solid var(--muted);
    font-weight: 500;
    font-style: normal;
  }
  :global(.dark) .seglist .infobox.prominent {
    background: color-mix(in srgb, var(--muted) 28%, #ececec);
    border-left: 5px solid var(--muted);
  }
  
  :global(del) {
    text-decoration: none;
    background-image: linear-gradient(color-mix(in srgb, currentColor, #000 25%), color-mix(in srgb, currentColor, #000 25%));
    background-position: center 60%;
    background-size: 100% 0.08em;
    background-repeat: no-repeat;
    padding: 0 0.18em;
    margin: 0 -0.18em;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  :global(.dark del) {
    background-image: linear-gradient(color-mix(in srgb, currentColor, #fff 25%), color-mix(in srgb, currentColor, #fff 25%));
  }

  @media (max-width: 800px) {
    .seglist .row { font-size: 20px; padding: 6px 8px; gap: 8px; }
    .seglist .dot { width: 12px; height: 12px; margin-top: 10px; }
    .seglist .min { font-size: 16px; margin-top: 2px; }
    .seglist .note { font-size: 15px; padding: 0 8px 6px 36px; }
    .seglist .infobox { font-size: 16px; padding: 12px 14px; margin-top: 12px; }
  }
  @media (hover: none) and (pointer: coarse) {
    .seglist .row { font-size: clamp(26px, 5.5cqi, 42px); gap: 8px; }
    .seglist .min { font-size: clamp(14px, 2.4cqi, 20px); }
    .seglist .note { font-size: clamp(18px, 3.8cqi, 33px); }
    .seglist .infobox { font-size: clamp(16px, 3.4cqi, 26px); }
    .grip-icon { margin-top: 11px; width: 12px; height: 20px; }
    .format-tips { font-size: 10px; }
  }
</style>
