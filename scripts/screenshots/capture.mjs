// Regenerates the manual's screenshots from a real Obsidian.
//
//   node scripts/screenshots/capture.mjs [shot-name ...]
//
// Seeds a throwaway vault with the plugin repo's seed script, launches a
// separate Obsidian instance (its own profile, so your running Obsidian is
// untouched) with remote debugging, and captures every screen over the
// DevTools protocol. With shot names, only those shots run.
//
// Environment:
//   CLIPPER_REPO  plugin checkout, built with `pnpm build`
//                 (default ~/gitprojects/obsidian-clipper/multiple_clippers)
//   OBSIDIAN_APP  default /Applications/Obsidian.app
//   CHROME_APP    default /Applications/Google Chrome.app
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Page, sleep, waitForTarget } from './cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../../static/img/manual');
const CLIPPER_REPO =
	process.env.CLIPPER_REPO ??
	path.join(homedir(), 'gitprojects/obsidian-clipper/multiple_clippers');
const OBSIDIAN_APP = process.env.OBSIDIAN_APP ?? '/Applications/Obsidian.app';
const CHROME_APP = process.env.CHROME_APP ?? '/Applications/Google Chrome.app';
const WORK = path.join(tmpdir(), 'clipper-docs-screenshots');
const VAULT = path.join(WORK, 'My Vault');
const OBSIDIAN_PORT = 9333;
const CHROME_PORT = 9334;

// The clippers shown in the manual. Seeded clippers are renamed or dropped.
const CLIPPERS = {
	Daily: 'Daily Note',
	Weekly: 'Weekly Review',
	Rust: 'Rust Reading',
	'Research (advanced storage)': 'Research',
	'Research Board': 'Research Board',
};

const ARTICLE = {
	url: 'https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html',
	title: 'What Is Ownership? - The Rust Programming Language',
	highlightdata: [
		'Ownership is a set of rules that govern how a Rust program manages memory.',
		'',
		'- Each value in Rust has an owner.',
		'- There can only be one owner at a time.',
		'- When the owner goes out of scope, the value will be dropped.',
	].join('\n'),
};

const SECOND_SITE = {
	url: 'https://blog.rust-lang.org/2024/10/17/Rust-1.82.0.html',
	title: 'Announcing Rust 1.82.0 | Rust Blog',
	highlightdata: 'Rust 1.82.0 adds `cargo info`, a command that shows information about a package in the registry.',
};

// --- setup ----------------------------------------------------------------

function seedVault() {
	// The profile survives runs so Obsidian's self-update is downloaded once.
	rmSync(VAULT, { recursive: true, force: true });
	rmSync(path.join(WORK, 'chrome'), { recursive: true, force: true });
	mkdirSync(WORK, { recursive: true });
	execFileSync('pnpm', ['seed-vault', VAULT, '--force'], {
		cwd: CLIPPER_REPO,
		stdio: 'inherit',
	});

	const obsidian = path.join(VAULT, '.obsidian');
	writeFileSync(path.join(obsidian, 'appearance.json'), JSON.stringify({ theme: 'obsidian' }));

	// Notes as a reader would have them. Obsidian's inline title shows each
	// note's name, so none starts with a # title.
	const notes = {
		'Templates/Daily Note.md': '## Clippings\n\n## Notes\n',
		'Topics/Rust.md': [
			'Reading notes while working through the Rust book.',
			'',
			'## Clips',
			'',
			'- [ ] [The Rust Programming Language](https://doc.rust-lang.org/book/) #rust',
			'',
			'## Notes',
			'',
			'Borrowing next: how references avoid moving ownership.',
			'',
		].join('\n'),
		'Topics/Research.md': 'Articles worth keeping. The full highlights live in `Clippings/`.\n',
	};
	for (const [file, text] of Object.entries(notes)) writeFileSync(path.join(VAULT, file), text);

	const dataPath = path.join(obsidian, 'plugins/obsidian-clipper/data.json');
	const data = JSON.parse(readFileSync(dataPath, 'utf8'));
	data.clippers = data.clippers
		.filter((c) => c.name in CLIPPERS)
		.map((c) => ({ ...c, name: CLIPPERS[c.name], createdAt: '2026-10-01T12:00:00.000Z' }));
	writeFileSync(dataPath, JSON.stringify(data, null, '\t'));

	// A profile that knows only this vault, so Obsidian opens straight into it.
	const profile = path.join(WORK, 'profile');
	mkdirSync(profile, { recursive: true });
	writeFileSync(
		path.join(profile, 'obsidian.json'),
		JSON.stringify({ vaults: { d0c5d0c5d0c5d0c5: { path: VAULT, ts: Date.now(), open: true } } })
	);
	return profile;
}

