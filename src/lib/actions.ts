export function clickOutside(node: HTMLElement, cb: () => void) {
  function handle(e: MouseEvent) {
    if (!node.contains(e.target as Node)) cb();
  }
  document.addEventListener('click', handle, true);
  return { destroy() { document.removeEventListener('click', handle, true); } };
}
