import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

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
