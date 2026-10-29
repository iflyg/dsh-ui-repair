/**
 * Smoke test for the browser half: no host, no React, just enough DOM to run
 * `apply()` and the measuring guard. It proves the plugin boots on a document
 * without the titlebar marker, injects one stylesheet, and survives a page with
 * no slots at all.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let captured = null;
const head = [];
const attributes = new Map();
const html = {
  style: { props: new Map(), setProperty: (key, value) => html.style.props.set(key, value) },
  hasAttribute: (name) => attributes.has(name),
  setAttribute: (name, value) => attributes.set(name, value),
  getAttribute: (name) => attributes.get(name) ?? null,
};

// Node exposes `navigator` as a getter-only global, so it has to be redefined.
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Electron/33.0.0" },
});
globalThis.window = {
  __ModuleLoader__: { load: (module) => { captured = module; } },
  innerWidth: 1440,
  innerHeight: 900,
  addEventListener: () => {},
  removeEventListener: () => {},
};
globalThis.document = {
  documentElement: html,
  head: { appendChild: (node) => head.push(node) },
  body: { children: [] },
  visibilityState: "visible",
  getElementById: (id) => head.find((node) => node.id === id) ?? null,
  createElement: () => {
    const node = { id: "", textContent: "" };
    Object.defineProperty(node, "id", { get() { return node._id ?? ""; }, set(value) { node._id = value; } });
    return node;
  },
  querySelectorAll: () => [],
};
globalThis.getComputedStyle = () => ({ getPropertyValue: () => "40px" });
globalThis.MutationObserver = class {
  observe() {}
  disconnect() {}
};

new Function("window", "document", readFileSync(new URL("../lib/client.js", import.meta.url), "utf8"))(
  globalThis.window,
  globalThis.document
);

const exportsOf = captured.factory();
const effects = [];
exportsOf.apply({ effect: (factory) => { effects.push(factory()); } });

assert.equal(head.length, 1, "one stylesheet injected");
assert.ok(head[0].textContent.includes("--dsh-windows-titlebar-height"), "caption variable is pinned");
assert.ok(html.hasAttribute("data-windows-titlebar"), "marker added for an Electron document");
assert.ok(exportsOf.inject.length === 0, "no host services requested");

// Dispose everything the plugin registered; a stray observer would leak on HMR.
for (const dispose of effects) if (typeof dispose === "function") dispose();
console.log("ui-repair smoke ok: style injected, marker set, effects disposable");
