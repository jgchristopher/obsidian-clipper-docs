# Manual screenshots

`capture.mjs` regenerates every image in `static/img/manual/` from a real Obsidian.

```sh
node scripts/screenshots/capture.mjs                 # all shots, about a minute
node scripts/screenshots/capture.mjs editors migration  # only these
```

Requirements:

- A built plugin checkout (`pnpm build`). Set `CLIPPER_REPO` if it isn't at `~/gitprojects/obsidian-clipper/multiple_clippers`.
- Obsidian and Google Chrome in `/Applications` (override with `OBSIDIAN_APP` and `CHROME_APP`).
- Node 22 or later, for the built-in `WebSocket`.

What it does:

1. Seeds a throwaway vault named **My Vault** in the system temp folder with the plugin repo's `pnpm seed-vault`, trims it to the five clippers the manual shows, sets the dark theme, and writes reader-friendly note contents.
2. Launches a second Obsidian with its own profile and `--remote-debugging-port=9333`. Your everyday Obsidian and vaults are untouched. The first run downloads the latest Obsidian into that profile, so the script restarts once to use it.
3. Drives Obsidian over the Chrome DevTools Protocol (`cdp.mjs`): opens settings, clicks through each clipper's editor, sends clippings straight to the plugin's `obsidian://` handler, and captures elements at 2x.
4. Runs `article.html` in headless Chrome for the browser-side shots (selection and comment box).

The viewport is emulated, so window managers that resize or tile windows don't affect the output.

Shot names are the keys of `SHOTS` in `capture.mjs`.
