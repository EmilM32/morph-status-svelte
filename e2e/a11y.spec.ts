import { expect, test } from './fixture.js';

test.describe('accessibility tree', () => {
	test.use({ reducedMotion: 'reduce' });

	test('polite: a status that follows the state', async ({ fixture }) => {
		await fixture.set({ label: 'Upload', state: 'loading' });
		await expect(fixture.page.locator('#icon')).toMatchAriaSnapshot('- status: "Upload: Loading"');
	});

	test('image: a named image', async ({ fixture }) => {
		await fixture.set({ a11y: 'image', label: 'Build', state: 'success' });
		await expect(fixture.page.locator('#icon')).toMatchAriaSnapshot(`- 'img "Build: Success"'`);
	});

	test('hidden: nothing', async ({ fixture }) => {
		await fixture.set({ a11y: 'hidden', state: 'error' });
		expect(await fixture.page.locator('#icon').ariaSnapshot()).toBe('');
	});

	test('a region that appears with a state change fills its text a moment later', async ({ fixture }) => {
		await fixture.set({ a11y: 'hidden' });
		await fixture.set({ a11y: 'polite', state: 'warning' });
		const text = fixture.page.locator('#icon .sr');
		await expect(text).toHaveText('');
		await expect(text).toHaveText('Warning');
	});
});
