<script lang="ts">
	import favicon from '../assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import '../app.css';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Morph — a status icon for Svelte</title>
	<meta
		name="description"
		content="A Svelte 5 status icon that pours between idle, loading, success, error, and warning."
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{@render children()}
