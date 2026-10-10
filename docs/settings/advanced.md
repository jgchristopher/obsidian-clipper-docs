---
sidebar_position: 4
title: Advanced
---

# Advanced settings

## Store Clippings Per Domain

When this is on, the full highlight goes into a separate note for the website it came from, and the clipper's note gets an embed of it instead. Your daily note or topic note stays short, and each website's note collects everything you've clipped from it.

![The Advanced tab with Store Clippings Per Domain on](/img/manual/editor-advanced.png)

**Clipped Entry Storage Location** is the folder for those notes. It is created on the first clipping. Pick it from the list as you type.

### What gets written

Clipping from `doc.rust-lang.org` with the storage folder set to `Clippings`:

- `Clippings/doc.rust-lang.org.md` gets a new section, headed with the date and time, holding the clipped text and a footnote linking to the page.
- The clipper's note gets the entry as usual, but the entry's content is an embed of that section.

![The Research note showing an embedded clipping](/img/manual/result-advanced-target.png)

![The doc.rust-lang.org note holding the full clipping](/img/manual/result-advanced-domain.png)

Notes are per host name. `www.example.com` and `example.com` get separate notes.

Clicking the bookmarklet with nothing selected writes only a link entry, and nothing goes to the storage folder.
