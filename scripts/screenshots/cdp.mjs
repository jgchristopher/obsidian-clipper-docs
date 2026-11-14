// A minimal Chrome DevTools Protocol client for Obsidian (Electron) and Chrome.
import { writeFileSync } from 'node:fs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function waitForTarget(port, match, timeoutMs = 20000) {
	const end = Date.now() + timeoutMs;
	while (Date.now() < end) {
		try {
			const targets = await (await fetch(`http://localhost:${port}/json/list`)).json();
			const target = targets.find((t) => t.type === 'page' && match(t));
			if (target) return target;
		} catch {
			// The debugging port is not up yet.
		}
		await sleep(250);
	}
	throw new Error(`No debugging target on port ${port} matched ${match}`);
}

export class Page {
	static async connect(target) {
		const page = new Page(new WebSocket(target.webSocketDebuggerUrl));
		await new Promise((r, j) => {
			page.ws.addEventListener('open', r);
			page.ws.addEventListener('error', j);
		});
		return page;
	}

	constructor(ws) {
		this.ws = ws;
		this.id = 0;
		this.pending = new Map();
		ws.addEventListener('message', (e) => {
			const msg = JSON.parse(e.data);
			const done = this.pending.get(msg.id);
			if (!done) return;
			this.pending.delete(msg.id);
			done(msg);
		});
	}

	send(method, params = {}) {
		return new Promise((resolve, reject) => {
			const n = ++this.id;
			this.pending.set(n, (m) =>
				m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)
			);
			this.ws.send(JSON.stringify({ id: n, method, params }));
		});
	}

	// Window managers may resize the real window, so render at a fixed size.
	viewport(width, height) {
		return this.send('Emulation.setDeviceMetricsOverride', {
			width,
			height,
			deviceScaleFactor: 2,
			mobile: false,
		});
	}

	async eval(fn, ...args) {
		const expression = `(${fn})(...${JSON.stringify(args)})`;
		const r = await this.send('Runtime.evaluate', {
			expression,
			awaitPromise: true,
			returnByValue: true,
			userGesture: true,
		});
		if (r.exceptionDetails) {
			throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
		}
		return r.result.value;
	}

	// Captures the element matching selector (plus padding), or the viewport.
	async shot(out, selector, pad = 0) {
		let clip;
		if (selector) {
			const rect = await this.eval((sel) => {
				const el = document.querySelector(sel);
				if (!el) return null;
				const r = el.getBoundingClientRect();
				return { x: r.x, y: r.y, width: r.width, height: r.height };
			}, selector);
			if (!rect) throw new Error(`No element for ${selector}`);
			clip = {
				x: Math.max(0, rect.x - pad),
				y: Math.max(0, rect.y - pad),
				width: rect.width + 2 * pad,
				height: rect.height + 2 * pad,
				scale: 1,
			};
		}
		const { data } = await this.send('Page.captureScreenshot', {
			format: 'png',
			captureBeyondViewport: !!clip,
			...(clip ? { clip } : {}),
		});
		writeFileSync(out, Buffer.from(data, 'base64'));
		console.log(`  ${out}`);
	}

	close() {
		this.ws.close();
	}
}

export { sleep };
