<script lang="ts">
  let { title, copy }: { title: string; copy: string } = $props();
</script>

<div class="section-hero">
  <div class="section-title">{title}</div>
  <div class="section-copy">{copy}</div>
</div>
