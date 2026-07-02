# Pocket Weissenborn

A playable Open D fretboard for sketching lap-steel ideas when the real
Weissenborn isn't within reach. Tap any fret to pluck the note; sweep a finger
across the strings to strum. Built for iPhone (landscape), works anywhere with
a browser.

- **Tuning:** Open D — D A D F♯ A D (low to high), strings shown high-to-low, tab-style
- **Sound:** Karplus-Strong plucked-string synthesis (Web Audio, no samples, works offline)
- **App:** installable PWA — open the site in Safari, Share → *Add to Home Screen*

## Development

No build step — plain ES modules. Serve the directory statically:

```
python3 -m http.server 8123
```

Releases are picked up by clients via the service worker: bump `VERSION` in
`sw.js` whenever files change.

## Roadmap

- [x] Playable fretboard (tap to pluck, drag to strum, multi-touch)
- [x] PWA install + offline
- [ ] Bar + strum mode (virtual steel bar)
- [ ] Scale/key highlighting
- [ ] Chord position guide
- [ ] Looper / idea recorder
