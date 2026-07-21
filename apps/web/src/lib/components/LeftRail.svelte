<script lang="ts">
  import { page } from '$app/stores';
  const items = [
    { href: '/', label: 'Repositories' },
    { href: '/operations', label: 'Operations' },
    { href: '/tracks', label: 'Tracks' },
    { href: '/reports', label: 'Reports' }
  ];
</script>

<nav class="leftrail">
  {#each items as it}
    <a
      href={it.href}
      class:active={$page.url.pathname === it.href ||
        ($page.url.pathname.startsWith(it.href + '/') && it.href !== '/')}
    >{it.label}</a>
  {/each}
</nav>
