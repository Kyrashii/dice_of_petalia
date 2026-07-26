import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const skinFaces = vi.hoisted(() => {
  let onReady: (() => void) | undefined;
  let loaded = false;

  return {
    create: vi.fn((_packs, callbacks) => {
      onReady = callbacks.onReady;
      return {
        face: () => loaded ? "data:image/png;base64,skin-face" : undefined,
        prepare: vi.fn()
      };
    }),
    complete() {
      loaded = true;
      onReady?.();
    },
    reset() {
      loaded = false;
      onReady = undefined;
      this.create.mockClear();
    }
  };
});

vi.mock("../src/skin-faces", () => ({ createSkinFaceLoader: skinFaces.create }));

class FakeClassList {
  private readonly values = new Set<string>();

  add(...tokens: string[]) { tokens.forEach(token => this.values.add(token)); }
  remove(...tokens: string[]) { tokens.forEach(token => this.values.delete(token)); }
  toggle(token: string, force?: boolean) {
    const enabled = force ?? !this.values.has(token);
    if (enabled) this.values.add(token); else this.values.delete(token);
    return enabled;
  }
  contains(token: string) { return this.values.has(token); }
}

class FakeElement {
  readonly classList = new FakeClassList();
  readonly dataset: Record<string, string> = {};
  readonly style = { width: "", cssText: "", left: "", top: "", color: "", setProperty: vi.fn() };
  disabled = false;
  innerHTML = "";
  onclick: ((event?: unknown) => void) | null = null;
  textContent = "";
  offsetWidth = 0;

  appendChild() { return this; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
  remove() {}
}

function createBrowser() {
  const elements = new Map<string, FakeElement>();
  const ids = [
    "brandMark", "guardian", "startGuardian", "helpBtn", "soundBtn", "sideToggle",
    "newRunBtn", "continueBtn", "rerollBtn", "playBtn", "handsBtn", "skinsBtn",
    "restartBtn", "overlay", "modal", "toast", "diceRow", "levelText", "roundScore",
    "targetScore", "progressFill", "petals", "mult", "preview", "handName", "handDetail",
    "rerolls", "hands", "charmCount", "charmList", "speech", "startScreen", "sidePanel"
  ];
  ids.forEach(id => elements.set(`#${id}`, new FakeElement()));
  const petButton = new FakeElement();
  const storage = new Map<string, string>();
  const body = new FakeElement();
  const document = {
    body,
    documentElement: new FakeElement(),
    createElement: () => new FakeElement(),
    querySelector: (selector: string) => {
      if (selector === "#guardian .pet-button") return petButton;
      if (selector.startsWith("#")) {
        if (!elements.has(selector)) elements.set(selector, new FakeElement());
        return elements.get(selector) ?? null;
      }
      return null;
    },
    querySelectorAll: () => [] as FakeElement[],
    addEventListener: vi.fn()
  };
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, String(value)); },
    removeItem: (key: string) => { storage.delete(key); }
  };

  return { document, localStorage, elements };
}

describe("main orchestration", () => {
  let browser: ReturnType<typeof createBrowser>;

  beforeEach(() => {
    browser = createBrowser();
    skinFaces.reset();
    vi.stubGlobal("document", browser.document);
    vi.stubGlobal("localStorage", browser.localStorage);
    vi.stubGlobal("window", { addEventListener: vi.fn(), innerWidth: 1280, innerHeight: 720, matchMedia: () => ({ matches: true }) });
    vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: () => "" }));
    vi.stubGlobal("Image", class { onerror = null; onload = null; src = ""; });
    vi.stubGlobal("setInterval", vi.fn(() => 1));
    vi.stubGlobal("clearInterval", vi.fn());
    vi.stubGlobal("clearTimeout", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("renders classic dice when a new run starts", async () => {
    await import("../src/main");

    expect(() => browser.elements.get("#newRunBtn")?.onclick?.()).not.toThrow();
    expect(browser.elements.get("#diceRow")?.innerHTML).toContain('class="pip p');
  });

  it("renders an unlocked skin and refreshes it when faces finish loading", async () => {
    browser.localStorage.setItem("dice-of-petalia-luma-garden-v1", JSON.stringify({
      selected: "sakura",
      moonDrops: 0,
      packs: { sakura: { progress: { pair: 3, twoPair: 1, straight: 1, smallReroll: 2, pinkSix: 3 }, skipped: false, skippedTask: null } }
    }));

    await import("../src/main");
    browser.elements.get("#newRunBtn")?.onclick?.();

    expect(browser.elements.get("#diceRow")?.innerHTML).toContain("skinned-die");
    expect(browser.elements.get("#diceRow")?.innerHTML).toContain("skin-loading");
    expect(() => browser.elements.get("#skinsBtn")?.onclick?.()).not.toThrow();
    expect(browser.elements.get("#modal")?.innerHTML).toContain("Cosmetic dice skins");

    skinFaces.complete();

    expect(browser.elements.get("#diceRow")?.innerHTML).toContain('src="data:image/png;base64,skin-face"');
  });
});