async function launchObsidian(profile) {
	const proc = spawn(
		path.join(OBSIDIAN_APP, 'Contents/MacOS/Obsidian'),
		[`--user-data-dir=${profile}`, `--remote-debugging-port=${OBSIDIAN_PORT}`],
		{ stdio: 'ignore' }
	);
	const target = await waitForTarget(OBSIDIAN_PORT, (t) => t.title.includes('My Vault'));
	const main = await Page.connect(target);
	await main.viewport(1200, 780);

	// First open of a vault with community plugins asks for trust.
	for (let i = 0; i < 40; i++) {
		const state = await main.eval(() => {
			const trust = [...document.querySelectorAll('.modal button')].find((b) =>
				b.textContent.includes('Trust author')
			);
			if (trust) trust.click();
			return !!window.app?.plugins?.plugins?.['obsidian-clipper'];
		});
		if (state) break;
		await sleep(500);
	}
	await sleep(1500);
	return { proc, main };
}

// A fresh Obsidian profile starts on the bundled app version and downloads
// the current one in the background. Restart once so shots use the latest.
async function restartIfUpdated(profile, proc, main) {
	const version = () => main.eval(() => document.title.match(/Obsidian ([\d.]+)/)?.[1]);
	await sleep(1000);
	const before = await version();
	await sleep(6000);
	main.close();
	proc.kill();
	await sleep(2000);
	const next = await launchObsidian(profile);
	main = next.main;
	console.log(`Obsidian ${before} -> ${await version()}`);
	return next;
}

// --- helpers --------------------------------------------------------------

async function clip(main, clipperName, params) {
	await main.eval(
		async (name, p) => {
			const plugin = app.plugins.plugins['obsidian-clipper'];
			const clipper = plugin.settings.clippers.find((c) => c.name === name);
			const handler = app.workspace.protocolHandler.handlers.get('obsidian-clipper');
			await handler({ action: 'obsidian-clipper', ...p, clipperId: clipper?.clipperId ?? p.clipperId });
		},
		clipperName,
		params
	);
	await sleep(600);
}

async function openSettings(main) {
	await main.eval(() => {
		app.setting.open();
		app.setting.openTabById('obsidian-clipper');
	});
	const target = await waitForTarget(OBSIDIAN_PORT, (t) => t.title.startsWith('Settings'));
	const settings = await Page.connect(target);
	await settings.viewport(1100, 760);
	await sleep(500);
	return settings;
}

async function closeSettings(main, settings) {
	settings.close();
	await main.eval(() => app.setting.close());
	await sleep(500);
}

// Opens a clipper's editor on a tab, grown to full height so nothing scrolls.
async function openEditor(settings, clipperName, tab) {
	await settings.viewport(1100, 2200);
	await settings.eval((name) => {
		const rows = [...document.querySelectorAll('.vertical-tab-content tr')];
		const row = rows.find((r) => r.textContent.includes(name));
		row.querySelector('.lucide-settings').closest('.clickable-icon').click();
	}, clipperName);
	await sleep(500);
	await settings.eval((tabName) => {
		const modal = [...document.querySelectorAll('.clipper-settings-modal')].pop();
		modal.setAttribute('data-shot', 'editor');
		[...modal.querySelectorAll('.clp-tab-bar span')]
			.find((t) => t.textContent.trim() === tabName)
			.click();
	}, tab);
	await sleep(300);
	await settings.eval(() => {
		const modal = document.querySelector('[data-shot=editor]');
		modal.style.maxHeight = 'none';
		modal.style.height = 'auto';
		for (const el of modal.querySelectorAll('*')) {
			const cs = getComputedStyle(el);
			if (/(auto|scroll)/.test(cs.overflowY)) {
				el.style.overflow = 'visible';
				el.style.maxHeight = 'none';
				el.style.height = 'auto';
			}
		}
		document.activeElement?.blur();
	});
	await sleep(400);
}

async function closeEditor(settings) {
	await settings.eval(() => {
		for (const modal of document.querySelectorAll('.clipper-settings-modal')) {
			modal.querySelector('.modal-close-button, .modal-header-button')?.click();
		}
	});
	await settings.viewport(1100, 760);
	await sleep(400);
}

