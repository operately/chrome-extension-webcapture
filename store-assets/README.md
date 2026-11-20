# Store assets

- `screenshot-1.png`: 1280×800 Chrome Web Store screenshot.
- `promo-small.png`: 440×280 required small promotional image.
- The matching SVG files are the editable sources.
- Store copy, privacy answers, permission justifications, and reviewer steps are in `STORE_LISTING.md`.

Regenerate the PNG assets with:

```sh
magick store-assets/screenshot-1.svg store-assets/screenshot-1.png
magick store-assets/promo-small.svg store-assets/promo-small.png
```
