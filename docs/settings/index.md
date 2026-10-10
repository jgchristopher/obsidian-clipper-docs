---
sidebar_position: 1
title: Managing Clippers
---

# Managing clippers

Open **Settings → Clipper** to see all your clippers.

![The Clipper settings tab](/img/manual/settings-tab.png)

Each row shows the clipper's name, type, and when it was created, with two icons:

- **Gear:** opens **Edit Clipper Settings**.
- **Trash:** deletes the clipper. This happens immediately, with no confirmation. The trash icon is hidden when only one clipper is left, so you always have at least one.

## Add a clipper

Click **+**, enter a name, choose a type, and click **Add Clipper**. The button stays disabled until both are filled in. The new clipper starts with default settings. Click its gear icon to set its note and heading.

![The Add New Clipper form](/img/manual/add-clipper.png)

## Edit a clipper

The editor has the clipper's name and target at the top, and three tabs below:

- [Base](./base.md): where in the note clippings go, and how entries look.
- [Browser](./browser.md): the clipper's bookmarklet and browser options.
- [Advanced](./advanced.md): storing full highlights in a note per website.

Changes save as you make them.

## Delete a clipper

Deleting a clipper doesn't remove its bookmarklet from your browser. Clicking that bookmarklet later shows a notice that the clipper no longer exists. Remove the bookmark from your browser by hand.

## Which changes need a new bookmarklet

A bookmarklet only carries the clipper's ID, your vault's name, and two settings. Everything else is read when the clipping arrives, so most changes apply to the bookmarklet you already have.

| Change | Drag the bookmarklet again? |
| --- | --- |
| Note, heading, position, template, tags, formats, advanced storage | No |
| **Header Level** | Yes. It controls how page headings are nested in the clipping. |
| **Capture Comment in Browser** | Yes |
| Renaming your vault | Yes |
