---
sidebar_position: 1
title: Overview
---

# Clipper types

A clipper's type decides which note it writes to. You pick the type when you add the clipper.

| Type | Writes to | Needs |
| --- | --- | --- |
| [Daily](./daily.md) | Today's daily note, created if it doesn't exist | Core Daily notes, or Periodic Notes with daily notes on |
| [Weekly](./weekly.md) | This week's weekly note, created if it doesn't exist | Periodic Notes with weekly notes on, or Calendar |
| [Topic](./topic.md) | One note you choose | Nothing |
| [Canvas](./canvas.md) | One canvas you choose, as cards grouped by website | Core Canvas |

Daily, weekly, and topic clippers write a Markdown entry into the note, optionally under a heading. Canvas clippers add a card to the canvas instead.

Any type can also use [advanced storage](../settings/advanced.md), which keeps the full highlight in a separate note per website and puts an embed in the clipper's note.
