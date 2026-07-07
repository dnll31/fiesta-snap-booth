# 🎉 Fiesta Snap Booth

A colorful, Filipino-fiesta-themed digital photobooth web app. Guests pick a template, pose for four
countdown-timed photos, and walk away with a downloadable photo strip — no printer needed.

## Running it

This is a static site — no build step, no backend.

1. Unzip the project.
2. Serve the folder over **http(s)**, not `file://` (camera access and service workers require a real
   origin). The simplest options:
   - `npx serve .`
   - `python3 -m http.server 8080`
   - Or drop it on any static host (GitHub Pages, Netlify, Vercel, etc.)
3. Open the printed local URL on a tablet or phone browser (Chrome/Safari, latest versions).
4. Allow camera permission when prompted.

For real event use on a tablet kiosk, "Add to Home Screen" turns it into a fullscreen installed PWA.

## Feature tour

- **Welcome screen** — event title, big Start button, link into Remote Camera Mode.
- **Template picker** — Barrio Fiesta, Colorful Fiesta, Flores de Mayo, School Foundation Day, Town
  Fiesta, and Philippine Festival, each with its own border, banderita colors, and default title/message.
  You can also type a custom event name, guest name(s), date, and short message, and toggle decorations
  (confetti, balloons, flowers, stars, streamers, fireworks, hearts) and a filter (Original, Bright, Warm,
  Vintage, Black & White, Soft Glow).
- **Camera screen** — live preview, animated 3-2-1 countdown (zoom effect), camera flash + shutter sound,
  4 automatic shots with a 2-second gap between them, and a 1/4–4/4 progress indicator.
- **Processing screen** — "Preparing your Fiesta Memories…" with a spinning-emoji loader while the strip
  is composited on a `<canvas>`.
- **Result screen** — the finished strip, a confetti celebration burst, **Download Photo Strip** (high-res
  PNG), **Share** (native share sheet when available, falls back to download), and **Take Another**.

## Remote Camera Mode (tablet kiosk + iPhone camera)

Two devices, one photobooth, connected **peer-to-peer over the same Wi-Fi** using WebRTC — no
app-store install, no dedicated backend server.

**How pairing works today:**

1. On the **tablet**, open the app → *Use two devices?* → choose **"This device is the Kiosk."** It
   generates a short text code (a WebRTC offer).
2. Send that code to the **iPhone** (AirDrop, Messages, email — anything that moves text).
3. On the iPhone, open the same app URL → choose **"This device is the Camera,"** paste the code, and
   tap Connect. The phone grants camera access and generates its own reply code.
4. Send the reply code back to the tablet and tap Connect there too.
5. Once the status shows **Connected**, go to the template/camera flow on the tablet as normal — the
   live video feed now comes from the phone's camera, and the tablet drives the countdown, capture, and
   compositing exactly like local mode. The phone's screen also receives lightweight countdown/flash
   cues over a WebRTC data channel, so it feels alive in your hand.

**Why manual copy/paste instead of automatic pairing?** WebRTC always needs a *signaling* step to swap
connection info before the two devices can talk directly — normally a small server does this instantly.
This project ships with **zero backend**, so the app asks you to move that same handshake text by hand
once per session. It works reliably on one shared Wi-Fi network for a single event.

**If you want push-button pairing** (e.g., a QR code scan instead of copy/paste, or pairing across
different networks): stand up a tiny WebSocket relay (a few dozen lines of Node.js) that forwards the
same offer/answer strings between the two browsers automatically, and swap the manual textarea step in
`js/remote.js` for a socket message. The WebRTC logic itself doesn't need to change.

## Technical notes

- Plain HTML5 / CSS3 / vanilla JavaScript — no build tools or frameworks.
- `Canvas API` composites the final photo strip (borders, banderitas, decorations, custom text) at
  900px-wide, high-resolution PNG output.
- `getUserMedia` for local camera capture; `RTCPeerConnection` + `getUserMedia` for the remote phone
  camera.
- Filters are applied at capture time via `CanvasRenderingContext2D.filter` so they're baked into the
  saved image, not just a CSS preview.
- Installable **PWA**: `manifest.json` + `sw.js` cache the app shell for offline load after first visit.
- Fully responsive, touch-friendly layout tuned for tablet kiosks down to phone screens.
- Respects `prefers-reduced-motion`.

## File structure

```
fiesta-snap-booth/
├── index.html
├── manifest.json
├── sw.js
├── css/style.css
├── js/
│   ├── app.js         # screen flow, state, UI wiring
│   ├── camera.js       # countdown, capture, flash, shutter sound
│   ├── templates.js    # template/decoration/filter data + strip compositing
│   ├── confetti.js     # confetti particle engine
│   └── remote.js       # WebRTC manual-signaling remote camera pairing
└── icons/              # PWA icons
```
