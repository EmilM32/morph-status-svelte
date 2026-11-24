import { dev } from '$app/env';
import { error } from '@sveltejs/kit';

// Fixture for the Playwright tests in e2e/. Served by `vite dev` only, never in a build.
export function load() {
	if (!dev) error(404, 'Not found');
}
