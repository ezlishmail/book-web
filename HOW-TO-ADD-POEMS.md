# How to add poems to the book

## Your folder structure
```
your-github-repo/
├── index.html
├── jquery.js
├── turn.js
├── images/
│   └── cover.jpg         ← your cover image
└── poems/
    ├── poems-list.json   ← THE MASTER LIST (edit this when adding poems)
    ├── 01-first-poem.txt
    ├── 02-second-poem.txt
    └── ...
```

## Step 1 — Write the poem as a .txt file

Create a new file in the `poems/` folder. Name it like:
`26-new-poem-title.txt`

The format is simple:
```
The Title Of The Poem

First line of the poem goes here.
Second line here.

Blank line above = stanza break.
Keep going as long as needed.
```

The **first line** is always the title.
Leave one blank line after the title, then write the poem.
Use blank lines between stanzas.

## Step 2 — Add it to poems-list.json

Open `poems/poems-list.json` and add your filename to the list:

```json
[
  "01-first-poem.txt",
  "02-second-poem.txt",
  "26-new-poem-title.txt"
]
```

The order in this list = the order poems appear in the book.

## Step 3 — Push to GitHub

Commit and push. Done. The book updates automatically.

---

## To change the book title, author name, or cover image

Open `index.html` and find the CONFIG section near the top of the `<script>`:

```js
var CONFIG = {
  bookTitle:  "Verses",
  authorName: "Your Name",
  coverImage: "images/cover.jpg",
  ...
};
```

Edit those values and push.
