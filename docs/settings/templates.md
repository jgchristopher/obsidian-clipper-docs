---
sidebar_position: 5
title: Entry Templates
---

# Entry templates

An entry template is a note that sets the layout of each clipping. Choose it in **Clipped Entry Template** on the [Base tab](./base.md). Templates apply to daily, weekly, and topic clippers. Canvas clippers ignore them.

## Variables

| Variable | Replaced with |
| --- | --- |
| `{{title}}` | The page title |
| `{{url}}` | The page address |
| `{{content}}` | The clipped text as Markdown, or the embed when [advanced storage](./advanced.md) is on |
| `{{comment}}` | The comment typed in the browser, or nothing |
| `{{tags}}` | The clipper's tags, for example `#rust #toread` |
| `{{date}}` | The date, in the clipper's Date Format |
| `{{time}}` | The time, in the clipper's Time Format |

Variable names ignore case and spaces inside the braces, so `{{ Title }}` works. Anything else in braces, such as Templater syntax, is left as is.

## Example

```markdown
- [ ] [{{title}}]({{url}}) {{tags}}

{{content}}
___
```

## Default layout

With no template, each entry is a task-list item linking to the page, followed by the clipped text, the comment as a quote, and a horizontal rule:

```markdown
- [ ] [What Is Ownership? - The Rust Programming Language](https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html) #rust #toread
Ownership is a set of rules that govern how a Rust program manages memory.
 > A comment typed in the browser

---
```

If the template note can't be found, Clipper shows a notice naming the path and uses the default layout.
