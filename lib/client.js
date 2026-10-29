/**
 * dsh-ui-repair — browser half.
 *
 * DSH on Windows draws its own title bar (`titleBarOverlay`): minimise /
 * maximise / close are painted by Electron *above* the page in the top-right
 * corner. Anything the page puts there cannot be clicked — the click lands on
 * the window button, and on the ✕ that means the window closes.
 *
 * The host already reserves that strip for the main window by tagging `html`
 * with `data-windows-titlebar` and publishing `--dsh-windows-titlebar-height`.
 * Two cases still end up under the buttons:
 *
 *   1. A document that never got the tag — a plugin page rendered in its own
 *      frame, or a build where the preload did not run the marker.
 *   2. A full-window layer (`shell.overlay`, or a plugin panel in `main`) whose
 *      own `inset: 0` ignores the clearance and puts its toolbar in the strip.
 *
 * So this half does two things:
 *   - CSS for the deterministic part (the marker, the reserved strip, the
 *     overlay layer).
 *   - A small measuring guard for the rest: any candidate layer that actually
 *     reaches into the strip is pushed down by exactly the overlap, and the
 *     push is removed again as soon as the layer no longer overlaps. Measured
 *     rather than assumed, because a blind `padding-right` is what squeezed the
 *     view-tab row into a clipped stub in the previous build.
 */

