<script lang="ts">
  import { clockTheme, type Palette } from '$lib/theme.js';
  import { uid, type Block } from '$lib/state.svelte.js';

  interface Props {
    blocks: Block[];
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
  }

  let {
    blocks = $bindable(),
    palette,
    dark,
    segMinutesMode,
    showSegNotes,
    showExtraInfo,
    extraInfo = $bindable(),
    isViewMode,
    elapsedMin,
    agendaView,
    onCommitEdit
  }: Props = $props();

  let editingBlockId = $state<string | null>(null);
  let editingBlockField = $state<'name' | 'min' | 'note' | 'extra' | null>(null);

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
    
    // Handle & (Extra Info)
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

    // Handle time suffix (e.g. 10m)
    const mMatch = val.match(/\s+(\d+)m$/i);
    if (mMatch) {
      b.minutes = Math.max(1, parseInt(mMatch[1], 10));
      b.pinned = true;
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
</script>

<div id="sidebar-blocks" class="seglist">
  {#if agendaView === 'private' && !isViewMode}
    <div style="margin-bottom: 8px; align-self: flex-end;">
      <span class="agenda-mode-badge">Eget</span>
    </div>
  {/if}
  {#each blocks as b, i (b.id)}
    {@const ct = clockTheme(palette, dark)}
    {@const cumMin = blocks.slice(0, i).reduce((a: number, x: Block) => a + x.minutes, 0)}
    {@const segEnd = cumMin + b.minutes}
    {@const isActive = elapsedMin >= cumMin && elapsedMin < segEnd}
    {@const isPast = elapsedMin >= segEnd}
    <div class="row" class:active={isActive} class:past={isPast}>
      <span class="dot" style="background:{ct.colors[i % 8]}"></span>
      {#if editingBlockId === b.id && editingBlockField === 'name'}
        <input class="inline-edit name-inp" use:focusOnMount
          value={b.title}
          onblur={(e) => handleSidebarNameBlur(b, (e.target as HTMLInputElement).value)}
          onkeydown={(e) => handleSidebarNameKeydown(e, b)}
          onclick={(e) => e.stopPropagation()} />
      {:else}
        <button class="name seg-inline-btn" type="button" onclick={() => startBlockEdit(b.id, 'name')}>{b.title}</button>
      {/if}
      {#if editingBlockId === b.id && editingBlockField === 'min'}
        <input class="inline-edit min-inp" type="number" min="1" use:focusOnMount
          value={b.minutes}
          onblur={(e) => { const v = parseInt((e.target as HTMLInputElement).value); if (v > 0) { b.minutes = v; b.pinned = true; } commitEdit(); }}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
          onclick={(e) => e.stopPropagation()} />
      {:else if segMinutesMode === 'planned'}
        <button class="min seg-inline-btn" type="button" onclick={() => startBlockEdit(b.id, 'min')}>{b.minutes}m</button>
      {:else if segMinutesMode === 'remaining'}
        <button class="min seg-inline-btn" type="button" onclick={() => startBlockEdit(b.id, 'min')}>{isPast ? 0 : isActive ? Math.max(0, Math.ceil(segEnd - elapsedMin)) : b.minutes}m kvar</button>
      {/if}
    </div>
    {#if showSegNotes}
      {#if editingBlockId === b.id && editingBlockField === 'note'}
        <textarea class="inline-edit note note-inp" use:focusOnMount
          onblur={(e) => handleSidebarNoteBlur(b, (e.target as HTMLTextAreaElement).value)}
          onkeydown={(e) => handleSidebarNoteKeydown(e, b)}
          onclick={(e) => e.stopPropagation()}>{b.note}</textarea>
      {:else if b.note}
        <button class="note seg-inline-btn" type="button" onclick={() => startBlockEdit(b.id, 'note')}>{b.note}</button>
      {/if}
    {/if}
  {/each}
  {#if showExtraInfo}
    {#if editingBlockField === 'extra'}
      <textarea class="inline-edit infobox extra-inp" use:focusOnMount
        onblur={(e) => handleSidebarExtraBlur((e.target as HTMLTextAreaElement).value)}
        onkeydown={(e) => handleSidebarExtraKeydown(e)}
        onclick={(e) => e.stopPropagation()}>{extraInfo}</textarea>
    {:else if extraInfo}
      <button class="infobox seg-inline-btn" type="button" onclick={startExtraEdit}>{extraInfo}</button>
    {/if}
  {/if}
  {#if !isViewMode}
    <div class="sidebar-add-row">
      <button class="seg-add-btn" onclick={addBlock}>+</button>
    </div>
  {/if}
</div>

<style>
  .seglist { display: flex; flex-direction: column; gap: 4px; }
  .seglist .row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border-radius: 8px; font-size: 50px; font-weight: 400; line-height: 1.2; }
  .seglist .row.active { background: var(--pill); font-weight: 500; }
  .seglist .row.past { opacity: .45; }
  .seglist .dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; margin-top: 22px; }
  .seglist .name {
    flex: 1; overflow: hidden; overflow-wrap: break-word; white-space: normal; cursor: text;
    color: var(--sidebar-heading);
  }
  .seglist .min { color: var(--sidebar-subheading); font-variant-numeric: tabular-nums; font-size: 20px; font-weight: 500; min-width: 4ch; text-align: right; flex-shrink: 0; margin-top: 4px; cursor: text; }
  .seg-inline-btn { background: transparent; border: 0; padding: 0; font: inherit; text-align: left; }
  .seglist .inline-edit {
    background: transparent; border: none; border-bottom: 1px solid var(--muted);
    color: var(--fg); font: inherit; padding: 0; outline: none; min-width: 0;
  }
  .seglist .name-inp { flex: 1; font-size: inherit; font-weight: inherit; }
  .seglist .min-inp { width: 5ch; text-align: right; font-size: 20px; font-variant-numeric: tabular-nums; color: var(--muted); font-weight: 500; flex-shrink: 0; margin-top: 4px; }
  .seg-add-btn {
    display: block; width: 100%; margin-top: 4px; padding: 6px 10px;
    background: none; border: 1px dashed var(--border); border-radius: 8px;
    color: var(--muted); font-size: 13px; cursor: pointer; text-align: center;
    transition: opacity .12s; opacity: .38;
  }
  .seg-add-btn:hover { opacity: .8; }
  .sidebar-add-row { display: flex; gap: 8px; margin-top: 4px; }
  .sidebar-add-row .seg-add-btn { flex: 1; }
  .seglist .note { color: var(--sidebar-subheading); font-size: 33px; line-height: 1.2; padding: 0 12px 8px 50px; white-space: pre-wrap; }
  .seglist .infobox { margin-top: 18px; padding: 16px 18px; border-radius: 12px; background: #ffffff; color: #1a1410; border: 1px solid #b8b0a4; font-size: 26px; line-height: 1.35; white-space: pre-wrap; font-style: italic; }
  :global(.dark) .seglist .infobox { background: #ececec; color: #000000; border: none; }

  @media (max-width: 800px) {
    .seglist .row { font-size: 20px; padding: 6px 8px; gap: 8px; }
    .seglist .dot { width: 12px; height: 12px; margin-top: 10px; }
    .seglist .min { font-size: 16px; margin-top: 2px; }
    .seglist .note { font-size: 15px; padding: 0 8px 6px 36px; }
    .seglist .infobox { font-size: 16px; padding: 12px 14px; margin-top: 12px; }
  }
</style>
