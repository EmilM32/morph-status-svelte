<script lang="ts">
	import favicon from '../assets/favicon.svg';
	import type { LayoutProps } from './$types';
	// Self-hosted, so the demo sends no requests to Google.
	import '@fontsource/instrument-serif/400.css';
	import '@fontsource/instrument-serif/400-italic.css';
	import '@fontsource/outfit/400.css';
	import '@fontsource/outfit/500.css';
	import '@fontsource/outfit/600.css';
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
</svelte:head>

{@render children()}
