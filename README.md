# Pocket Weissenborn

A playable fretboard for the Weissenborn lap slide guitar, for sketching song
ideas and trying sounds when the real instrument isn't within reach. Built for
iPhone in landscape, and it works in any modern browser on a phone or computer.

**Live app:** https://njsuthe.github.io/pocket-weissenborn/

## Install on your phone

- **iPhone:** open the link in **Safari**, tap Share, then *Add to Home Screen*.
- **Android:** open the link in Chrome, then menu, *Install app*.
- **Computer:** just open the link. Chrome and Edge also offer an Install button.

Once installed it runs full-screen and works offline.

## Features

- **Play it three ways:** tap a fret to pluck, sweep across the strings to
  strum, or drag along a string to **slide**. The pitch glides continuously and
  lands on the nearest fret when you let go. Multi-touch chords work.
- **Bar mode:** a virtual steel bar across the strings. Tap a fret to place it,
  swipe the strings to strum the barred chord, and drag it sideways to slide the
  whole ringing chord. It snaps to the nearest fret on release.
- **Tunings:** Open D, Open D minor, Open D maj7, Open G, Open C, Open Cadd9 and
  C6. The **tune** button lets you step each string up or down a semitone. Your
  tuning is saved on the device.
- **Scale highlighting:** pick a root and a scale (major, major pentatonic,
  minor pentatonic, blues, mixolydian, natural minor) to dim everything else.
- **Chord labels:** the **chords** button names the straight-bar chord at every
  fret, and it adapts to whatever tuning you are in.
- **Looper:** record a phrase, loop it, and overdub more layers on top. It
  records what you played (notes and slides), not audio.
- **Landscape first:** the compact layout fits the whole neck. Portrait phones
  render the app rotated so it is always playable sideways, even with rotation
  lock on.

## On your phone

- **Tap once to wake the audio.** Browsers only allow sound after a touch.
- **The ring/silent switch:** the app asks iOS to play through it. If you hear
  nothing, check the volume. A small audio indicator in the status bar is normal
  while the app is open.
- **Updating the installed app:** fully close it (swipe it away in the app
  switcher) and open it again. It fetches the new version in the background, so
  open it a second time to see the changes. If it still looks old, delete the
  icon and add it to the Home Screen again.

## How it works

- **Sound:** Karplus-Strong plucked-string synthesis in Web Audio. There are no
  samples, so it is tiny and works offline.
- **Slides:** each plucked note is a live voice whose pitch is bent as your
  finger or the bar moves.
- **Looper:** stores note and slide events with timestamps and replays them
  through the same engine.
- **Privacy:** no accounts, no analytics and no backend. Your tuning stays in
  your browser's local storage.

## Development

No build step, just plain ES modules. Serve the directory statically:

```
python3 -m http.server 8123
```

Releases are picked up by clients via the service worker: bump `VERSION` in
`sw.js` whenever files change. The service worker is skipped on localhost so
development never serves stale files.

## Roadmap

- [x] Playable fretboard (pluck, strum, slide, multi-touch)
- [x] Installable offline app
- [x] Bar mode with a sliding steel
- [x] Tunings and per-string tuning
- [x] Scale highlighting and per-fret chord labels
- [x] Looper with overdub (slides included)
- [x] Landscape-first layout
- [ ] Strum lane for the right thumb, and a bar that covers only some strings
- [ ] Sample-based engine (self-recorded Weissenborn notes)
- [ ] Custom domain
