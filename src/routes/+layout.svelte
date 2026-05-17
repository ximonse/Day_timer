<script lang="ts">
  let { children } = $props();
</script>

<svelte:head>
  <title>Timer [BETA]</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
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
    
    /* Menu colors derived from theme variables for consistency */
    --menu-panel: color-mix(in srgb, var(--panel), white 40%);
    --menu-surface: color-mix(in srgb, var(--panel), white 20%);
    --menu-border: color-mix(in srgb, var(--border), black 10%);
    --menu-fg: var(--fg);
    --menu-muted: var(--muted);
    --menu-pill: var(--pill);
    --menu-pill-on: var(--pill-on);
    --menu-pill-on-fg: var(--pill-on-fg);
    
    --sidebar-heading: #5f6f8f;
    --sidebar-subheading: #5f8f7a;
  }

  :global(body.dark:not(.psychedelic)) {
    --bg: #1c1a16; --fg: #ede8dc; --panel: #26231e; --border: #3c3830;
    --muted: #8a8478; --accent: #ede8dc; --pill: #2e2b26;
    --pill-on: #ede8dc; --pill-on-fg: #1c1a16; --void: #0e0d0b;
    
    --menu-panel: #211f1a;
    --menu-surface: #2a2722;
    --menu-border: #464138;
    --menu-fg: #f2ede2;
    --menu-muted: #c2bbad;
    --menu-pill: #343029;
    --menu-pill-on: #ede8dc;
    --menu-pill-on-fg: #1c1a16;
    
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
  
  :global(body.psychedelic) {
    background: linear-gradient(135deg,#ff00cc 0%,#00e5ff 28%,#fff35c 62%,#6a00ff 100%);
    background-size: 220% 220%;
    animation: psychedelic-bg-shift 16s ease-in-out infinite;
  }
  :global(body.psychedelic .sidebar) { background: rgba(0,0,20,0.45); backdrop-filter: blur(6px); }

  :global(.app) { display: flex; width: 100%; height: 100vh; height: 100dvh; overflow: hidden; }
  :global(.sidebar), :global(.main), :global(.agenda) { scrollbar-width: none; }
  :global(.sidebar::-webkit-scrollbar), :global(.main::-webkit-scrollbar), :global(.agenda::-webkit-scrollbar) { display: none; }
  
  :global(.sidebar) { width: 400px; min-width: 160px; max-width: 720px; background: var(--panel); border-right: 1px solid var(--border); padding: 20px 16px; position: relative; transition: margin-left .25s ease; overflow-y: auto; flex-shrink: 0; height: 100%; }
  :global(.main) { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 16px; gap: 8px; position: relative; overflow-y: auto; height: 100%; container-type: inline-size; }
  :global(.agenda) { width: 280px; min-width: 160px; max-width: 720px; background: var(--panel); border-left: 1px solid var(--border); padding: 20px 14px; display: flex; flex-direction: column; overflow-y: auto; flex-shrink: 0; transition: margin-right .25s ease; height: 100%; }

  :global(body.sb-collapsed .sidebar) { margin-left: calc(-1 * var(--sb-w, 400px)); }
  :global(body:not(.ag-open) .agenda) { margin-right: calc(-1 * var(--ag-w, 280px)); }

  @media (max-width: 800px) {
    :global(.app) { flex-direction: column; }
    :global(.main) { flex: 0 0 auto; height: auto; min-height: 400px; padding-bottom: 16px; order: 1; width: 100%; overflow: hidden; }
    :global(.sidebar) { flex: 1; width: 100%; max-width: 100%; border-right: none; border-top: 1px solid var(--border); order: 2; margin-left: 0 !important; overflow-y: auto; -webkit-overflow-scrolling: touch; }
    :global(.agenda) { display: none; flex: 1; width: 100%; max-width: 100%; border-left: none; border-top: 1px solid var(--border); order: 2; margin-right: 0 !important; overflow-y: auto; -webkit-overflow-scrolling: touch; }
    
    :global(body.m-now .sidebar) { display: block; }
    :global(body.m-plan .agenda) { display: flex !important; }
    
    :global(body.m-now .sidebar), :global(body.m-plan .agenda), :global(body.m-library .main), :global(body.m-workspace .main) {
      padding-bottom: 80px;
    }
  }

  :global(.mini-menu-shell) { width: min(348px, 100%); display: flex; flex-direction: column; align-items: center; gap: 7px; }
  :global(.controls) { background: var(--menu-panel); border: 1px solid var(--menu-border); border-radius: 16px; padding: 15px; display: flex; flex-direction: column; gap: 10px; width: min(348px, 100%); color: var(--menu-fg); }
  :global(.menu-section) { display: flex; flex-direction: column; gap: 8px; padding: 10px 11px; border: 1px solid color-mix(in srgb, var(--menu-border) 84%, transparent); border-radius: 12px; background: var(--menu-surface); }
  
  :global(.menu-row) { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid var(--menu-border); background: var(--menu-surface); color: var(--menu-fg); border-radius: 10px; padding: 8px 10px; cursor: pointer; font: inherit; font-size: 13px; text-align: left; }
  :global(.menu-row:hover) { background: color-mix(in srgb, var(--menu-pill) 72%, var(--menu-surface) 28%); }
  :global(.menu-row.on) { background: color-mix(in srgb, var(--menu-pill-on) 14%, var(--menu-surface)); border-color: color-mix(in srgb, var(--menu-pill-on) 72%, var(--menu-border) 28%); }
  
  :global(.menu-row-state) {
    font-size: 10px; font-weight: 700; color: var(--menu-muted); flex-shrink: 0; background: var(--menu-pill); padding: 2px 8px; border-radius: 999px; transition: all .15s;
  }
  :global(.menu-row.on .menu-row-state) {
    background: var(--menu-pill-on); color: var(--menu-pill-on-fg);
  }

  :global(.welcome-overlay) {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;
    z-index: 11000; backdrop-filter: blur(8px);
  }
  :global(.welcome-card) {
    background: var(--menu-surface); color: var(--menu-fg); padding: 48px 40px; border-radius: 32px;
    width: 90%; max-width: 480px; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,0.5); border: 1px solid var(--menu-border); position: relative;
  }

  :global(.help-modal) { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
  :global(.help-modal.open) { display: flex; }
  :global(.help-card) { background: var(--panel); color: var(--fg); border: 1px solid var(--border); border-radius: 24px; padding: 40px; max-width: 680px; width: 95%; max-height: 90vh; overflow-y: auto; position: relative; line-height: 1.5; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }

  :global(.toast-pill) {
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: var(--menu-pill-on); color: var(--menu-pill-on-fg);
    padding: 10px 24px; border-radius: 999px; font-size: 14px; font-weight: 700;
    z-index: 12000; box-shadow: 0 8px 30px rgba(0,0,0,0.3); pointer-events: none;
    animation: toast-fade-in-out 2.5s forwards;
  }

  @keyframes toast-fade-in-out {
    0% { opacity: 0; transform: translate(-50%, -10px); }
    10% { opacity: 1; transform: translate(-50%, 0); }
    90% { opacity: 1; transform: translate(-50%, 0); }
    100% { opacity: 0; transform: translate(-50%, -10px); }
  }

  @keyframes psychedelic-bg-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
</style>
