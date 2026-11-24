// Checks that the library works with a given Svelte install, normally the
// oldest version the peer range allows. The dev tooling needs a newer Svelte,
// so this does not run the test suite. It compiles every component for client
// and server with that compiler, and checks that every named import the
// library takes from `svelte` or `svelte/*` exists in that version.
//
// Usage: node scripts/check-svelte-compat.mjs <path to node_modules/svelte>

import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const svelteDir = process.argv[2];
if (!svelteDir) {
	console.error('Usage: node scripts/check-svelte-compat.mjs <path to node_modules/svelte>');
	process.exit(2);
}

const root = resolve(import.meta.dirname, '..');
const libDir = join(root, 'src/lib');
const require = createRequire(join(resolve(svelteDir), 'package.json'));
const { version } = require('./package.json');
// `svelte/compiler` resolves to a CommonJS bundle under `require`, so `compile` sits on `default`.
const compiler = await import(pathToFileURL(require.resolve('svelte/compiler')).href);
const compile = compiler.compile ?? compiler.default.compile;

function sources(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return sources(path);
		if (/\.(test|spec)\./.test(entry.name)) return [];
		return /\.(svelte|ts|js)$/.test(entry.name) ? [path] : [];
	});
}

const failures = [];
const wanted = new Map();

for (const file of sources(libDir)) {
	const name = relative(root, file);
	const code = readFileSync(file, 'utf8');

	if (file.endsWith('.svelte')) {
		for (const generate of ['client', 'server']) {
			try {
				compile(code, { filename: file, generate });
			} catch (error) {
				failures.push(`${name} (${generate}): ${String(error.message).split('\n')[0]}`);
			}
		}
	}

	for (const [, clause, specifier] of code.matchAll(
		/import\s+(?!type\b)\{([^}]*)\}\s+from\s+['"](svelte(?:\/[\w-]+)?)['"]/g
	)) {
		const names = wanted.get(specifier) ?? new Set();
		for (const part of clause.split(',')) {
			const imported = part.trim().split(/\s+as\s+/)[0];
			if (imported && !imported.startsWith('type ')) names.add(imported);
		}
		wanted.set(specifier, names);
	}
}

for (const [specifier, names] of wanted) {
	let mod;
	try {
		mod = await import(pathToFileURL(require.resolve(specifier)).href);
	} catch (error) {
		failures.push(`${specifier}: cannot load (${String(error.message).split('\n')[0]})`);
		continue;
	}
	for (const imported of names) {
		if (!(imported in mod)) failures.push(`${specifier}: no export named ${imported}`);
	}
}

const imports = [...wanted].map(([s, n]) => `${s} {${[...n].join(', ')}}`).join('; ');
if (failures.length) {
	console.error(`svelte@${version} cannot run this library:\n  ${failures.join('\n  ')}`);
	process.exit(1);
}
console.log(`svelte@${version}: components compile for client and server; imports resolve (${imports}).`);
