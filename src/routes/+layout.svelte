<script lang="ts">
  let { children } = $props();
</script>

<svelte:head>
  <title>Timer [BETA]</title>

</svelte:head>

{@render children()}

<style>
  :global(*) { box-sizing: border-box; }
  :global(html) { overscroll-behavior: none; }
  :global(html, body) {
    margin: 0; padding: 0;
    background: var(--bg); color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    transition: background .3s, color .3s;
  }
  :global(body) { min-height: 100vh; min-height: 100dvh; display: flex; overscroll-behavior: none; }

  :global(:root) {
    --bg: #f4f1de; --fg: #3d405b; --panel: #ece9d5; --border: #c8c5b5;
    --muted: #81b29a; --accent: #e07a5f; --pill: #e8e5d8;
    --pill-on: #3d405b; --pill-on-fg: #f4f1de; --void: #3d405b;
    --menu-panel: color-mix(in srgb, var(--panel), white 40%);
    --menu-surface: color-mix(in srgb, var(--panel), white 20%);
    --menu-border: color-mix(in srgb, var(--border), black 10%);
    --menu-fg: var(--fg);
    --menu-muted: var(--muted);
    --menu-pill: var(--pill);
    --menu-pill-on: var(--pill-on);
    --menu-pill-on-fg: var(--pill-on-fg);
    --sidebar-heading: var(--fg);
    --sidebar-subheading: color-mix(in srgb, var(--fg) 75%, var(--muted));
  }
  :global(body.dark:not(.psychedelic)) {
    --bg: #1c1a16; --fg: #ede8dc; --panel: #26231e; --border: #3c3830;
    --muted: #8a8478; --accent: #ede8dc; --pill: #2e2b26;
    --pill-on: #ede8dc; --pill-on-fg: #1c1a16; --void: #0e0d0b;
    --menu-panel: #211f1a; --menu-surface: #2a2722; --menu-border: #464138;
    --menu-fg: #f2ede2; --menu-muted: #c2bbad; --menu-pill: #343029;
    --menu-pill-on: #ede8dc; --menu-pill-on-fg: #1c1a16;
    --sidebar-heading: #d8d4ca;
    --sidebar-subheading: #bdb7ab;
  }
  :global(.meadow) {
    --bg: #f4f1de; --fg: #2a3a10; --panel: #e5e8d0; --border: #a8c080;
    --muted: #5c8001; --accent: #fb6107; --pill: #e5e8d8;
    --pill-on: #5c8001; --pill-on-fg: #f4f1de; --void: #2a3a10;
    --sidebar-heading: #3f5f0f;
    --sidebar-subheading: #54761a;
  }
  :global(.mlp) {
    --bg: #fff5fb; --fg: #5a3070; --panel: #f8eaf8; --border: #d4a0e8;
    --muted: #8080b0; --accent: #ffafcc; --pill: #f0e0f8;
    --pill-on: #cdb4db; --pill-on-fg: #5a3070; --void: #5a3070;
    --sidebar-heading: #6b3a84;
    --sidebar-subheading: #6f6fa2;
  }
  :global(.bright) {
    --bg: #f4f1de; --fg: #1a0820; --panel: #e8e5d8; --border: #c0a0b8;
    --muted: #662e9b; --accent: #f86624; --pill: #e8e5d8;
    --pill-on: #662e9b; --pill-on-fg: #f4f1de; --void: #1a0820;
    --sidebar-heading: #5f2f9c;
    --sidebar-subheading: #7a49b2;
  }
  :global(.clear) {
    --bg: #f9f2ee; --fg: #5f0f40; --panel: #ede5e0; --border: #c09888;
    --muted: #0f4c5c; --accent: #fb8b24; --pill: #ede5e0;
    --pill-on: #5f0f40; --pill-on-fg: #f9f2ee; --void: #5f0f40;
    --sidebar-heading: #6f1e4f;
    --sidebar-subheading: #2e5e6a;
  }
  :global(.vitgra) {
    --bg: #f7f7f7; --fg: #111111; --panel: #ececec; --border: #c8c8c8;
    --muted: #666666; --accent: #d33b3b; --pill: #e3e3e3;
    --pill-on: #111111; --pill-on-fg: #f7f7f7; --void: #111111;
    --sidebar-heading: #111111;
    --sidebar-subheading: #666666;
  }
  :global(.psychedelic) {
    --bg: #ff00ff; --fg: #ffffff; --panel: rgba(255,255,0,0.12); --border: #ff00ff;
    --muted: #ffff00; --accent: #ff00ff; --pill: rgba(0,255,255,0.15);
    --pill-on: #ffff00; --pill-on-fg: #000000; --void: #050010;
    --sidebar-heading: #ffffff;
    --sidebar-subheading: #ffff66;
  }
  :global(body.dark.vitgra) {
    --bg: #111111; --fg: #f3f3f3; --panel: #181818; --border: #383838;
    --muted: #a3a3a3; --accent: #e34d4d; --pill: #242424;
    --pill-on: #e34d4d; --pill-on-fg: #111111; --void: #070707;
    --menu-panel: #161616; --menu-surface: #1f1f1f; --menu-border: #3c3c3c;
    --menu-fg: #f3f3f3; --menu-muted: #b5b5b5; --menu-pill: #292929;
    --menu-pill-on: #e34d4d; --menu-pill-on-fg: #111111;
    --sidebar-heading: #ff6a6a;
    --sidebar-subheading: #c0c0c0;
  }
  :global(body.psychedelic) {
    background: linear-gradient(135deg,#ff00cc 0%,#00e5ff 28%,#fff35c 62%,#6a00ff 100%);
    background-size: 220% 220%;
    animation: psychedelic-bg-shift 16s ease-in-out infinite;
  }
  :global(body.psychedelic .sidebar) { background: rgba(0,0,20,0.45); backdrop-filter: blur(6px); }
  :global(.app) { display: flex; width: 100%; height: 100vh; height: 100dvh; overflow: hidden; }
  :global(.sidebar), :global(.main) { scrollbar-width: none; }
  :global(.sidebar::-webkit-scrollbar), :global(.main::-webkit-scrollbar) { display: none; }
  :global(.sidebar) { width: 400px; min-width: 160px; max-width: 720px; background: var(--panel); border-right: 1px solid var(--border); padding: 20px 16px; position: relative; transition: margin-left .25s ease; overflow-y: auto; flex-shrink: 0; height: 100%; line-height: 1; }
  :global(.main) { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 0 16px 16px; gap: 8px; position: relative; overflow-y: auto; height: 100%; container-type: inline-size; }
  :global(body.sb-collapsed .sidebar) { margin-left: calc(-1 * var(--sb-w, 400px)); }
  :global(.comment-add-btn) { font-size: 15px; }
  :global(.sidebar-comment-head) { margin-top: 12px; }
  :global(.comment-box) {
    width: 100%; min-height: 80px; resize: vertical;
    background: color-mix(in srgb, var(--panel) 88%, white 12%);
    color: var(--fg); border: 1px solid var(--border); border-radius: 10px;
    padding: 8px 10px; font: inherit; font-size: 18px; line-height: 1.35;
    margin-top: 6px; box-sizing: border-box;
  }
  :global(.sidebar-extra-info-box) { margin-top: 6px; }
  :global(.comment-box:focus) { outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent); outline-offset: 1px; }
  :global(.seglist .note) { color: var(--sidebar-subheading); font-size: 33px; line-height: 1.2; padding: 0 12px 8px 50px; white-space: pre-wrap; }
  :global(.seglist .infobox) { margin-top: 18px; padding: 16px 18px; border-radius: 12px; background: #ffffff; color: #1a1410; border: 1px solid #b8b0a4; font-size: 26px; line-height: 1.35; white-space: pre-wrap; font-style: italic; }
  :global(.dark .seglist .infobox) { background: #ececec; color: #000000; border: none; }
  :global(.collapse-btn) { position: fixed; top: 50%; left: calc(var(--sb-w, 400px) - 14px); transform: translateY(-50%); width: 28px; height: 28px; border-radius: 50%; background: var(--panel); color: var(--fg); border: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; z-index: 50; transition: left .25s ease; }
  :global(body.sb-collapsed .collapse-btn) { left: 8px; }
  :global(.resize-handle-sb), :global(.resize-handle-ag) {
    width: 5px; cursor: ew-resize; flex-shrink: 0; height: 100%;
    background: transparent; transition: background .15s; z-index: 5;
    touch-action: pinch-zoom;
  }
  :global(.resize-handle-sb:hover), :global(.resize-handle-ag:hover) { background: var(--border); }
  :global(.main-header) { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: start; column-gap: 16px; min-height: clamp(44px, 8.5cqi, 92px); }
  :global(.hero-text) { font-family: inherit; font-size: clamp(42px, 8.5cqi, 92px); line-height: 1.1; letter-spacing: -0.03em; color: var(--fg); -webkit-appearance: none; appearance: none; font-variant-numeric: tabular-nums; display: block; }
  :global(.lesson-title) { grid-column: 1; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  :global(.next-session) { grid-column: 3; justify-self: end; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right; opacity: .82; }
  :global(.lesson-title-editable) { background: transparent; border: none; outline: none; font-family: inherit; padding: 0; cursor: text; width: 100%; justify-self: start; }
  :global(.lesson-title-editable:focus) { border-bottom: 2px solid var(--accent); }
  :global(.lesson-title-editable::placeholder) { color: var(--muted); opacity: .35; }
  :global(.top-time) { grid-column: 2; position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; margin-top: 0; justify-self: center; }
  :global(.top-time .now) { background: transparent; border: 0; color: inherit; padding: 0; cursor: pointer; }
  :global(.top-time .left) { position: absolute; top: calc(100% + 4px); left: 50%; transform: translateX(-50%); font-size: 20px; color: var(--muted); margin-top: 0; transition: opacity .2s; font-variant-numeric: tabular-nums; font-weight: 500; white-space: nowrap; }
  :global(.plan-overrun-alert) { width: min(520px, calc(100% - 24px)); margin: 8px auto 0; padding: 9px 12px; border: 1px solid color-mix(in srgb, #d97706 44%, var(--border)); border-left-width: 4px; border-radius: 8px; background: color-mix(in srgb, #fef3c7 72%, var(--panel)); color: color-mix(in srgb, #78350f 78%, var(--fg)); box-shadow: 0 8px 24px rgba(0,0,0,.12); display: flex; flex-direction: column; gap: 2px; text-align: left; font-size: 13px; line-height: 1.25; }
  :global(.plan-overrun-alert strong) { font-size: 13px; font-weight: 800; letter-spacing: 0; }
  :global(.plan-overrun-alert span) { opacity: .86; }
  :global(.plan-overrun-alert.active-shift) { border-color: color-mix(in srgb, #dc2626 56%, var(--border)); background: color-mix(in srgb, #fee2e2 68%, var(--panel)); color: color-mix(in srgb, #7f1d1d 80%, var(--fg)); }
  :global(body.dark .plan-overrun-alert) { background: color-mix(in srgb, #451a03 62%, var(--panel)); color: color-mix(in srgb, #fde68a 80%, var(--fg)); }
  :global(body.dark .plan-overrun-alert.active-shift) { background: color-mix(in srgb, #450a0a 64%, var(--panel)); color: color-mix(in srgb, #fecaca 84%, var(--fg)); }
  :global(.clock-wrap) { position: relative; margin-top: 34px; }
  :global(.mini-menu-shell) { width: min(348px, 100%); display: flex; flex-direction: column; align-items: center; gap: 7px; }
  :global(.mini-menu-shell--planner) { width: min(760px, 100%); }
  :global(.mini-menu-shell--wide) { width: min(760px, 100%); }
  :global(.mini-menu-toggle) { width: 26px; height: 20px; border-radius: 999px; border: 0; background: transparent; color: color-mix(in srgb, var(--muted) 84%, var(--fg) 16%); opacity: 1; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; transition: color .16s, opacity .16s, transform .16s; }
  :global(.mini-menu-toggle:hover), :global(.mini-menu-toggle:focus-visible) { color: var(--fg); opacity: 1; }
  :global(.mini-menu-toggle span) { display: inline-block; line-height: 1; font-size: 18px; font-weight: 700; transform: rotate(0deg); transition: transform .2s ease; }
  :global(.mini-menu-toggle.open span) { transform: none; }
  :global(.mini-menu-details) { width: 100%; display: flex; flex-direction: column; align-items: center; overflow: hidden; max-height: 0; opacity: 0; transform: translateY(-6px); pointer-events: none; transition: max-height .28s ease, opacity .18s ease, transform .18s ease; }
  :global(.mini-menu-details--planner) { align-self: stretch; }
  :global(.mini-menu-details.open) { max-height: 5000px; opacity: 1; transform: translateY(0); pointer-events: auto; overflow: visible; }
  :global(.toolbar) { width: 100%; max-width: 100%; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; column-gap: 6px; background: color-mix(in srgb, var(--panel) 18%, transparent); border: 1px solid color-mix(in srgb, var(--border) 68%, transparent); border-radius: 999px; padding: 3px 7px; position: relative; opacity: 0.68; transition: opacity .2s, border-color .15s; box-shadow: 0 1px 0 rgba(255,255,255,.18) inset; overflow: visible; }
  :global(.toolbar:hover) { opacity: 1; }
  :global(.toolbar-side) { min-width: 0; display: flex; align-items: center; justify-content: space-evenly; gap: 6px; transition: opacity .18s ease, transform .18s ease; }
  :global(.toolbar-side-left) { justify-content: space-evenly; }
  :global(.toolbar-side-right) { justify-content: space-evenly; }
  :global(.toolbar-side.collapsed) { opacity: 0; transform: translateY(-4px); pointer-events: none; }
  :global(.toolbar-center) { justify-self: center; align-self: center; z-index: 1; display: flex; align-items: center; }
  :global(.toolbar button.icon) { background: transparent; border: 0; color: color-mix(in srgb, var(--muted) 84%, var(--fg) 16%); cursor: pointer; font-size: 16px; width: 29px; height: 29px; padding: 0; border-radius: 999px; font-family: "Segoe UI Symbol", "Apple Symbols", system-ui, sans-serif; font-variant-emoji: text; display: inline-flex; align-items: center; justify-content: center; transition: background .15s, color .15s; }
  :global(.toolbar button.icon:hover) { background: var(--pill); color: var(--fg); }
  :global(.toolbar .clock-span-btn) { font-size: 10.5px; font-weight: 500; letter-spacing: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; min-width: 34px; text-align: center; border: 1px solid var(--pill-on); background: var(--pill-on); color: var(--pill-on-fg); border-color: var(--pill-on); }
  :global(.toolbar .clock-span-btn:hover) { opacity: .8; }
  :global(.toolbar .clock-span-btn.active) { background: transparent; color: var(--muted); border-color: color-mix(in srgb, var(--border) 72%, transparent); font-weight: 500; }
  :global(.warnings-popup) {
    position: absolute; bottom: calc(100% + 12px); right: -10px;
    background: var(--menu-panel); border: 1px solid var(--menu-border);
    border-radius: 12px; padding: 10px; width: max-content; max-width: 180px;
    box-shadow: 0 4px 16px rgba(0,0,0,.15); z-index: 100;
  }
  :global(.theme-popup-new) { right: auto; left: -10px; max-width: 220px; }
  :global(.warnings-popup::after) {
    content: ''; position: absolute; top: 100%; right: 20px;
    border: 6px solid transparent; border-top-color: var(--menu-border);
  }
  :global(.theme-popup-new::after) { right: auto; left: 18px; }
  :global(.mute-all-btn) { width: 100%; margin-bottom: 8px; padding: 5px 8px; border-radius: 999px; border: 1px solid var(--menu-border); background: transparent; color: var(--menu-muted); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; text-align: center; transition: background .12s, color .12s; }
  :global(.mute-all-btn:hover) { background: var(--pill); color: var(--fg); }
  :global(.mute-all-btn.on) { background: color-mix(in srgb, var(--accent) 15%, var(--menu-surface)); color: var(--accent); border-color: color-mix(in srgb, var(--accent) 40%, var(--menu-border)); }
  :global(.warn-dots-grid) { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-start; }
  :global(.warn-dots-grid.muted) { opacity: .35; pointer-events: none; }
  :global(.warn-dots-grid .wd) { width: 22px; height: 22px; border: 0; cursor: pointer; background: transparent; color: color-mix(in srgb, var(--muted) 45%, var(--border) 55%); padding: 0; display: inline-flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; line-height: 1; border-radius: 999px; transition: all .12s; }
  :global(.warn-dots-grid .wd:hover) { background: var(--pill); color: var(--fg); }
  :global(.warn-dots-grid .wd.on) { color: var(--warn-color); text-shadow: 0 0 8px color-mix(in srgb, var(--warn-color) 40%, transparent); transform: scale(1.1); }
  :global(.options-menu) { width: 100%; display: none; flex-direction: column; gap: 10px; background: var(--menu-panel); border: 1px solid var(--menu-border); border-radius: 14px; padding: 12px; color: var(--menu-fg); box-shadow: 0 4px 16px rgba(0,0,0,.12); }
  :global(.options-menu.open) { display: flex; }
  :global(.pill) { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 999px; background: var(--menu-pill); color: var(--menu-fg); cursor: pointer; font-size: 13px; border: 0; }
  :global(.pill.on) { background: var(--menu-pill-on); color: var(--menu-pill-on-fg); }
  :global(.menu-section) { display: flex; flex-direction: column; gap: 8px; padding: 10px 11px; border: 1px solid color-mix(in srgb, var(--menu-border) 84%, transparent); border-radius: 12px; background: color-mix(in srgb, var(--menu-surface) 92%, white 8%); }
  :global(.menu-section-head) { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  :global(.menu-section-title) { font-size: 18px; font-weight: 700; color: var(--menu-fg); line-height: 1.15; }
  :global(.menu-section-copy) { font-size: 13px; line-height: 1.45; color: color-mix(in srgb, var(--menu-fg) 68%, var(--menu-muted) 32%); margin-top: 2px; }
  :global(.menu-help) { font-size: 11px; line-height: 1.4; color: var(--menu-muted); background: color-mix(in srgb, var(--menu-pill) 46%, transparent); border: 1px solid color-mix(in srgb, var(--menu-border) 70%, transparent); border-radius: 10px; padding: 7px 8px; }
  :global(.menu-i) { width: 18px; height: 18px; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--menu-border) 68%, transparent); background: color-mix(in srgb, var(--menu-surface) 38%, transparent); color: color-mix(in srgb, var(--menu-muted) 78%, transparent); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; flex-shrink: 0; font: inherit; font-size: 10px; font-weight: 700; line-height: 1; }
  :global(.menu-i:hover) { background: var(--menu-pill); color: var(--menu-fg); }
  :global(.menu-list) { display: flex; flex-direction: column; gap: 4px; }
  :global(.menu-row) { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid var(--menu-border); background: var(--menu-surface); color: var(--menu-fg); border-radius: 10px; padding: 8px 10px; cursor: pointer; font: inherit; font-size: 13px; text-align: left; }
  :global(.menu-row:hover) { background: color-mix(in srgb, var(--menu-pill) 72%, var(--menu-surface) 28%); }
  :global(.menu-row.on) { background: color-mix(in srgb, var(--menu-pill-on) 14%, var(--menu-surface)); border-color: color-mix(in srgb, var(--menu-pill-on) 72%, var(--menu-border) 28%); }
  :global(.menu-row-state) {
    font-size: 10px;
    font-weight: 700;
    color: var(--menu-muted);
    flex-shrink: 0;
    background: var(--menu-pill);
    padding: 2px 8px;
    border-radius: 999px;
    transition: all .15s;
  }
  :global(.menu-row.on .menu-row-state) {
    background: var(--menu-pill-on);
    color: var(--menu-pill-on-fg);
  }
  :global(.controls) { background: var(--menu-panel); border: 1px solid var(--menu-border); border-radius: 16px; padding: 15px; display: flex; flex-direction: column; gap: 10px; width: min(348px, 100%); color: var(--menu-fg); box-sizing: border-box; }
  :global(.controls--planner) { width: min(760px, 100%); max-width: 100%; align-self: center; }
  :global(.controls--wide) { width: min(760px, 100%); max-width: 100%; align-self: center; }
  :global(.controls label) { font-size: 12px; color: var(--menu-muted); text-transform: uppercase; letter-spacing: .5px; font-weight: 600; }
  :global(.field-label) { font-size: 11px; color: var(--menu-muted); letter-spacing: 0; font-weight: 600; }
  :global(.field-head) { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
  :global(.field-head--wrap) { align-items: flex-start; flex-wrap: wrap; }
  :global(.field-head-actions) { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; }
  :global(.section-nav) { display: flex; gap: 6px; flex-wrap: wrap; }
  :global(.section-tab) { border: 1px solid var(--menu-border); background: var(--menu-surface); color: var(--menu-muted); border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
  :global(.section-tab.active) { background: var(--menu-pill-on); color: var(--menu-pill-on-fg); border-color: var(--menu-pill-on); }
  :global(.section-hero) { display: flex; flex-direction: column; gap: 3px; padding-bottom: 2px; }
  :global(.section-hero--split) { flex-direction: row; align-items: flex-end; justify-content: space-between; gap: 12px; }
  :global(.section-hero--compact) { padding-bottom: 2px; }
  :global(.section-title) { font-size: 18px; font-weight: 700; color: var(--menu-fg); }
  :global(.section-copy) { font-size: 13px; line-height: 1.45; color: color-mix(in srgb, var(--menu-fg) 68%, var(--menu-muted) 32%); }
  :global(.section-copy.muted) { opacity: .8; }
  :global(.hero-select-wrap) { min-width: 140px; display: flex; flex-direction: column; gap: 5px; align-items: flex-start; }
  :global(.hero-select) { min-width: 160px; max-width: 220px; padding: 8px 28px 8px 10px; border: 1px solid var(--menu-border); border-radius: 10px; background: var(--menu-surface); color: var(--menu-fg); font-size: 13px; font-family: inherit; cursor: pointer; }
  :global(.hero-select:focus) { outline: 2px solid color-mix(in srgb, var(--menu-pill-on) 50%, var(--menu-border) 50%); outline-offset: 1px; }
  :global(.section-card) { display: flex; flex-direction: column; gap: 7px; background: color-mix(in srgb, var(--menu-surface) 94%, white 6%); border: 1px solid var(--menu-border); border-radius: 13px; padding: 11px 12px; box-shadow: 0 1px 0 rgba(255,255,255,.28) inset; }
  :global(.section-card-head) { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  :global(.section-chip-row) { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
  :global(.section-chip) { display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; border-radius: 999px; border: 1px solid var(--menu-border); background: color-mix(in srgb, var(--menu-surface) 84%, white 16%); color: var(--menu-muted); font-size: 11px; font-weight: 700; letter-spacing: .2px; }
  :global(.section-chip.on) { background: color-mix(in srgb, var(--menu-pill-on) 88%, white 12%); color: var(--menu-pill-on-fg); border-color: color-mix(in srgb, var(--menu-pill-on) 72%, var(--menu-border) 28%); }
  :global(.session-source) { font-size: 12px; font-weight: 600; color: var(--menu-muted); background: var(--menu-surface); border: 1px solid var(--menu-border); border-radius: 999px; padding: 6px 10px; width: fit-content; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  :global(.session-source.from-template) { color: var(--menu-fg); border-color: var(--muted); }
  :global(.session-source.from-agenda) { color: var(--menu-pill-on-fg); background: var(--menu-pill-on); border-color: var(--menu-pill-on); }
  :global(.step-section) { display: flex; gap: 11px; align-items: flex-start; background: color-mix(in srgb, var(--menu-surface) 90%, white 10%); border: 1px solid color-mix(in srgb, var(--menu-border) 88%, transparent); border-radius: 12px; padding: 11px 12px; }
  :global(.step-section--action) { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 6%, var(--menu-surface)); }
  :global(.step-num) { width: 22px; height: 22px; border-radius: 50%; background: var(--accent); color: var(--bg); font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  :global(.step-body) { flex: 1; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  :global(.controls input[type=text]), :global(.controls input[type=time]), :global(.controls input[type=number]), :global(.controls textarea) { background: var(--menu-surface); color: var(--menu-fg); border: 1px solid var(--menu-border); border-radius: 8px; padding: 6px 10px; font-size: 14px; width: 100%; font-family: inherit; }
  :global(.controls input[type=time]), :global(.controls input[type=number]) { padding: 4px 8px; text-align: center; }
  :global(.controls textarea) { min-height: 100px; resize: vertical; line-height: 1.4; }
  :global(.row2) { display: flex; gap: 8px; }
  :global(.row2 > div) { flex: 1; }
  :global(.mode-toggle) { display: flex; gap: 4px; background: var(--menu-surface); border-radius: 8px; padding: 3px; border: 1px solid var(--menu-border); }
  :global(.mode-toggle button) { flex: 1; padding: 5px; border: 0; background: transparent; color: var(--menu-fg); cursor: pointer; border-radius: 6px; font-size: 13px; }
  :global(.mode-toggle button.on) { background: var(--menu-pill-on); color: var(--menu-pill-on-fg); }
  :global(.feedback) { font-size: 12px; color: var(--menu-muted); margin-top: 2px; font-variant-numeric: tabular-nums; }
  :global(.quickstart) { background: var(--menu-pill); color: var(--menu-fg); border: 1px solid var(--menu-border); border-radius: 999px; padding: 9px 15px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; transition: background .15s, border-color .15s, color .15s; line-height: 1.2; }
  :global(.quickstart:hover) { background: #e2d8c8; }
  :global(.quickstart-subtle) { background: color-mix(in srgb, var(--menu-surface) 82%, white 18%); color: var(--menu-muted); }
  :global(.quickstart-subtle:hover) { background: var(--menu-surface); color: var(--menu-fg); }
  :global(.quickstart:disabled), :global(.ai-key-btn:disabled) { opacity: .45; cursor: default; }
  :global(#quickStartBtn) { background: var(--menu-pill-on); color: var(--menu-pill-on-fg); border-color: var(--menu-pill-on); font-weight: 600; padding: 9px 15px; font-size: 14px; }
  :global(#quickStartBtn:hover) { background: #26221d; border-color: #26221d; }
  :global(.now-live-panel) { display:flex; flex-direction:column; gap:12px; padding:12px; border:1px solid var(--menu-border); border-radius:12px; background: color-mix(in srgb, var(--menu-surface) 90%, white 10%); }
  :global(.now-live-title) { font-size:14px; font-weight:800; color:var(--menu-fg); }
  :global(.now-live-copy) { margin-top:3px; font-size:12px; line-height:1.45; color:var(--menu-muted); }
  :global(.now-live-actions) { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  @media (max-width: 430px) { :global(.now-live-actions) { grid-template-columns:1fr; } }
  :global(.flows) { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--menu-border); }
  :global(.flows-toggle) { background: transparent; border: 0; color: var(--menu-muted); cursor: pointer; font-size: 13px; font-weight: 600; padding: 4px 0; text-align: left; font-family: inherit; }
  :global(.flows-toggle:hover) { color: var(--menu-fg); }
  :global(.flow-list) { display: flex; flex-direction: column; gap: 4px; }
  :global(.flow-item) { display: flex; align-items: center; gap: 8px; background: color-mix(in srgb, var(--menu-pill) 82%, var(--menu-surface) 18%); border: 1px solid color-mix(in srgb, var(--menu-border) 78%, transparent); border-radius: 11px; padding: 9px 8px 9px 12px; }
  :global(.flow-main) { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }
  :global(.flow-item .flow-name) { flex: 1; background: transparent; border: 0; color: var(--menu-fg); cursor: pointer; text-align: left; padding: 0; font-size: 15px; font-family: inherit; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  :global(.flow-item .flow-name:hover) { text-decoration: underline; }
  :global(.flow-meta) { display: flex; flex-wrap: wrap; gap: 6px 10px; font-size: 11px; color: var(--menu-muted); }
  :global(.flow-actions) { display: flex; align-items: center; gap: 4px; }
  :global(.flow-item .flow-add) { background: transparent; border: 1px solid var(--menu-border); color: var(--menu-muted); cursor: pointer; font-size: 14px; width: 28px; height: 28px; border-radius: 999px; flex-shrink: 0; font-family: "Segoe UI Symbol", "Apple Symbols", system-ui, sans-serif; font-variant-emoji: text; }
  :global(.flow-item .flow-add:hover) { background: var(--menu-surface); color: var(--menu-fg); }
  :global(.flow-item .flow-del) { background: transparent; border: 0; color: var(--menu-muted); cursor: pointer; font-size: 14px; padding: 6px 10px; border-radius: 6px; flex-shrink: 0; font-family: "Segoe UI Symbol", "Apple Symbols", system-ui, sans-serif; font-variant-emoji: text; }
  :global(.flow-item .flow-del:hover) { background: #e7ddcf; color: var(--menu-fg); }
  :global(.flows-hint) { font-size: 13px; color: var(--menu-muted); margin: 2px 0 0; }
  :global(.beta-tag) { font-size: 9px; font-weight: 800; letter-spacing: .04em; background: var(--accent); color: white; padding: 1px 5px; border-radius: 4px; vertical-align: middle; opacity: .85; }
  :global(.sync-section) { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--menu-border); }
  :global(.sync-input) { width: 100%; padding: 9px 12px; border: 1px solid var(--menu-border); border-radius: 8px; background: var(--menu-surface); color: var(--menu-fg); font-size: 15px; font-family: inherit; }
  :global(.sync-input:focus) { outline: 2px solid #4a443c; outline-offset: 1px; }
  :global(.sync-row) { display: flex; gap: 8px; }
  :global(.sync-btn) { flex: 1; font-size: 14px; }
  :global(.sync-status) { font-size: 12px; color: #165a3f; min-height: 18px; padding: 7px 9px; border-radius: 8px; background: rgba(22,90,63,.08); border: 1px solid rgba(22,90,63,.16); }
  :global(.sync-status.error) { color: #a12d21; background: rgba(161,45,33,.08); border-color: rgba(161,45,33,.16); }
  /* ── Agenda panel ── */
  :global(.agenda) {
    width: 280px; min-width: 160px; max-width: 720px; background: var(--panel);
    border-left: 1px solid var(--border); padding: 20px 14px;
    display: flex; flex-direction: column;
    overflow-y: auto; flex-shrink: 0; transition: margin-right .25s ease; height: 100%;
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
    height: 2520px; position: relative; flex-shrink: 0; overflow: hidden;
  }
  :global(.agenda-block) {
    position: absolute; left: 0; right: 0;
    border-radius: 0 8px 8px 0; border-left: 35px solid transparent;
    min-height: 22px; padding: 2px 8px; cursor: pointer; overflow: hidden;
    transition: background .12s; user-select: none; box-sizing: border-box;
    display: flex; flex-direction: row; align-items: center; gap: 10px;
  }
  :global(.agenda-block.compact) { gap: 7px; padding: 1px 7px; }
  :global(.agenda-block:hover) { background: var(--pill); }
  :global(.agenda-block.active) { background: var(--pill); }
  :global(.agenda-block.past) { opacity: .4; }
  :global(.agenda-block.dragging) {
    opacity: .38;
    background: color-mix(in srgb, var(--accent) 10%, var(--pill));
    border-left-style: dashed;
    transform: translateX(4px) scale(.99);
  }
  :global(.sync-emoji) {
    display: inline-flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 50%;
    font-size: 14px; line-height: 1;
    margin-left: 4px; cursor: pointer;
    border: 1px solid var(--border);
    background: transparent; padding: 0;
    transition: background .25s, border-color .25s, box-shadow .25s;
  }
  :global(.sync-emoji:hover) { opacity: .8; }
  :global(.sync-emoji[data-sync="green"])    { background: rgba(46,160,67,.28); border-color: rgba(46,160,67,.5); }
  :global(.sync-emoji[data-sync="halfgreen"]){ background: rgba(46,160,67,.13); border-color: rgba(46,160,67,.32); }
  :global(.sync-emoji[data-sync="orange"])   { background: rgba(255,140,0,.32); border-color: rgba(255,140,0,.55); box-shadow: 0 0 0 2px rgba(255,140,0,.18); }
  :global(.sync-emoji[data-sync="red"])      { background: rgba(220,38,38,.28); border-color: rgba(220,38,38,.55); }
  :global(.sync-emoji[data-sync="grey"])     { background: rgba(150,150,150,.18); border-color: var(--border); opacity: .6; }
  :global(.agenda-drop-indicator) {
    position: absolute;
    left: 0;
    right: 37%;
    height: 0;
    border-top: 2px solid var(--muted);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--muted) 20%, transparent);
    pointer-events: none;
    z-index: 6;
  }
  :global(.agenda-timeline:not(.has-overlay) .agenda-drop-indicator) { right: 0; }
  :global(.agenda-timeline.has-overlay .agenda-block:not(.ghost)) { right: 37%; }
  :global(.agenda-block.ghost) { left: 65%; right: 0; border-left-width: 8px; pointer-events: none; }
  :global(.agenda-block.ghost.past) { opacity: .4; }
  :global(.agenda-block.ghost .agenda-name) { font-size: 14px; font-weight: 500; line-height: 1.15; padding: 0; }
  :global(.agenda-block.ghost .agenda-time) { font-size: 10px; }
  :global(.agenda-mode-badge) {
    font-size: 10px; font-weight: 600; letter-spacing: .04em;
    padding: 1px 6px; border-radius: 8px;
    background: var(--accent); color: var(--bg); opacity: .75;
  }
  :global(.agenda-del-btn) {
    position: absolute; top: 3px; right: 4px; z-index: 3;
    background: none; border: none; cursor: pointer; padding: 2px 4px;
    font-size: 13px; line-height: 1; color: var(--fg);
    opacity: 0; transition: opacity .15s;
  }
  :global(.agenda-move-btn) {
    position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
    z-index: 3; width: 20px; min-height: 38px; border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border) 55%, transparent);
    background: color-mix(in srgb, var(--panel) 72%, transparent);
    color: var(--muted); cursor: grab; padding: 0; opacity: 0;
    transition: opacity .15s, background .12s, color .12s;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 11px; line-height: .8;
  }
  :global(.agenda-move-btn:hover) { background: var(--pill); color: var(--fg); }
  :global(.agenda-move-btn:active) { cursor: grabbing; }
  :global(.agenda-block:hover .agenda-del-btn) { opacity: .55; }
  :global(.agenda-block:hover .agenda-move-btn) { opacity: .72; }
  :global(.agenda-del-btn:hover) { opacity: 1 !important; }
  :global(.agenda-insert-after-btn) {
    position: absolute; left: 50%; bottom: 1px; transform: translateX(-50%);
    z-index: 4; width: 18px; height: 14px; border: 0; border-radius: 999px;
    background: transparent; color: var(--muted); cursor: default;
    opacity: .18; font: 700 13px/13px inherit; padding: 0;
  }
  :global(.agenda-insert-after-btn.available) { cursor: pointer; opacity: .32; }
  :global(.agenda-block:hover .agenda-insert-after-btn.available) {
    opacity: .78; background: color-mix(in srgb, var(--panel) 80%, transparent);
  }
  :global(.agenda-insert-after-btn:disabled) { pointer-events: auto; }
  :global(.agenda-drag-top) {
    position: absolute; top: 0; left: 0; width: 50%; height: 50%;
    cursor: ns-resize; touch-action: none; z-index: 2;
  }
  :global(.agenda-drag-bottom) {
    position: absolute; bottom: 0; left: 0; width: 50%; height: 50%;
    cursor: ns-resize; touch-action: none; z-index: 2;
  }
  :global(.agenda-zone-left),
  :global(.agenda-zone-resize-top),
  :global(.agenda-zone-resize-bottom),
  :global(.agenda-zone-right) {
    display: none;
  }
  @media (hover: none) {
    :global(.agenda-drag-top), :global(.agenda-drag-bottom),
    :global(.agenda-move-btn) {
      display: none;
    }
    :global(.agenda-del-btn) {
      opacity: .58;
      font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", system-ui, sans-serif;
    }
    :global(.agenda-zone-left) {
      display: block;
      position: absolute; left: 0; top: 0;
      width: 20%; height: 100%;
      touch-action: pan-y;
      z-index: 2;
    }
    :global(.agenda-zone-resize-top) {
      display: block;
      position: absolute; left: 20%; top: 0;
      width: 60%; height: 22px;
      touch-action: pinch-zoom;
      z-index: 3;
    }
    :global(.agenda-zone-resize-bottom) {
      display: block;
      position: absolute; left: 20%; bottom: 0;
      width: 60%; height: 22px;
      touch-action: pinch-zoom;
      z-index: 3;
    }
    :global(.agenda-zone-right) {
      display: flex; align-items: center; justify-content: center;
      position: absolute; right: 0; top: 0;
      width: 20%; height: 100%;
      touch-action: pinch-zoom;
      z-index: 2;
      color: var(--muted); font-size: 14px; letter-spacing: -1px;
      opacity: .55;
    }
    :global(.agenda-zone-right:active) { opacity: .9; }
  }
  :global(.agenda-time) { position: relative; font-size: 12px; color: var(--sidebar-subheading); font-variant-numeric: tabular-nums; font-weight: 600; pointer-events: none; flex-shrink: 0; }
  :global(.agenda-block.compact .agenda-time) { font-size: 10px; }
  :global(.agenda-source-badge) {
    position: absolute; top: 18px; left: 8px;
    font-size: 10px; font-weight: 700; letter-spacing: .03em;
    padding: 1px 6px; border-radius: 9999px;
    background: color-mix(in srgb, var(--menu-pill-on) 84%, white 16%);
    color: var(--menu-pill-on-fg); pointer-events: none;
    opacity: 0; transform: translateY(2px); transition: opacity .14s, transform .14s;
  }
  :global(.agenda-source-badge.template) { background: color-mix(in srgb, var(--muted) 78%, white 22%); color: #102216; }
  :global(.agenda-source-badge.ai) { background: color-mix(in srgb, var(--accent) 82%, white 18%); color: #2b1208; }
  :global(.agenda-source-badge.imported) { background: color-mix(in srgb, var(--pill-on) 70%, white 30%); color: var(--pill-on-fg); }
  :global(.agenda-name) { flex: 1; min-width: 0; font-size: 30px; font-weight: 500; line-height: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; display: block; text-align: left; box-sizing: border-box; }
  :global(.agenda-block.compact .agenda-name) { font-size: 20px; line-height: 1; }
  :global(.agenda-name-btn) { border: 0; background: transparent; color: inherit; padding: 0; cursor: text; font-family: inherit; }
  :global(.agenda-name-btn:focus-visible) { outline: 1px solid color-mix(in srgb, var(--accent) 42%, transparent); outline-offset: 2px; border-radius: 4px; }
  :global(.agenda-title-input) {
    flex: 1; min-width: 0; font-size: 28px; font-weight: 500; line-height: 1;
    color: var(--fg); background: color-mix(in srgb, var(--panel) 86%, white 14%);
    border: 1px solid color-mix(in srgb, var(--accent) 36%, var(--border));
    border-radius: 5px; padding: 2px 4px; font-family: inherit;
  }
  :global(.agenda-add-row) { display: flex; gap: 8px; margin-top: 4px; }
  :global(.agenda-add-inline) {
    display: block; width: 100%; margin-top: 4px; padding: 6px 10px;
    background: none; border: 0; border-radius: 8px;
    color: var(--muted); font-size: 13px; cursor: pointer; text-align: center;
    transition: opacity .12s; opacity: .38; font-family: inherit;
  }
  :global(.agenda-add-inline:hover) { opacity: .8; }
  :global(.agenda-block.ghost .agenda-source-badge) { display: none; }
  @media (hover: hover) and (pointer: fine) {
    :global(.agenda-block:hover .agenda-source-badge) { opacity: .95; transform: translateY(0); }
  }
  @media (hover: none) {
    :global(.agenda-source-badge) { display: none; }
  }
  :global(.agenda-editing-badge) {
    position: absolute; top: 4px; left: 6px;
    font-size: 14px; line-height: 1; pointer-events: none;
    opacity: .85;
  }
  :global(.agenda-dur) { font-size: 12px; color: var(--muted); flex-shrink: 0; }
  :global(.agenda-empty) { font-size: 13px; color: var(--muted); font-style: italic; line-height: 1.5; padding: 4px 2px; }
  :global(.agenda-input-wrapper) { width: 100%; display: block; position: relative; }
  :global(.agenda-input) {
    display: block; width: 100%; min-height: 80px; resize: vertical; overflow-y: auto;
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
  :global(.agenda-date-label) { flex: 1; text-align: center; font-size: 30px; font-weight: 600; color: var(--fg); line-height: 1.05; }
  :global(.agenda-calendar) { margin-bottom: 8px; padding: 6px; border: 1px solid var(--border); border-radius: 10px; background: color-mix(in srgb, var(--panel) 72%, white 28%); }
  :global(.agenda-calendar.collapsed) { margin-bottom: 6px; padding: 0; border: 0; border-radius: 0; background: transparent; }
  :global(.agenda-calendar.collapsed .agenda-input-header) { margin-bottom: 0 !important; }
  :global(.agenda-calendar-head) { display: flex; align-items: center; gap: 2px; margin-bottom: 4px; }
  :global(.agenda-calendar-weekdays),
  :global(.agenda-calendar-grid) { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 0; }
  :global(.agenda-calendar-weekdays) { margin-bottom: 0; }
  :global(.agenda-calendar-weekdays span) { text-align: center; font-size: 10px; color: var(--muted); font-weight: 700; }
  :global(.agenda-calendar-day) {
    min-height: 28px; border: 1px solid transparent; border-radius: 7px; background: transparent;
    color: var(--fg); cursor: pointer; font: inherit; position: relative; padding: 4px 2px 8px;
    display: flex; align-items: flex-start; justify-content: center;
  }
  :global(.agenda-calendar-day:hover) { background: var(--pill); }
  :global(.agenda-calendar-day.muted) { opacity: .45; }
  :global(.agenda-calendar-day.selected) { border-color: var(--accent); background: var(--pill); }
  :global(.agenda-calendar-day.has-content) { font-weight: 700; }
  :global(.agenda-calendar-density) {
    position: absolute; left: 8px; right: 8px; bottom: 5px; height: 4px; border-radius: 999px;
    background: var(--accent); opacity: 0;
  }
  :global(.agenda-input-header) { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  :global(.agenda-input-label) { flex: 1; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--sidebar-subheading); }
  :global(.agenda-input-toggle) { background: transparent; border: 0; color: var(--muted); cursor: pointer; font-size: 12px; padding: 2px 7px; border-radius: 5px; font-family: inherit; }
  :global(.agenda-input-toggle:hover) { background: var(--pill); color: var(--fg); }
  :global(body.run-mode .agenda-calendar.collapsed) { margin-bottom: 4px; }
  :global(body.run-mode .agenda-calendar .agenda-input-header) { gap: 4px; margin-bottom: 4px !important; }
  :global(body.run-mode .agenda-calendar .agenda-input-label) { font-size: 10px; font-weight: 600; letter-spacing: .35px; color: color-mix(in srgb, var(--muted) 78%, var(--fg) 22%); }
  :global(body.run-mode .agenda-calendar .agenda-input-toggle) { font-size: 11px; padding: 1px 5px; color: color-mix(in srgb, var(--muted) 82%, var(--fg) 18%); }
  :global(.agenda-section-note) { margin-bottom: 12px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--pill); color: var(--fg); font-size: 12px; line-height: 1.45; }
  :global(.agenda-save-btn) { flex: 1; padding: 7px; background: color-mix(in srgb, var(--pill) 55%, transparent); border: 1px solid color-mix(in srgb, var(--border) 72%, transparent); border-radius: 8px; color: var(--fg); font-size: 13px; cursor: pointer; margin-top: 4px; margin-bottom: 12px; font-family: inherit; transition: background .12s, border-color .12s, color .12s; }
  :global(.agenda-save-btn:hover) { background: color-mix(in srgb, var(--pill-on) 16%, transparent); color: var(--fg); border-color: var(--border); }
  :global(.agenda-save-row) { display: flex; gap: 6px; }
  :global(.agenda-ai-btn) { background: color-mix(in srgb, var(--pill-on) 20%, transparent); color: var(--fg); }
  :global(.agenda-plan-link) { width: 100%; margin-top: 4px; }
  :global(.agenda-ai-panel) { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
  :global(.preview-list) { display: flex; flex-direction: column; gap: 6px; }
  :global(.preview-item) { padding: 8px 10px; border-radius: 8px; background: color-mix(in srgb, var(--menu-surface) 78%, white 22%); border: 1px solid color-mix(in srgb, var(--menu-border) 72%, transparent); color: var(--menu-fg); }
  :global(.login-form) { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--menu-border); }
  :global(.ai-key-section) { display: flex; flex-direction: column; gap: 6px; padding-top: 12px; border-top: 1px solid var(--menu-border); }
  :global(.ai-key-section label) { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--menu-muted); }
  :global(.ai-provider-select) { appearance: none; cursor: pointer; }
  :global(.ai-key-row) { display: flex; align-items: center; gap: 6px; }
  :global(.ai-key-masked) { flex: 1; font-size: 12px; font-family: monospace; color: var(--menu-fg); opacity: .8; }
  :global(.ai-key-btn) { background: transparent; border: 1px solid var(--menu-border); border-radius: 5px; padding: 2px 8px; font-size: 11px; color: var(--menu-muted); cursor: pointer; font-family: inherit; }
  :global(.ai-key-btn:hover) { background: var(--menu-surface); color: var(--menu-fg); }
  :global(.micro-btn) { font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--menu-border); background: transparent; color: var(--menu-muted); cursor: pointer; line-height: 1.6; font-family: inherit; }
  :global(.micro-btn:hover) { background: var(--menu-surface); color: var(--menu-fg); }
  :global(.info-btn) {
    width: 18px; height: 18px; border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--menu-border) 68%, transparent);
    background: color-mix(in srgb, var(--menu-surface) 36%, transparent);
    color: color-mix(in srgb, var(--menu-muted) 78%, transparent);
    cursor: pointer; font: inherit; font-size: 10px; font-weight: 700;
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0; flex-shrink: 0; line-height: 1; align-self: center;
  }
  :global(.info-btn:hover) {
    background: color-mix(in srgb, var(--menu-surface) 68%, transparent);
    color: var(--menu-fg);
    border-color: color-mix(in srgb, var(--menu-border) 88%, transparent);
  }
  :global(.plan-editor) { display: flex; flex-direction: column; gap: 12px; background: var(--menu-surface); border: 1px solid var(--menu-border); border-radius: 12px; padding: 12px; }
  :global(.menu-blob) { background: var(--menu-surface); border: 1px solid var(--menu-border); border-radius: 12px; padding: 12px; }
  :global(.menu-blob--planner) { width: 100%; box-sizing: border-box; }
  :global(.planner-menu-workspace) { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(260px, .85fr); gap: 12px; align-items: start; }
  :global(.planner-menu-main),
  :global(.planner-menu-side) { min-width: 0; }
  :global(.agenda-planner-card) { display: flex; flex-direction: column; gap: 8px; }
  :global(.planner-card-copy) { font-size: 12px; line-height: 1.45; color: var(--menu-muted); }
  :global(.pass-help-empty) { border: 1px dashed color-mix(in srgb, var(--menu-border) 82%, transparent); border-radius: 10px; padding: 12px; background: color-mix(in srgb, var(--menu-surface) 70%, transparent); }
  :global(.pass-help-empty-title) { font-size: 13px; font-weight: 700; color: var(--menu-fg); margin-bottom: 4px; }
  :global(.pass-help-empty-copy) { font-size: 12px; line-height: 1.45; color: var(--menu-muted); }
  :global(.plan-editor--pass-help) { height: 100%; box-sizing: border-box; }
  @media (max-width: 760px) {
    :global(.controls--planner) { width: 100%; }
    :global(.menu-blob--planner) { width: 100%; }
    :global(.planner-menu-workspace) { grid-template-columns: minmax(0, 1fr); }
  }
  :global(.plan-editor-bottom) { display: flex; flex-direction: column; gap: 8px; padding-top: 2px; }
  :global(.write-section-toggle) { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; background: transparent; border: 0; padding: 6px 2px 5px; color: var(--menu-muted); cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 600; letter-spacing: 0; text-transform: none; }
  :global(.write-section-toggle:first-child) { border-top: 0; padding-top: 2px; }
  :global(.write-section-toggle:hover) { color: var(--menu-fg); }
  :global(.write-section-body) { display: flex; flex-direction: column; gap: 10px; }
  :global(.ai-panel) { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
  :global(.ai-panel-toggle) { background: transparent; border: 0; padding: 2px 0; font-size: 12px; color: var(--menu-muted); cursor: pointer; text-align: left; font-family: inherit; font-weight: 500; }
  :global(.ai-panel-toggle:hover) { color: var(--menu-fg); }
  :global(.ai-input) { width: 100%; min-height: 64px; padding: 8px 10px; border: 1px solid var(--menu-border); border-radius: 8px; background: var(--menu-surface); color: var(--menu-fg); font-size: 13px; font-family: inherit; resize: vertical; box-sizing: border-box; }
  :global(.ai-generate-btn) { align-self: flex-start; font-size: 13px; padding: 7px 14px; }
  :global(.ai-generate-btn:disabled) { opacity: .5; cursor: default; }
  :global(.ai-error) { font-size: 12px; color: #c0392b; padding: 4px 6px; background: rgba(192,57,43,.08); border-radius: 5px; }
  :global(.ai-mode-row) { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  :global(.ai-mode-btn) { font-size: 11px; padding: 2px 10px; border-radius: 999px; border: 1px solid var(--menu-border); background: transparent; color: var(--menu-muted); cursor: pointer; font-family: inherit; font-weight: 500; transition: background .12s; }
  :global(.ai-mode-btn.on) { background: var(--menu-pill-on, var(--pill-on)); color: var(--menu-pill-on-fg, var(--pill-on-fg)); border-color: transparent; }
  :global(.ai-tone-row) { display: flex; align-items: center; gap: 6px; margin: 2px 0; }
  :global(.ai-tone-label) { color: var(--menu-muted); font-size: 11px; font-weight: 700; text-transform: uppercase; }
  :global(.ai-tone-btn) { border: 1px solid var(--menu-border); background: transparent; color: var(--menu-muted); border-radius: 999px; padding: 2px 8px; font-size: 11px; font-family: inherit; cursor: pointer; }
  :global(.ai-tone-btn.on) { background: var(--menu-surface); color: var(--menu-fg); }
  :global(.ai-meta-list) { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0; }
  :global(.ai-meta-chip) { border: 1px solid var(--menu-border); border-radius: 999px; padding: 3px 7px; font-size: 11px; color: var(--menu-muted); background: var(--menu-surface); }
  :global(.ai-meta-chip--warning) { border-color: color-mix(in srgb, #d97706 35%, var(--menu-border)); color: #92400e; }
  :global(.logged-in-row) { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  :global(.logged-in-row .username) { flex: 1; font-weight: 600; color: var(--menu-fg); }
  :global(.logout-btn) { background: transparent; border: 1px solid var(--menu-border); border-radius: 6px; padding: 4px 10px; font-size: 12px; color: var(--menu-muted); cursor: pointer; font-family: inherit; }
  :global(.logout-btn:hover) { background: var(--menu-surface); color: var(--menu-fg); }
  /* ── Mobilflikar ── */
  :global(.mobile-tabs) { display: none; }
  @media (max-width: 800px) {
    :global(html) { overflow-x: hidden; }
    :global(body) { display: block; height: 100dvh; min-height: 100dvh; overflow: hidden; }
    :global(.app) { flex-direction: column; overflow-x: hidden; overflow-y: auto; height: 100dvh; min-height: 100dvh; padding-bottom: calc(52px + env(safe-area-inset-bottom)); display: flex; -webkit-overflow-scrolling: touch; }
    :global(.main) { flex: 0 0 auto; height: auto; min-height: auto; padding-top: 6px; padding-bottom: 16px; order: 1; width: 100%; overflow: visible; }
    :global(.main-header) { min-height: 38px; }
    :global(.clock-wrap) { margin-top: 8px; }
    :global(.sidebar) { flex: 0 0 auto; width: 100%; max-width: 100%; border-right: none; border-top: 1px solid var(--border); order: 2; margin-left: 0 !important; overflow: visible; height: auto; }
    :global(.agenda) { display: none; flex: 0 0 auto; width: 100%; max-width: 100%; border-left: none; border-top: 1px solid var(--border); order: 2; margin-right: 0 !important; overflow: visible; height: auto; }
    :global(.agenda-toggle-btn) { display: none; }
    :global(.collapse-btn) { display: none; }
    :global(.mobile-tabs) {
      display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 60;
      background: var(--panel); border-top: 1px solid var(--border);
      height: calc(52px + env(safe-area-inset-bottom));
      padding-bottom: env(safe-area-inset-bottom);
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
    :global(body.m-now .sidebar) { display: block; }
    :global(body.m-now .resize-handle-sb) { display: none; }
    :global(.resize-handle-ag) { display: none; }
    :global(body.m-library .sidebar), :global(body.m-workspace .sidebar), :global(body.m-admin .sidebar) { display: none; }
    :global(body.m-now .resize-handle-sb), :global(body.m-plan .resize-handle-sb), :global(body.m-library .resize-handle-sb), :global(body.m-workspace .resize-handle-sb) { display: none; }
    :global(body.m-plan .main) { order: 1; }
    :global(body.m-plan .sidebar) { display: block; order: 2; border-top: 1px solid var(--border); }
    :global(body.m-plan .agenda) { display: flex !important; order: 3; border-top: 1px solid var(--border); }
    :global(body.run-mode .app) { padding-bottom: 0; }
    :global(body.run-mode .main) { order: 1; }
    :global(body.run-mode .sidebar) { display: block !important; order: 2; border-top: 1px solid var(--border); }
    :global(body.run-mode .agenda) { display: flex !important; order: 3; border-top: 1px solid var(--border); }
    :global(body.run-mode .mobile-tabs) { display: none !important; }
    /* Temaväljare som dropdown på mobil */
    :global(.theme-dots) { z-index: 200; }
    :global(.theme-dots.open .theme-panel) { top: 22px; }
    :global(.section-hero--split) { flex-direction: column; align-items: stretch; }
    :global(.hero-select-wrap) { min-width: 0; }
    :global(.hero-select) { min-width: 0; max-width: none; width: 100%; }
  }
  @media (hover: none) and (pointer: coarse) {
    :global(.main) { padding-top: 10px; gap: 4px; }
    :global(.main-header) { min-height: clamp(36px, 5.2cqi, 64px); column-gap: 10px; }
    :global(.hero-text) { font-size: clamp(30px, 5.6cqi, 64px); line-height: 1.02; }
    :global(.top-time .left) { top: calc(100% + 2px); font-size: 16px; }
    :global(.clock-wrap) { margin-top: clamp(10px, 2.4cqi, 20px); }
    :global(.main .clock-wrap svg.clock) { width: max(220px, min(88vw, 100svh - 300px)); height: max(220px, min(88vw, 100svh - 300px)); }
    :global(.mini-menu-shell) { width: min(320px, 100%); }
    :global(.mini-menu-shell.mini-menu-shell--planner),
    :global(.mini-menu-shell.mini-menu-shell--wide) { width: min(760px, 100%); }
    :global(.mini-menu-shell.mini-menu-shell--planner .toolbar),
    :global(.mini-menu-shell.mini-menu-shell--wide .toolbar) { max-width: min(320px, 100%); }
  }
  @media (pointer: coarse) {
    :global(.app) { overflow-y: auto; overflow-x: hidden; }
    :global(.controls input[type=time]), :global(.controls input[type=number]) { padding: 2px 6px; font-size: 16px; height: 34px; box-sizing: border-box; }
    :global(.controls input[type=text]) { padding: 5px 8px; font-size: 16px; }
    :global(.quickstart) { padding: 6px 11px; font-size: 13px; }
    :global(#quickStartBtn) { padding: 6px 11px; font-size: 13px; }
    :global(.mode-toggle button) { padding: 4px; font-size: 12px; }
  }
  @media (max-width: 800px) and (orientation: portrait) {
    :global(.main) { padding-top: max(6px, env(safe-area-inset-top)); gap: 2px; }
    :global(.main-header) { min-height: 0; column-gap: 8px; }
    :global(.hero-text) { font-size: clamp(26px, 7vw, 34px); line-height: 1; }
    :global(.top-time .left) { font-size: 14px; }
    :global(.clock-wrap) { margin-top: 6px; }
    :global(.main .clock) { width: min(78vw, calc(100dvh - 210px)); height: min(78vw, calc(100dvh - 210px)); }
    :global(.mini-menu-shell) { width: min(304px, 100%); }
    :global(.mini-menu-shell.mini-menu-shell--planner),
    :global(.mini-menu-shell.mini-menu-shell--wide) { width: min(760px, 100%); }
  }
  @media (any-pointer: coarse) and (orientation: landscape) {
    :global(.main .clock-wrap svg.clock) { width: max(220px, 50vw); height: max(220px, 50vw); }
  }

  /* ── Dela-sektion ── */
  :global(.share-section) { display: flex; flex-direction: column; gap: 6px; padding-top: 12px; border-top: 1px solid var(--menu-border); }
  :global(.share-section label), :global(.share-label) { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--menu-muted); }
  :global(.share-link-row) { display: flex; align-items: center; gap: 6px; }
  :global(.share-link-box) { display: flex; flex-direction: column; gap: 8px; padding: 9px 10px; border: 1px solid var(--menu-border); border-radius: 10px; background: color-mix(in srgb, var(--menu-surface) 84%, white 16%); }
  :global(.share-link-actions) { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  :global(.share-link-text) { flex: 1; font-size: 11px; font-family: monospace; color: var(--menu-fg); opacity: .8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* ── Live-badge ── */
  :global(.live-badge) {
    position: fixed; top: 12px; right: 16px; z-index: 80;
    background: #e03030; color: #fff;
    font-size: 13px; font-weight: 700; letter-spacing: .3px;
    padding: 4px 12px; border-radius: 999px;
    box-shadow: 0 2px 8px rgba(0,0,0,.25);
    pointer-events: none;
  }

  /* ── Widget-mode: bara klockan ── */
  :global(body.widget-mode .sidebar) { display: none !important; }
  :global(body.widget-mode .agenda) { display: none !important; }
  :global(body.widget-mode .controls) { display: none !important; }
  :global(body.widget-mode .collapse-btn) { display: none !important; }
  :global(body.widget-mode .resize-handle-sb) { display: none !important; }
  :global(body.widget-mode .resize-handle-ag) { display: none !important; }
  :global(body.widget-mode .main .clock) { width: min(90vh, 96vw); height: min(90vh, 96vw); }

  /* ── View-mode: dölj kontroller ── */
  :global(body.view-mode .toolbar) { display: none; }
  :global(body.view-mode .controls) { display: none; }
  :global(body.view-mode .theme-dots) { display: none; }
  :global(body.view-mode .collapse-btn) { display: none; }
  :global(body.view-mode .mobile-tabs) { display: none; }
  :global(body.view-mode .resize-handle-sb) { pointer-events: none; }
  :global(body.view-mode .resize-handle-ag) { pointer-events: none; }
  :global(body.view-mode .agenda-drag-top) { display: none; }
  :global(body.view-mode .agenda-drag-bottom) { display: none; }
  :global(body.view-mode .agenda-move-btn) { display: none; }
  @media (min-width: 801px) {
    :global(body.view-mode.run-mode .collapse-btn) { display: flex; }
  }

  /* ── Lås-läge ── */
  :global(.lock-btn) { opacity: .18; font-size: 14px !important; }
  :global(.lock-btn:hover) { opacity: .5; }
  :global(.lock-btn.locked) { opacity: .55; }
  :global(body.page-locked button:not(.lock-btn):not(.mini-menu-toggle):not(.collapse-btn):not(.agenda-toggle-btn):not(.agenda-input-toggle):not(.agenda-nav-btn):not(.agenda-calendar-day)) { pointer-events: none !important; }
  :global(body.page-locked input) { pointer-events: none !important; user-select: none; }
  :global(body.page-locked textarea) { pointer-events: none !important; user-select: none; }
  :global(body.page-locked .resize-handle-sb) { pointer-events: none !important; }
  :global(body.page-locked .resize-handle-ag) { pointer-events: none !important; }
  :global(body.page-locked .agenda-drag-top) { pointer-events: none !important; }
  :global(body.page-locked .agenda-drag-bottom) { pointer-events: none !important; }
  :global(body.page-locked .agenda-zone-right),
  :global(body.page-locked .agenda-zone-resize-top),
  :global(body.page-locked .agenda-zone-resize-bottom),
  :global(body.page-locked .drag-handle),
  :global(body.page-locked .title-check-btn),
  :global(body.page-locked .check-btn),
  :global(body.page-locked .note-line),
  :global(body.page-locked .agenda-block) { pointer-events: none !important; }
  :global(body.page-locked .agenda-move-btn) { pointer-events: none !important; }
  :global(body.page-locked svg.clock) { pointer-events: none !important; }
  :global(body.page-locked .lesson-title) { pointer-events: none !important; cursor: default; }
  :global(body.run-mode .mobile-tabs) { display: none; }
  :global(body.run-mode .controls) { display: none; }
  :global(body.run-mode .resize-handle-sb),
  :global(body.run-mode .resize-handle-ag) { pointer-events: none !important; }
  :global(body.page-locked.run-mode .collapse-btn),
  :global(body.page-locked.run-mode .agenda-toggle-btn) { pointer-events: auto !important; }
  :global(body.run-mode .title-check-btn),
  :global(body.run-mode .check-btn) { pointer-events: auto !important; }
  :global(body.run-mode .agenda-block) { pointer-events: auto !important; }
  :global(body.page-locked.run-mode .agenda-calendar button) { pointer-events: auto !important; }
  :global(svg.clock *:focus),
  :global(svg.clock *:focus-visible),
  :global(body.run-mode svg.clock [role="button"]:focus),
  :global(body.run-mode svg.clock [role="button"]:focus-visible),
  :global(body.run-mode .agenda-block:focus),
  :global(body.run-mode .agenda-block:focus-visible) { outline: 0 !important; }

  :global(.flash) { position: fixed; inset: 0; pointer-events: none; background: #ffae00; opacity: 0; z-index: 100; transition: opacity .15s; }
  :global(.flash.on) { opacity: .35; }
  :global(.completion-toast) { position: fixed; top: 18px; left: 50%; transform: translateX(-50%); z-index: 180; pointer-events: none; padding: 12px 18px; border-radius: 8px; background: color-mix(in srgb, var(--accent) 18%, var(--panel)); border: 1px solid color-mix(in srgb, var(--accent) 48%, var(--border)); color: var(--fg); box-shadow: 0 14px 42px rgba(0,0,0,.18); font-size: 18px; font-weight: 800; letter-spacing: 0; animation: completion-toast-in .22s ease-out; }
  @keyframes completion-toast-in { from { opacity: 0; transform: translate(-50%, -8px); } to { opacity: 1; transform: translate(-50%, 0); } }
  :global(.help-modal) { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
  :global(.help-modal.open) { display: flex; }
    :global(.help-card) { background: var(--panel); color: var(--fg); border: 1px solid var(--border); border-radius: 24px; padding: 40px; max-width: 680px; width: 95%; max-height: 90vh; overflow-y: auto; position: relative; line-height: 1.5; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
  :global(.help-card h2) { margin: 0 0 24px; font-size: 28px; font-weight: 700; }
  :global(.help-card h3) { margin: 24px 0 12px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); }
  :global(.help-grid) { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  @media (max-width: 600px) { :global(.help-grid) { grid-template-columns: 1fr; gap: 20px; } }
  :global(.help-box) { background: var(--pill); padding: 12px 16px; border-radius: 12px; font-size: 14px; line-height: 1.6; margin: 8px 0; border: 1px solid var(--border); }
  :global(.help-list) { list-style: none; padding: 0; margin: 0; }
  :global(.help-list li) { margin-bottom: 8px; font-size: 14px; display: flex; align-items: center; gap: 10px; }
  :global(.help-card code) { background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 6px; font-size: 13px; font-family: ui-monospace, monospace; font-weight: 600; }
  :global(.help-footer-actions) { margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; gap: 16px; }
  :global(.help-card .ico) { color: var(--muted); font-size: 16px; }
  :global(.help-close) { position: absolute; top: 16px; right: 16px; background: transparent; border: 0; color: var(--muted); font-size: 32px; cursor: pointer; line-height: 1; transition: color .2s; }
  :global(.help-close:hover) { color: var(--fg); }

  :global(.welcome-overlay) {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center;
    z-index: 11000;
    backdrop-filter: blur(8px);
  }
  :global(.welcome-card) {
    background: var(--menu-surface);
    color: var(--menu-fg);
    padding: 48px 40px;
    border-radius: 32px;
    width: 90%;
    max-width: 480px;
    text-align: center;
    box-shadow: 0 30px 80px rgba(0,0,0,0.5);
    border: 1px solid var(--menu-border);
  }
  :global(.welcome-card h1) { margin: 0 0 16px 0; font-size: 36px; font-weight: 800; }
  :global(.welcome-card p) { font-size: 17px; line-height: 1.6; opacity: 0.9; margin-bottom: 32px; }

  :global(.toast-pill) {
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: var(--menu-pill-on); color: var(--menu-pill-on-fg);
    padding: 10px 24px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 700;
    z-index: 12000;
    box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    pointer-events: none;
    animation: toast-fade-in-out 2.5s forwards;
  }
  @keyframes toast-fade-in-out {
    0% { opacity: 0; transform: translate(-50%, -10px); }
    10% { opacity: 1; transform: translate(-50%, 0); }
    90% { opacity: 1; transform: translate(-50%, 0); }
    100% { opacity: 0; transform: translate(-50%, -10px); }
  }
  </style>
