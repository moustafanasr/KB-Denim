# KB Denim — Material Transformation Intro + Precise Fabric Link

This package updates the existing interactive HTML/CSS/JS homepage.

## NEW / Fabric-to-Denim opening

- A **custom, responsive SVG/CSS industrial-processing animation** plays before the homepage. Raw neutral cloth is fed into a stylised loom, animated rollers turn, and a finished indigo denim strip emerges at the end of the sequence.
- Approximately **4.15 seconds** plus a short fade to the homepage; the animation includes a **SKIP INTRO** control, stage labels and a sequence-progress indicator. This is an illustrative intro (not live network-download progress).
- Made only from HTML, SVG, CSS and a tiny JS controller so it does **not depend on downloading the large 3D GLB assets or any CDN**.
- Respects `prefers-reduced-motion`, and deep links to a specific section bypass the intro.
- The **GSAP hero entrance now begins after the intro finishes**, so its arrival is actually visible.

## NEW / Material studio link fix

- All site links previously pointing to `#material` now point to **`#fabric-colours`**, a new ID on the actual shade selection list.
- CSS `scroll-margin-top` positions that choice list comfortably below the sticky header on desktop and mobile.
- The 3D material viewer and all three fabric shade buttons remain functional.

## Running and deployment

Use a local HTTP server; don't double-click `index.html`, since the GLB files require HTTP requests.

```powershell
cd 'M:\sep\KB\KB-Denim'
python -m http.server 5500
```

Open http://localhost:5500, then replace your GitHub repository files with the entire archive contents (including `assets`).

```bash
git add -A
git commit -m "Improve fabric studio anchors and add denim mill intro"
git push origin main
```

## Notes

- `loader.css` and `loader.js` are new. They are referenced from `index.html`.
- The original warehouse, machinery and fabric 3D models and their controls are retained.
- External illustration models are concepts, not exact KB Denim machinery. Check third-party 3D-model licences before public release.
- GSAP and Swiper are optional CDN enhancements; the local WebGL model renderer and loading animation work independently.
- Confirm real-device rendering and the production GitHub Pages URL after deployment.

---

# KB Denim — Editorial / Interactive 3D Homepage

Client-preview website concept developed in HTML, CSS and JavaScript.

## What's new in this edition

- **Hero / live 3D fabric specimen**: an interactive cloth sample appears over genuine KB Denim factory photography. It rotates and gently changes shade automatically. Visitors can drag it and follow its link to the larger material studio. A real denim photograph occupies the card while the model loads.
- **Fabric studio / three independent 3D fabric renders**: the centre study and two companion drapes are rendered from `assets/denim-drape.glb`. The cloth gently undulates and rotates. The centre changes between Deep Indigo, Washed Blue and Charcoal every ~3.6 seconds while visible. Clicking a colour takes manual control; Play/Pause resumes or stops the story. Repeated models illustrate colour studies, not three verified production fabric SKUs.
- **Warehouse / automatic tour**: starts automatically after the model loads and scrolls into the vicinity. It cycles through exterior and cutaway views every ~5.2 seconds. Pressing +/−, choosing a viewpoint or dragging pauses the tour. Replay restarts the sequence.
- **Existing detail GLBs and machinery model** remain integrated. Machinery rotates automatically until touched.
- **Adaptive mobile** experience with intentionally shortened copy and mobile-specific layout. Model frames pause out of view, and the renderer scales DPR/FPS by device size.
- **GSAP + ScrollTrigger**, **Swiper**, smooth-scroll polyfill remain optional enhancements from CDNs. The 3D engine and models are local and don't require CDNs.

## Preview locally

Opening `index.html` with double-click (`file://`) is **not supported** for GLB asset fetches. Open a local HTTP server:

```powershell
cd 'M:\sep\KB\KB-Denim'
python -m http.server 5500
```

Visit **http://localhost:5500** using Chrome or Edge with WebGL2 enabled.

## GitHub Pages

Place **all files and the entire `assets/` directory** in the repository root and push them to the `main` branch:

```bash
git add -A
git commit -m "Improve autoplay 3D interactions and hero fabric showcase"
git push origin main
```

Enable GitHub Pages **Settings → Pages → Deploy from a branch → main → /(root)**. The project uses relative URLs, `.nojekyll` is included. Keep `.blend` original source locally: only `.glb` is required at runtime. If a large `.blend` was tracked by Git, untrack it before pushing (`git rm --cached warehouse6.blend`) and commit that change; do not erase your original local file.

## Keyboard/accessibility

- Motion auto-start is disabled where `prefers-reduced-motion: reduce` is set; manual controls remain available.
- The warehouse's camera path stops as soon as the visitor uses orbit/zoom/focus controls, and can be replayed.
- The Fabric Studio automatically cycles only when in view; its colour selector remains usable at any time.
- 3D previews use actual WebGL2; posters are a fallback for devices without WebGL2.

## What this prototype is not

The warehouse and machine models are **illustrative external 3D concepts**, not scans or a digital twin of KB Denim's facilities. The fabric drape is an illustrative colour study. The enquiry form opens an email draft (not a CRM/database integration). Check the external machinery model's commercial licence before public deployment. Final WordPress production implementation and real device QA are separate tasks.

## QA performed in this workspace

- JavaScript syntax and asset path checks.
- Real Chromium + WebGL2 smoke tests under software acceleration: fabric colour cycle and manual selection, warehouse autoplay/cutaway and pause-on-zoom, Hero model load and rotation.
- Desktop and mobile layout checks at 320, 390, 768 and 1440 CSS px with no horizontal page overflow.
- The integrated site was not benchmarked on real consumer GPUs or all browsers; verify on a real phone and production hosting.
