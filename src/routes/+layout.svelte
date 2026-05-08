<script lang="ts">
  let { children } = $props();
</script>

<svelte:head>
  <title>Lektionsklocka</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</svelte:head>

{@render children()}

<style>
  :global(*) { box-sizing: border-box; }
  :global(html, body) {
    margin: 0; padding: 0;
    background: var(--bg); color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    transition: background .3s, color .3s;
  }
  :global(body) { min-height: 100vh; display: flex; }

  :global(:root) {
    --bg: #f4f1de; --fg: #3d405b; --panel: #ece9d5; --border: #c8c5b5;
    --muted: #81b29a; --accent: #e07a5f; --pill: #e8e5d8;
    --pill-on: #3d405b; --pill-on-fg: #f4f1de; --void: #3d405b;
    --menu-panel: #fcfaf5; --menu-surface: #f1ebdf; --menu-border: #d0c6b5;
    --menu-fg: #3a352e; --menu-muted: #6e665b; --menu-pill: #ece4d6;
    --menu-pill-on: #3a352e; --menu-pill-on-fg: #fbf7ef;
  }
  :global(body.dark:not(.psychedelic)) {
    --bg: #1c1a16; --fg: #ede8dc; --panel: #26231e; --border: #3c3830;
    --muted: #8a8478; --accent: #ede8dc; --pill: #2e2b26;
    --pill-on: #ede8dc; --pill-on-fg: #1c1a16; --void: #0e0d0b;
  }
  :global(.meadow) {
    --bg: #f4f1de; --fg: #2a3a10; --panel: #e5e8d0; --border: #a8c080;
    --muted: #5c8001; --accent: #fb6107; --pill: #e5e8d8;
    --pill-on: #5c8001; --pill-on-fg: #f4f1de; --void: #2a3a10;
  }
  :global(.mlp) {
    --bg: #fff5fb; --fg: #5a3070; --panel: #f8eaf8; --border: #d4a0e8;
    --muted: #8080b0; --accent: #ffafcc; --pill: #f0e0f8;
    --pill-on: #cdb4db; --pill-on-fg: #5a3070; --void: #5a3070;
  }
  :global(.bright) {
    --bg: #f4f1de; --fg: #1a0820; --panel: #e8e5d8; --border: #c0a0b8;
    --muted: #662e9b; --accent: #f86624; --pill: #e8e5d8;
    --pill-on: #662e9b; --pill-on-fg: #f4f1de; --void: #1a0820;
  }
  :global(.clear) {
    --bg: #f9f2ee; --fg: #5f0f40; --panel: #ede5e0; --border: #c09888;
    --muted: #0f4c5c; --accent: #fb8b24; --pill: #ede5e0;
    --pill-on: #5f0f40; --pill-on-fg: #f9f2ee; --void: #5f0f40;
  }
  :global(.psychedelic) {
    --bg: #ff00ff; --fg: #ffffff; --panel: rgba(255,255,0,0.12); --border: #ff00ff;
    --muted: #ffff00; --accent: #ff00ff; --pill: rgba(0,255,255,0.15);
    --pill-on: #ffff00; --pill-on-fg: #000000; --void: #050010;
  }
  :global(body.psychedelic) {
    background: linear-gradient(135deg,#ff00cc 0%,#00e5ff 28%,#fff35c 62%,#6a00ff 100%);
    background-size: 220% 220%;
    animation: psychedelic-bg-shift 16s ease-in-out infinite;
  }
  :global(body.psychedelic .sidebar) { background: rgba(0,0,20,0.45); backdrop-filter: blur(6px); }
  :global(.theme-dots) {
    position: fixed; top: 10px; right: 10px; z-index: 55;
    display: flex; gap: 7px; align-items: center;
  }
  :global(.theme-dot) { width: 9px; height: 9px; border-radius: 50%; border: 0; padding: 0; opacity: 0.3; cursor: pointer; transition: opacity .2s; }
  :global(.theme-dot:hover) { opacity: 0.7; }
  :global(.theme-dot.active) { opacity: 0.9; }
  :global(#darkToggle) { width: 14px; height: 9px; border-radius: 5px; border: 0; padding: 0; background: var(--fg); opacity: 0.2; cursor: pointer; transition: opacity .2s; font-size: 7px; color: var(--bg); display: flex; align-items: center; justify-content: center; }
  :global(#darkToggle:hover) { opacity: 0.6; }
  :global(#darkToggle.active) { opacity: 0.55; }
  :global(body.dark .theme-dot), :global(body.psychedelic .theme-dot) { opacity: 0.45; }
  :global(body.dark .theme-dot:hover), :global(body.psychedelic .theme-dot:hover) { opacity: 0.9; }
  :global(body.dark .theme-dot.active), :global(body.psychedelic .theme-dot.active) { opacity: 1; }
  :global(body.dark #darkToggle), :global(body.psychedelic #darkToggle) { opacity: 0.4; }
  :global(body.dark #darkToggle:hover), :global(body.psychedelic #darkToggle:hover) { opacity: 0.85; }
  :global(.app) { display: flex; width: 100%; height: 100vh; overflow: hidden; }
  :global(.sidebar), :global(.main) { scrollbar-width: none; }
  :global(.sidebar::-webkit-scrollbar), :global(.main::-webkit-scrollbar), :global(.agenda::-webkit-scrollbar) { display: none; }
  :global(.sidebar) { width: 260px; min-width: 160px; max-width: 720px; background: var(--panel); border-right: 1px solid var(--border); padding: 20px 16px; position: relative; transition: margin-left .25s ease; overflow-y: auto; flex-shrink: 0; height: 100%; }
  :global(.main) { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 16px; gap: 8px; position: relative; overflow-y: auto; height: 100%; }
  :global(body.sb-collapsed .sidebar) { margin-left: calc(-1 * var(--sb-w, 260px)); }
:global(.seglist) { display: flex; flex-direction: column; gap: 4px; }
  :global(.seglist .row) { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border-radius: 8px; font-size: 29px; font-weight: 400; line-height: 1.2; }
  :global(.seglist .row.active) { background: var(--pill); font-weight: 500; }
  :global(.seglist .row.past) { opacity: .45; }
  :global(.seglist .dot) { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
  :global(.seglist .name) { flex: 1; overflow: hidden; overflow-wrap: break-word; white-space: normal; }
  :global(.seglist .min) { color: var(--muted); font-variant-numeric: tabular-nums; font-size: 20px; font-weight: 500; min-width: 4ch; text-align: right; flex-shrink: 0; margin-top: 4px; }
  :global(.seglist .note) { color: var(--muted); font-size: 22px; line-height: 1.2; padding: 0 12px 8px 50px; white-space: pre-wrap; }
  :global(.seglist .infobox) { margin-top: 18px; padding: 16px 18px; border-radius: 12px; background: #ffffff; color: #1a1410; border: 1px solid #b8b0a4; font-size: 26px; line-height: 1.35; white-space: pre-wrap; font-style: italic; }
  :global(.dark .seglist .infobox) { background: #ececec; color: #000000; border: none; }
  :global(.collapse-btn) { position: fixed; top: 50%; left: calc(var(--sb-w, 260px) - 14px); transform: translateY(-50%); width: 28px; height: 28px; border-radius: 50%; background: var(--panel); color: var(--fg); border: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; z-index: 50; transition: left .25s ease; }
  :global(body.sb-collapsed .collapse-btn) { left: 8px; }
  :global(.resize-handle-sb), :global(.resize-handle-ag) {
    width: 5px; cursor: ew-resize; flex-shrink: 0; height: 100%;
    background: transparent; transition: background .15s; z-index: 5;
  }
  :global(.resize-handle-sb:hover), :global(.resize-handle-ag:hover) { background: var(--border); }
  :global(.main-header) { position: relative; width: 100%; }
  :global(.lesson-title) { position: absolute; left: 16px; top: 0; font-size: 72px; font-weight: 200; line-height: 1; letter-spacing: -2px; color: var(--fg); max-width: 38%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  :global(.top-time) { text-align: center; }
  :global(.top-time .now) { font-size: 72px; font-weight: 200; letter-spacing: -2px; line-height: 1; font-variant-numeric: tabular-nums; }
  :global(.top-time .left) { font-size: 20px; color: var(--muted); margin-top: 6px; transition: opacity .2s; font-variant-numeric: tabular-nums; font-weight: 500; }
  :global(.clock-wrap) { position: relative; }
  :global(svg.clock) { display: block; user-select: none; touch-action: none; overflow: visible; width: min(85vh, 50vw); height: min(85vh, 50vw); }
  :global(.toolbar) { display: flex; align-items: center; gap: 8px; background: transparent; border: 0; border-radius: 999px; padding: 4px 6px; position: relative; opacity: 0.55; transition: opacity .2s; }
  :global(.toolbar:hover) { opacity: 1; }
  :global(.toolbar button.icon) { background: transparent; border: 0; color: var(--muted); cursor: pointer; font-size: 16px; padding: 4px 8px; border-radius: 999px; font-family: "Segoe UI Symbol", "Apple Symbols", system-ui, sans-serif; font-variant-emoji: text; }
  :global(.toolbar button.icon:hover) { background: var(--pill); color: var(--fg); }
  :global(.toolbar-spacer) { flex: 1; min-width: 4px; }
  :global(.toolbar .clock-span-btn) { font-size: 12px; font-weight: 700; letter-spacing: -.3px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; min-width: 30px; text-align: center; border: 1px solid var(--border); background: var(--pill); color: var(--fg); opacity: 1; }
  :global(.toolbar .clock-span-btn:hover) { background: var(--pill-on); color: var(--pill-on-fg); }
  :global(.toolbar .clock-span-btn.active) { background: var(--pill-on); color: var(--pill-on-fg); border-color: var(--pill-on); }
  :global(.warn-dots) { display: flex; gap: 4px; padding: 0 6px; border-left: 1px solid var(--border); }
  :global(.warn-dots .wd) { width: 16px; height: 16px; border-radius: 50%; border: 2px solid currentColor; cursor: pointer; background: transparent; color: var(--border); padding: 0; }
  :global(.warn-dots .wd.on) { background: currentColor; }
  :global(.popover) { position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%); background: var(--menu-panel); border: 1px solid var(--menu-border); border-radius: 14px; padding: 12px; display: none; flex-direction: column; gap: 6px; min-width: 200px; color: var(--menu-fg); box-shadow: 0 8px 24px rgba(0,0,0,.15); z-index: 10; }
  :global(.popover.open) { display: flex; }
  :global(.pill) { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 999px; background: var(--menu-pill); color: var(--menu-fg); cursor: pointer; font-size: 13px; border: 0; }
  :global(.pill.on) { background: var(--menu-pill-on); color: var(--menu-pill-on-fg); }
  :global(.controls) { background: var(--menu-panel); border: 1px solid var(--menu-border); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 12px; width: min(360px, 100%); color: var(--menu-fg); }
  :global(.controls label) { font-size: 12px; color: var(--menu-muted); text-transform: uppercase; letter-spacing: .5px; font-weight: 600; }
  :global(.controls input[type=text]), :global(.controls input[type=time]), :global(.controls input[type=number]), :global(.controls textarea) { background: var(--menu-surface); color: var(--menu-fg); border: 1px solid var(--menu-border); border-radius: 8px; padding: 8px 10px; font-size: 14px; width: 100%; font-family: inherit; }
  :global(.controls textarea) { min-height: 100px; resize: vertical; line-height: 1.4; }
  :global(.row2) { display: flex; gap: 8px; }
  :global(.row2 > div) { flex: 1; }
  :global(.mode-toggle) { display: flex; gap: 4px; background: var(--menu-surface); border-radius: 8px; padding: 3px; border: 1px solid var(--menu-border); }
  :global(.mode-toggle button) { flex: 1; padding: 6px; border: 0; background: transparent; color: var(--menu-fg); cursor: pointer; border-radius: 6px; font-size: 13px; }
  :global(.mode-toggle button.on) { background: var(--menu-pill-on); color: var(--menu-pill-on-fg); }
  :global(.feedback) { font-size: 12px; color: var(--menu-muted); margin-top: 2px; font-variant-numeric: tabular-nums; }
  :global(.quickstart) { background: var(--menu-pill); color: var(--menu-fg); border: 1px solid var(--menu-border); border-radius: 999px; padding: 10px 16px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; transition: background .15s; }
  :global(.quickstart:hover) { background: #e2d8c8; }
  :global(#quickStartBtn) { background: var(--menu-pill-on); color: var(--menu-pill-on-fg); border-color: var(--menu-pill-on); font-weight: 600; padding: 12px 16px; font-size: 15px; }
  :global(#quickStartBtn:hover) { background: #26221d; border-color: #26221d; }
  :global(.flows) { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--menu-border); }
  :global(.flow-list) { display: flex; flex-direction: column; gap: 4px; }
  :global(.flow-item) { display: flex; align-items: center; gap: 8px; background: var(--menu-pill); border-radius: 8px; padding: 4px 4px 4px 12px; }
  :global(.flow-item .flow-name) { flex: 1; background: transparent; border: 0; color: var(--menu-fg); cursor: pointer; text-align: left; padding: 8px 0; font-size: 15px; font-family: inherit; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  :global(.flow-item .flow-name:hover) { text-decoration: underline; }
  :global(.flow-item .flow-del) { background: transparent; border: 0; color: var(--menu-muted); cursor: pointer; font-size: 14px; padding: 6px 10px; border-radius: 6px; flex-shrink: 0; font-family: "Segoe UI Symbol", "Apple Symbols", system-ui, sans-serif; font-variant-emoji: text; }
  :global(.flow-item .flow-del:hover) { background: #e7ddcf; color: var(--menu-fg); }
  :global(.sync-section) { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--menu-border); }
  :global(.sync-input) { width: 100%; padding: 9px 12px; border: 1px solid var(--menu-border); border-radius: 8px; background: var(--menu-surface); color: var(--menu-fg); font-size: 15px; font-family: inherit; }
  :global(.sync-input:focus) { outline: 2px solid #4a443c; outline-offset: 1px; }
  :global(.sync-row) { display: flex; gap: 8px; }
  :global(.sync-btn) { flex: 1; font-size: 14px; }
  :global(.sync-status) { font-size: 13px; color: var(--menu-muted); min-height: 18px; }
  /* ── Agenda panel ── */
  :global(.agenda) {
    width: 280px; min-width: 160px; max-width: 720px; background: var(--panel);
    border-left: 1px solid var(--border); padding: 20px 14px;
    display: flex; flex-direction: column;
    overflow: hidden; flex-shrink: 0; transition: margin-right .25s ease; height: 100%;
    scrollbar-width: none;
  }
  :global(body:not(.ag-open) .agenda) { margin-right: calc(-1 * var(--ag-w, 280px)); }
  :global(.agenda-toggle-btn) {
    position: fixed; top: 50%; right: calc(var(--ag-w, 280px) - 14px);
    transform: translateY(-50%); width: 28px; height: 28px; border-radius: 50%;
    background: var(--panel); color: var(--fg); border: 1px solid var(--border);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 600; z-index: 50; transition: right .25s ease;
  }
  :global(body:not(.ag-open) .agenda-toggle-btn) { right: 8px; }
  :global(.agenda-timeline) {
    flex: 1; min-height: 0; position: relative; overflow: hidden;
  }
  :global(.agenda-block) {
    position: absolute; left: 0; right: 0;
    border-radius: 0 8px 8px 0; border-left: 11px solid transparent;
    padding: 2px 8px; cursor: pointer; overflow: hidden;
    transition: background .12s; user-select: none; box-sizing: border-box;
    display: flex; align-items: center; gap: 6px;
  }
  :global(.agenda-block:hover) { background: var(--pill); }
  :global(.agenda-block.active) { background: var(--pill); }
  :global(.agenda-block.past) { opacity: .4; }
  :global(.agenda-drag-edge) {
    position: absolute; left: 0; right: 0; height: 14px;
    transform: translateY(-7px); cursor: ns-resize; z-index: 5;
    border-radius: 3px; transition: background .15s; touch-action: none;
  }
  :global(.agenda-drag-edge:hover), :global(.agenda-drag-edge.dragging) {
    background: var(--border); opacity: .6;
  }
  :global(.agenda-time) { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; font-weight: 500; flex-shrink: 0; }
  :global(.agenda-name) { flex: 1; font-size: 15px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  :global(.agenda-dur) { font-size: 12px; color: var(--muted); flex-shrink: 0; }
  :global(.agenda-empty) { font-size: 13px; color: var(--muted); font-style: italic; line-height: 1.5; padding: 4px 2px; }
  :global(.agenda-input) {
    width: 100%; min-height: 120px; resize: vertical;
    background: var(--menu-surface); color: var(--menu-fg);
    border: 1px solid var(--menu-border); border-radius: 8px;
    padding: 8px 10px; font-size: 13px; font-family: ui-monospace, monospace;
    line-height: 1.5; margin-bottom: 12px;
  }
  :global(.agenda-input::placeholder) { color: var(--muted); opacity: .6; }
  :global(.agenda-nav) { display: flex; align-items: center; gap: 4px; margin-bottom: 10px; }
  :global(.agenda-nav-btn) { background: transparent; border: 0; color: var(--muted); cursor: pointer; font-size: 18px; padding: 2px 8px; border-radius: 6px; line-height: 1; }
  :global(.agenda-nav-btn:hover:not(:disabled)) { background: var(--pill); color: var(--fg); }
  :global(.agenda-nav-btn:disabled) { opacity: .25; cursor: default; }
  :global(.agenda-date-label) { flex: 1; text-align: center; font-size: 13px; font-weight: 600; color: var(--fg); }
  :global(.agenda-input-header) { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  :global(.agenda-input-label) { flex: 1; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); }
  :global(.agenda-input-toggle) { background: transparent; border: 0; color: var(--muted); cursor: pointer; font-size: 12px; padding: 2px 7px; border-radius: 5px; font-family: inherit; }
  :global(.agenda-input-toggle:hover) { background: var(--pill); color: var(--fg); }
  :global(.agenda-save-btn) { width: 100%; padding: 7px; background: var(--pill); border: 1px solid var(--border); border-radius: 8px; color: var(--fg); font-size: 13px; cursor: pointer; margin-top: 4px; margin-bottom: 12px; font-family: inherit; transition: background .12s; }
  :global(.agenda-save-btn:hover) { background: var(--pill-on); color: var(--pill-on-fg); }
  :global(.login-form) { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--menu-border); }
  :global(.logged-in-row) { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  :global(.logged-in-row .username) { flex: 1; font-weight: 600; color: var(--menu-fg); }
  :global(.logout-btn) { background: transparent; border: 1px solid var(--menu-border); border-radius: 6px; padding: 4px 10px; font-size: 12px; color: var(--menu-muted); cursor: pointer; font-family: inherit; }
  :global(.logout-btn:hover) { background: var(--menu-surface); color: var(--menu-fg); }
  /* ── Mobilflikar ── */
  :global(.mobile-tabs) { display: none; }
  @media (max-width: 800px) {
    :global(.agenda) { display: none; }
    :global(.agenda-toggle-btn) { display: none; }
    :global(.collapse-btn) { display: none; }
    :global(.mobile-tabs) {
      display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 60;
      background: var(--panel); border-top: 1px solid var(--border);
      height: 52px;
    }
    :global(.mobile-tabs button) {
      flex: 1; background: transparent; border: 0; color: var(--muted);
      font-size: 11px; font-weight: 600; cursor: pointer; display: flex;
      flex-direction: column; align-items: center; justify-content: center;
      gap: 2px; font-family: inherit; padding: 4px 0;
    }
    :global(.mobile-tabs button span) {
      font-size: 18px; line-height: 1;
      font-family: "Segoe UI Symbol", "Apple Symbols", system-ui, sans-serif;
      font-variant-emoji: text;
    }
    :global(.mobile-tabs button.active) { color: var(--fg); }
    :global(.mobile-tabs button.active span) { color: var(--accent); }
    /* Visa rätt sektion beroende på aktiv flik */
    :global(body.m-timer .sidebar) { display: none; }
    :global(body.m-timer .resize-handle-sb) { display: none; }
    :global(body.m-delar .main) { display: none; }
    :global(body.m-delar .resize-handle-sb) { display: none; }
    :global(body.m-plan .main) { display: none; }
    :global(body.m-plan .sidebar) { display: none; }
    :global(body.m-plan .resize-handle-sb) { display: none; }
    :global(body.m-plan .agenda) { display: flex !important; width: 100%; max-width: 100%; border-left: none; border-top: 1px solid var(--border); }
    /* Ge utrymme för flikraden */
    :global(body.m-timer .main), :global(body.m-delar .sidebar), :global(body.m-plan .agenda) {
      padding-bottom: 60px;
    }
  }

  :global(.flash) { position: fixed; inset: 0; pointer-events: none; background: #ffae00; opacity: 0; z-index: 100; transition: opacity .15s; }
  :global(.flash.on) { opacity: .35; }
  :global(.help-modal) { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
  :global(.help-modal.open) { display: flex; }
  :global(.help-card) { background: var(--panel); color: var(--fg); border: 1px solid var(--border); border-radius: 16px; padding: 28px 32px; max-width: 560px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; line-height: 1.45; }
  :global(.help-card h2) { margin: 0 0 14px; font-size: 24px; font-weight: 600; }
  :global(.help-card ul) { padding-left: 20px; margin: 0 0 14px; }
  :global(.help-card li) { margin-bottom: 10px; font-size: 15px; }
  :global(.help-card code) { background: var(--pill); padding: 1px 6px; border-radius: 4px; font-size: 13px; }
  :global(.help-foot) { font-size: 13px; color: var(--muted); margin: 0; }
  :global(.ico) { font-family: "Segoe UI Symbol", "Apple Symbols", system-ui, sans-serif; font-variant-emoji: text; font-weight: 500; padding: 0 2px; }
  :global(.help-card .ico) { color: var(--muted); }
  :global(.help-close) { position: absolute; top: 8px; right: 12px; background: transparent; border: 0; color: var(--fg); font-size: 28px; cursor: pointer; line-height: 1; }

  @media (max-width: 800px) {
    :global(.app) { flex-direction: column; height: auto; overflow: visible; }
    :global(.sidebar) { width: 100%; max-width: 100%; min-width: 0; height: auto; border-right: none; border-bottom: 1px solid var(--border); padding: 12px 14px; order: 2; }
    :global(.main) { height: auto; overflow: visible; }
    :global(body.sb-collapsed .sidebar) { margin-left: 0; padding: 0; border-bottom: none; max-height: 0; overflow: hidden; }
    :global(.seglist .row) { font-size: 20px; padding: 6px 8px; gap: 8px; }
    :global(.seglist .dot) { width: 12px; height: 12px; margin-top: 4px; }
    :global(.seglist .min) { font-size: 16px; margin-top: 2px; }
    :global(.resize-handle-sb), :global(.resize-handle-ag) { display: none; }
    :global(.seglist .note) { font-size: 15px; padding: 0 8px 6px 36px; }
    :global(.seglist .infobox) { font-size: 16px; padding: 12px 14px; margin-top: 12px; }
    :global(.main) { order: 1; padding: 8px 8px 64px; gap: 6px; }
    :global(.lesson-title) { position: static; font-size: 28px; letter-spacing: -1px; max-width: 100%; text-align: center; }
    :global(.top-time .now) { font-size: 40px; letter-spacing: -1px; }
    :global(.top-time .left) { font-size: 14px; }
    :global(svg.clock) { width: min(95vw, 70vh); height: min(95vw, 70vh); }
    :global(.controls) { width: 100%; max-width: 100%; }
  }

  @media (orientation: landscape) and (max-height: 500px) {
    :global(.app) { flex-direction: row; height: 100vh; overflow: hidden; }
    :global(.main) { padding: 6px; gap: 4px; }
    :global(svg.clock) { width: 48vh; height: 48vh; }
    :global(.top-time .now) { font-size: 28px; }
    :global(.top-time .left) { font-size: 12px; margin-top: 2px; }
    :global(.lesson-title) { font-size: 20px; }
    :global(.sidebar) { display: flex; width: 240px; min-width: 0; height: 100%; border-right: 1px solid var(--border); border-bottom: none; order: 0; padding: 8px 10px 60px; overflow-y: auto; }
    :global(.seglist .row) { font-size: 16px; padding: 4px 6px; }
    :global(.mobile-tabs) { flex-direction: column; width: 52px; height: 100%; border-top: none; border-right: 1px solid var(--border); bottom: 0; left: auto; right: 0; }
    :global(body.m-timer .sidebar), :global(body.m-delar .main) { display: flex; }
  }
</style>