window.__ModuleLoader__.load({
  id: "dsh-ui-repair",
  factory: () => {
    const module = { exports: {} };

    /** Style element id; also the guard against double injection on HMR. */
    const STYLE_ID = "dsh-ui-repair.css";

    /** Fallback caption height when the host variable is missing. */
    const CAPTION_FALLBACK = 40;

    const css = [
      /* The host publishes the caption height on `html`. Re-declare it with the
         same value so a theme that clears the variable cannot collapse the
         reserved strip to zero. */
      `html[data-windows-titlebar] {`,
      `  --dsh-windows-titlebar-height: ${CAPTION_FALLBACK}px;`,
      `  --dsh-frame-top-clearance: ${CAPTION_FALLBACK}px;`,
      `  --dsh-frame-chrome-top: ${CAPTION_FALLBACK}px;`,
      `}`,

      /* Full-window layers start below the caption strip instead of under it.
         `top` only moves layers that are positioned; the guard below handles
         the ones that hard-code `inset: 0` on a child. */
      `html[data-windows-titlebar] [data-slot="shell.overlay"] {`,
      `  top: ${CAPTION_FALLBACK}px !important;`,
      `  bottom: 0 !important;`,
      `  height: auto !important;`,
      `}`,

      /* A tab row that cannot fit must wrap, not slide under the buttons. */
      `html[data-windows-titlebar] [data-slot="conversation.session.header"] > header {`,
      `  min-width: 0;`,
      `  flex-wrap: wrap;`,
      `}`,
      `html[data-windows-titlebar] [data-slot="conversation.session.header"] header > * {`,
      `  min-width: 0;`,
      `}`,
    ].join("\n");

    /**
     * Inject the stylesheet once.
     * @returns {void}
     */
    function installStyle() {
      if (typeof document === "undefined") return;
      if (document.getElementById(STYLE_ID) !== null) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = css;
      document.head.appendChild(style);
    }

    /**
     * Mark this document as living under the Windows caption strip.
     *
     * The host does this for the main window. An embedded DSH page (a plugin
     * that renders the app in its own frame) does not inherit the tag, and then
     * the frame's own `padding-top: var(--dsh-windows-titlebar-height)` rule
     * resolves to nothing — which is precisely how a tab row ends up on top of
     * the ✕. Only Electron on Windows is touched.
     * @returns {boolean} true when the document carries the marker.
     */
    function ensureMarker() {
      const root = document.documentElement;
      if (root.hasAttribute("data-windows-titlebar")) return true;
      const ua = typeof navigator === "object" ? navigator.userAgent : "";
      if (/Electron/i.test(ua) === false || /Windows/i.test(ua) === false) return false;
      root.setAttribute("data-windows-titlebar", "");
      root.style.setProperty("--dsh-windows-titlebar-height", `${CAPTION_FALLBACK}px`);
      return true;
    }

    /** Caption height in CSS pixels, read from the host variable. */
    function captionHeight() {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--dsh-windows-titlebar-height");
      const parsed = Number.parseFloat(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : CAPTION_FALLBACK;
    }

    /**
     * Original inline margin plus the push currently applied, so a measurement
     * can subtract its own effect. Without that, a pushed layer reads as "no
     * longer overlapping", gets restored, and then overlaps again on the next
     * pass — a visible bounce every time the guard runs.
     */
    const originals = new WeakMap();

    /**
     * Push one layer out of the caption strip, or restore it.
     * @param {Element} element - candidate layer.
     * @param {number} height - caption height.
     * @returns {void}
     */
    function guardElement(element, height) {
      if (element === null || element === undefined) return;
      const rect = element.getBoundingClientRect();
      if (rect.width < window.innerWidth * 0.4 || rect.height < window.innerHeight * 0.3) {
        // Small popovers and tooltips: leave them alone, they do not cover the
        // window controls and moving them would be a surprise.
        restore(element);
        return;
      }
      const record = originals.get(element);
      const push = record === undefined ? 0 : record.push;
      const baseTop = rect.top - push;
      if (baseTop >= height - 1) {
        restore(element);
        return;
      }
      const baseMargin = record === undefined ? Number.parseFloat(element.style.getPropertyValue("margin-top")) : record.margin;
      const margin = Number.isFinite(baseMargin) ? baseMargin : 0;
      const next = { margin, push: height - baseTop };
      originals.set(element, next);
      element.style.setProperty("margin-top", `${margin + next.push}px`, "important");
    }

    /**
     * Drop a previous push so a layer that moved on its own is not shifted twice.
     * @param {Element} element - candidate layer.
     * @returns {void}
     */
    function restore(element) {
      const record = originals.get(element);
      if (record === undefined) return;
      originals.delete(element);
      if (!Number.isFinite(record.margin) || record.margin === 0) element.style.removeProperty("margin-top");
      else element.style.setProperty("margin-top", `${record.margin}px`, "important");
    }

    /** Every layer worth measuring: slot hosts and their direct children. */
    const SLOT_SELECTORS = [
      '[data-slot="conversation.session.header"]',
      '[data-slot="shell.overlay"]',
      '[data-slot="main"]',
      '[data-slot="rightbar"]',
      '[role="dialog"]',
    ];

    /**
     * Measure the candidates and fix the ones that reach into the caption strip.
     * @returns {void}
     */
    function guard() {
      if (typeof document === "undefined" || document.body === null) return;
      if (document.visibilityState === "hidden") return;
      if (ensureMarker() !== true) return;
      const height = captionHeight();
      for (const selector of SLOT_SELECTORS) {
        for (const host of document.querySelectorAll(selector)) {
          guardElement(host, height);
          for (const child of host.children) guardElement(child, height);
        }
      }
    }

    /**
     * Measurement report for the caption strip, for the case where something
     * still sits under the buttons and the guesswork has to stop.
     * @returns {{height:number, layers:{selector:string,class:string,top:number,left:number,width:number,height:number,marginTop:string}[]}} report.
     */
    function dump() {
      const height = captionHeight();
      const layers = [];
      for (const selector of SLOT_SELECTORS) {
        for (const host of document.querySelectorAll(selector)) {
          for (const element of [host, ...host.children]) {
            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            layers.push({
              selector,
              class: typeof element.className === "string" ? element.className.slice(0, 80) : "",
              top: Math.round(rect.top),
              left: Math.round(rect.left),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              marginTop: element.style.getPropertyValue("margin-top"),
            });
          }
        }
      }
      return { height, layers };
    }

    /**
     * Client plugin body.
     * @param {object} ctx - client context.
     * @returns {void}
     */
    function apply(ctx) {
      installStyle();
      if (ensureMarker() !== true) return;

      // Console handle: `__dshUiRepair.dump()` lists every measured layer with
      // its rect, which is what a bug report about "still overlapping" needs.
      globalThis.__dshUiRepair = { guard, dump };

      // Boot, then again after layout settles; the frame mounts asynchronously
      // and the first measurement often runs before the columns exist.
      guard();
      const frames = [80, 400, 1200];
      for (const delay of frames) {
        ctx.effect(() => {
          const timer = setTimeout(guard, delay);
          return () => clearTimeout(timer);
        }, `ui-repair: guard@${delay}`);
      }

      // The window resizes and the sidebar collapses change every rect; a
      // debounce keeps one measurement per settled layout instead of per frame.
      ctx.effect(() => {
        let timer = 0;
        const onResize = () => {
          clearTimeout(timer);
          timer = setTimeout(guard, 120);
        };
        window.addEventListener("resize", onResize);
        return () => {
          clearTimeout(timer);
          window.removeEventListener("resize", onResize);
        };
      }, "ui-repair: resize guard");

      // A layer opened later (workflow canvas, plugin dialog) needs the same
      // treatment, so watch for new children rather than polling.
      ctx.effect(() => {
        if (typeof MutationObserver !== "function") return () => {};
        let timer = 0;
        const observer = new MutationObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(guard, 300);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return () => {
          clearTimeout(timer);
          observer.disconnect();
        };
      }, "ui-repair: subtree guard");
    }

    module.exports.apply = apply;
    module.exports.inject = [];
    return module.exports;
  },
});