async function openFile(main, file, { width = 1200, height = 780 } = {}) {
	await main.viewport(width, height);
	await main.eval(async (f) => {
		app.workspace.leftSplit.collapse();
		app.workspace.rightSplit.collapse();
		app.vault.setConfig('propertiesInDocument', 'hidden');
		const leaf = app.workspace.getLeaf(false);
		await leaf.openFile(app.vault.getAbstractFileByPath(f));
		if (leaf.view.getViewType() === 'markdown') {
			await leaf.setViewState({ ...leaf.getViewState(), state: { ...leaf.getViewState().state, mode: 'preview' } });
		}
		document.activeElement?.blur();
	}, file);
	await sleep(800);
}

const today = (fmt) => `globalThis.moment().format(${JSON.stringify(fmt)})`;

// --- shots ----------------------------------------------------------------

const SHOTS = {
	async 'settings-tab'({ main }) {
		const settings = await openSettings(main);
		// The tab fills the window. Shrink it to its content.
		await settings.eval(() => {
			const tab = document.querySelector('.vertical-tab-content');
			tab.style.height = 'fit-content';
			tab.style.paddingBottom = '24px';
		});
		await settings.shot(`${OUT}/settings-tab.png`, '.vertical-tab-content');
		await closeSettings(main, settings);
	},

	async 'add-clipper'({ main }) {
		const settings = await openSettings(main);
		await settings.eval(() => {
			[...document.querySelectorAll('.vertical-tab-content button')]
				.find((b) => b.textContent.trim() === '+')
				.click();
		});
		await sleep(400);
		await settings.eval(() => {
			const heading = [...document.querySelectorAll('.setting-item-name')].find(
				(e) => e.textContent.trim() === 'Add New Clipper'
			);
			const input = heading.closest('div:has(input)')?.querySelector('input');
			if (input) {
				input.value = 'Rust Reading';
				input.dispatchEvent(new Event('input'));
			}
			const select = heading.closest('div:has(select)')?.querySelector('select');
			if (select) {
				select.value = 'topic';
				select.dispatchEvent(new Event('change'));
			}
			document.activeElement?.blur();
			let box = heading;
			while (box.parentElement && !box.parentElement.querySelector(':scope > button')) {
				box = box.parentElement;
				if (getComputedStyle(box).borderTopWidth !== '0px') break;
			}
			box.setAttribute('data-shot', 'add-clipper');
		});
		await settings.shot(`${OUT}/add-clipper.png`, '[data-shot=add-clipper]', 8);
		await closeSettings(main, settings);
	},

	async editors({ main }) {
		const settings = await openSettings(main);
		const shots = [
			['Daily Note', 'Base', 'editor-daily-base'],
			['Weekly Review', 'Base', 'editor-weekly-base'],
			['Rust Reading', 'Base', 'editor-topic-base'],
			['Research Board', 'Base', 'editor-canvas-base'],
			['Rust Reading', 'Browser', 'editor-browser'],
			['Research', 'Advanced', 'editor-advanced'],
		];
		for (const [name, tab, file] of shots) {
			await openEditor(settings, name, tab);
			await settings.shot(`${OUT}/${file}.png`, '[data-shot=editor]');
			await closeEditor(settings);
		}
		await closeSettings(main, settings);
	},

	async 'clipper-view'({ main }) {
		await main.viewport(1200, 780);
		await main.eval(async () => {
			app.workspace.rightSplit.expand();
			app.commands.executeCommandById('obsidian-clipper:show-clipper-view');
			await new Promise((r) => setTimeout(r, 500));
			const [leaf] = app.workspace.getLeavesOfType('Clipper');
			if (leaf) app.workspace.revealLeaf(leaf);
			document.activeElement?.blur();
		});
		await sleep(400);
		await main.shot(`${OUT}/clipper-view.png`, '.workspace-split.mod-right-split');
	},

	async 'result-daily'({ main }) {
		await clip(main, 'Daily Note', ARTICLE);
		const file = await main.eval(new Function(`return 'Daily/' + ${today('YYYY-MM-DD')} + '.md'`));
		await openFile(main, file, { width: 1000, height: 640 });
		await main.shot(`${OUT}/result-daily.png`, '.workspace-split.mod-root');
	},

	async 'result-topic'({ main }) {
		await clip(main, 'Rust Reading', ARTICLE);
		await openFile(main, 'Topics/Rust.md', { width: 1000, height: 640 });
		await main.shot(`${OUT}/result-topic.png`, '.workspace-split.mod-root');
	},

	async 'result-advanced'({ main }) {
		await clip(main, 'Research', ARTICLE);
		await openFile(main, 'Topics/Research.md', { width: 1000, height: 560 });
		await main.shot(`${OUT}/result-advanced-target.png`, '.workspace-split.mod-root');
		await openFile(main, 'Clippings/doc.rust-lang.org.md', { width: 1000, height: 560 });
		await main.shot(`${OUT}/result-advanced-domain.png`, '.workspace-split.mod-root');
	},

	async 'result-canvas'({ main }) {
		await clip(main, 'Research Board', ARTICLE);
		await clip(main, 'Research Board', SECOND_SITE);
		await openFile(main, 'Boards/Research Board.canvas', { width: 1200, height: 800 });
		await main.eval(() => {
			const view = app.workspace.activeLeaf.view;
			view.canvas?.zoomToFit();
		});
		await sleep(800);
		await main.shot(`${OUT}/result-canvas.png`, '.workspace-split.mod-root');
	},

	async migration({ main }) {
		await main.viewport(1000, 640);
		await clip(main, null, { ...ARTICLE, clipperId: '', notePath: 'Topics/Rust.md' });
		await main.shot(`${OUT}/migrate-topic.png`, '.modal');
		await main.eval(() => document.querySelector('.modal .modal-close-button')?.click());
		await sleep(600);
		// Closing that dialog opens the new clipper's editor. Close it too.
		await main.eval(() => {
			for (const b of document.querySelectorAll('.modal .modal-close-button')) b.click();
		});
		await sleep(400);
		await clip(main, null, { ...ARTICLE, clipperId: '' });
		await main.shot(`${OUT}/migrate-daily.png`, '.modal');
		await main.eval(() => document.querySelector('.modal .modal-close-button')?.click());
		await sleep(600);
		await main.eval(() => app.setting.close());
	},

	async 'notice-unknown-clipper'({ main }) {
		await main.viewport(1000, 640);
		await clip(main, null, { ...ARTICLE, clipperId: 'deleted-clipper' });
		await main.shot(`${OUT}/notice-unknown-clipper.png`, '.notice');
	},

	async 'comment-prompt'({ main }) {
		// Turn comments on in the Browser tab and take the bookmarklet it shows.
		const settings = await openSettings(main);
		await openEditor(settings, 'Rust Reading', 'Browser');
		await settings.eval(() => {
			const box = document.querySelector('[data-shot=editor] input[type=checkbox]');
			if (!box.checked) box.click();
		});
		await sleep(400);
		const code = await settings.eval(
			() => document.querySelector('[data-shot=editor] a[href^="javascript:"]').href
		);
		await closeEditor(settings);
		await closeSettings(main, settings);

		const chrome = spawn(
			path.join(CHROME_APP, 'Contents/MacOS/Google Chrome'),
			[
				'--headless=new',
				`--remote-debugging-port=${CHROME_PORT}`,
				`--user-data-dir=${path.join(WORK, 'chrome')}`,
				`file://${path.join(HERE, 'article.html')}`,
			],
			{ stdio: 'ignore' }
		);
		try {
			const page = await Page.connect(
				await waitForTarget(CHROME_PORT, (t) => t.url.includes('article.html'))
			);
			await page.viewport(900, 640);
			await page.eval(() => {
				const range = document.createRange();
				range.selectNodeContents(document.getElementById('clip'));
				getSelection().removeAllRanges();
				getSelection().addRange(range);
			});
			await page.shot(`${OUT}/select-text.png`);
			await page.eval((js) => {
				new Function(decodeURIComponent(js.replace(/^javascript:/, '')))();
			}, code);
			await sleep(500);
			await page.shot(`${OUT}/comment-prompt.png`);
			page.close();
		} finally {
			chrome.kill();
		}
	},
};

// --- main -----------------------------------------------------------------

mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
const profile = seedVault();
let { proc, main } = await launchObsidian(profile);
({ proc, main } = await restartIfUpdated(profile, proc, main));
try {
	for (const [name, run] of Object.entries(SHOTS)) {
		if (only.length && !only.includes(name)) continue;
		console.log(name);
		await run({ main });
	}
} finally {
	main.close();
	proc.kill();
}
