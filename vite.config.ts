import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	server: {
		host: '127.0.0.1',
		port: 4731,
		strictPort: true
	},
	preview: {
		host: '127.0.0.1',
		port: 4731,
		strictPort: true
	},
	test: {
		// `npm run package` copies tests into dist/ and .svelte-kit/; run only the sources.
		include: ['src/**/*.test.ts']
	},
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto supports Vercel, same as the sibling library.
			// See https://svelte.dev/docs/kit/adapter-auto
			adapter: adapter()
		})
	]
});
