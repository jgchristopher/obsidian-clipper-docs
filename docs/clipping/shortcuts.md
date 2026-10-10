---
sidebar_position: 2
title: Apple Shortcuts
---

# Apple Shortcuts

Each clipper has a Shortcuts URL for sending text to it from an Apple Shortcut, for example from the share sheet on iPhone or iPad.

Copy it from the [Clipper view](./commands.md#clipper-view) with **Shortcuts URL**. It looks like this:

```
obsidian://obsidian-clipper?clipperId=<id>&vault=<vault>&url=shortcut&title=<<replace title>>&highlightdata=<<replace content>>
```

In your Shortcut, replace `<<replace title>>` and `<<replace content>>` with the text to save, URL-encoded, then open the URL.

Differences from the bookmarklet:

- The text is saved as is. There is no Markdown conversion and no comment.
- The source is recorded as `shortcut` instead of a web address. With [advanced storage](../settings/advanced.md), clippings go to a note named `shortcut`.
