# Meridian News Network

A static, fictional news-portal page for a Halloween art project. No build step.

## Run

From this folder:

```
python3 -m http.server 8000
```

or `npx serve`. Then open http://localhost:8000/. Opening `index.html` straight from disk won't work, because the page has to fetch `content.json`.

## Edit

All copy, image paths and section order live in `content.json`. Edit it, save, refresh.

- **Headlines:** change any `headline`. Setting a headline to a number uses that entry from `altHeadlines` (`0` = "SKIES TURN RED", `2` = "DO NOT LOOK UP", and so on).
- **Breaking banner:** set `"enabled": false` on the `breaking` section to hide it.
- **Ticker:** set `"enabled": false` on the `ticker` section to hide it. `secondsPerItem` sets the scroll speed.
- **Trending strip:** shows the first `max` items (6), so you can keep spares in the list.
- **Section order:** move entries around in the `sections` array, or delete them.
- **Lead story:** clicking the main headline or the breaking banner opens `stories.lead`. Any other headline opens a short "developing story" view built from `meta.storyFallback`.

## Media

Drop files into `media/` and set the slot's `src`, e.g. `"src": "media/red-sky.jpg"`.

- An empty `src` shows a gray box with the slot id in the corner (e.g. `hero-main`). Search `content.json` for that id to find the slot.
- A `src` that points at a missing file shows the slot id in red with "file not found".
- Video: set `"video": true`. If `src` ends in `.mp4` or `.webm` it plays muted on hover. `duration` adds the time chip.
- Aspect: 16:9 by default. Override per slot with `"aspect": "4:3"`, `"1:1"` or `"9:16"`.
- `caption` and `credit` print under the image.

## Column items

Columns in the hero, band, wide, grid and dark sections hold a list of `items`. Each item's `kind` picks how it renders:

| kind | renders as |
|---|---|
| `card` | image, optional tag, headline |
| `thumb` | small image left, headline right |
| `text` | headline only, with a rule above |
| `overlay` | image with headline on a dark gradient (`"rule": true` adds the short white line) |
| `promo` | dark tile with a show title, then a headline |
| `lead` | the giant hero headline, image, deck and related links |
| `row` | several cards side by side |
| `label` | a section label |

Optional on any card: `tag` (with `"tagStyle": "live"` for red, `"exclusive"` for crimson caps), `duration`, `"gallery": true`, `size` (`xs`, `sm`, `md`, `lg`, `xl`, `xxl`).

Colors are CSS custom properties at the top of `styles.css`.
