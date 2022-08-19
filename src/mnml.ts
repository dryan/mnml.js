export type MnmlEventCallback = (ev?: Event, match?: HTMLElement) => void;
export type MnmlEventCallbackGuaranteedParams = (ev: Event, match: HTMLElement) => void;

export interface ParamsObject {
  [key: string]: string | string[];
}

export const mnml = (() => {
  const parser = new DOMParser();

  const isInstance = (thing: any, kind: any, param: string): void => {
    if (!(thing instanceof kind)) {
      throw new Error(
        `Expected ${param} to be a ${
          kind && (kind.name || (kind.constructor && kind.constructor.name))
        }`
      );
    }
  };

  const isType = (thing: any, kind: string, param: string): void => {
    if (typeof thing !== kind) {
      throw new Error(`Expected ${param} to be a ${kind}`);
    }
  };

  const createElementCache: { [key: string]: HTMLElement } = {};

  const createElement = (tagName: string): HTMLElement => {
    if (!createElementCache[tagName]) {
      createElementCache[tagName] = document.createElement(tagName);
    }
    return createElementCache[tagName].cloneNode() as HTMLElement;
  };

  const createHTML = (content: string): HTMLElement => {
    const template = createElement("template") as HTMLTemplateElement;
    isInstance(template, HTMLTemplateElement, "template");
    template.innerHTML = content.trim();
    const output = template.content.firstChild as HTMLElement;
    isInstance(output, HTMLElement, "output");
    return output;
  };

  const html = (strings: TemplateStringsArray, ...values: any[]): HTMLElement => {
    return createHTML(
      strings
        .map((str, index) => {
          return str + (typeof values[index] === "undefined" ? "" : values[index]);
        })
        .join("")
    );
  };

  const find = (elem: HTMLElement | string, selector: string): HTMLElement | null => {
    if (typeof elem === "string") {
      selector = elem;
      elem = document.documentElement;
    }
    return elem.querySelector(selector);
  };

  const findAll = (elem: HTMLElement | string, selector: string): HTMLElement[] => {
    if (typeof elem === "string") {
      selector = elem;
      elem = document.documentElement as HTMLElement;
    }
    return [...elem.querySelectorAll(selector)].map((elem) => elem as HTMLElement);
  };

  const findParent = (elem: HTMLElement, selector: string): HTMLElement | null => {
    let parent = elem.parentElement;
    if (!parent || !parent.matches) {
      return null;
    }
    while (!parent.matches(selector)) {
      parent = parent.parentElement;
      if (!parent || !parent.matches) {
        parent = null;
        break;
      }
    }
    return parent;
  };

  const findParents = (elem: HTMLElement, selector: string): HTMLElement[] => {
    const parents = [];
    let parent: HTMLElement | null = elem;
    while ((parent = parent.parentElement)) {
      if (parent && parent.matches && parent.matches(selector)) {
        parents.push(parent);
      }
    }
    return parents;
  };

  const _findEventTarget = (ev: Event, selector: string): HTMLElement => {
    return (ev.composedPath &&
      ev
        .composedPath()
        .filter((elem) => {
          const el = elem as HTMLElement;
          return el.matches && el.matches(selector);
        })
        .shift()) as HTMLElement;
  };

  const _loadListener = (callback: MnmlEventCallback, priority?: number): any => {
    priority = priority || 10;
    if (_loadListener.loaded) {
      return callback();
    }
    _loadListener.queue.push([callback, priority]);
  };
  _loadListener.queue = [] as Array<[MnmlEventCallback, number]>;
  _loadListener.loaded = false;
  window.addEventListener("load", () => {
    _loadListener.queue = _loadListener.queue.sort((a, b) => a[1] - b[1]);
    while (_loadListener.queue.length) {
      const cb = _loadListener.queue.shift();
      if (cb) {
        cb[0]();
      }
    }
    _loadListener.loaded = true;
  });

  const _readyListener = (callback: MnmlEventCallback, priority?: number): any => {
    priority = priority || 10;
    if (_readyListener.loaded) {
      return callback();
    }
    _readyListener.queue.push([callback, priority]);
  };
  _readyListener.queue = [] as Array<[MnmlEventCallback, number]>;
  _readyListener.loaded = false;
  document.addEventListener("DOMContentLoaded", () => {
    _readyListener.queue = _readyListener.queue.sort((a, b) => a[1] - b[1]);
    while (_readyListener.queue.length) {
      const cb = _readyListener.queue.shift();
      if (cb) {
        cb[0]();
      }
    }
    _readyListener.loaded = true;
  });

  function listen(
    eventName: "unload" | "beforeunload",
    selector: MnmlEventCallback
  ): void;
  function listen(
    eventName: "load" | "ready",
    selector: number | MnmlEventCallback,
    callback?: MnmlEventCallback
  ): void;
  function listen(
    eventName: string,
    selector: string,
    callback: MnmlEventCallbackGuaranteedParams,
    replace?: boolean
  ): void;
  function listen(
    eventName: string,
    selector: string | number | MnmlEventCallback | MnmlEventCallbackGuaranteedParams,
    callback?: MnmlEventCallback | MnmlEventCallbackGuaranteedParams,
    replace?: boolean
  ): void {
    if (typeof replace === "undefined") {
      replace = true;
    }

    if (eventName === "load") {
      if (typeof selector === "function") {
        return _loadListener(selector);
      }
      if (typeof selector === "number") {
        const _cb = callback as MnmlEventCallback;
        return _loadListener(_cb, selector);
      }
    }

    if (eventName === "ready") {
      if (typeof selector === "function") {
        return _readyListener(selector);
      }
      if (typeof selector !== "number") {
        throw new Error(
          `Expected selector to be a number but was ${
            (selector && selector.constructor && selector.constructor.name) || selector
          }`
        );
      }
      const _cb = callback as MnmlEventCallback;
      return _readyListener(_cb, selector);
    }

    if (["unload", "beforeunload"].includes(eventName)) {
      if (typeof selector === "function") {
        const _cb = selector as MnmlEventCallback;
        window.addEventListener(eventName, _cb);
        return;
      }
    }

    if (typeof selector !== "string") {
      throw new Error(
        `Expected selector to be a string but was ${
          (selector && selector.constructor && selector.constructor.name) || selector
        }`
      );
    }

    const _cb = callback as MnmlEventCallbackGuaranteedParams;

    if (typeof listenCache[eventName] === "undefined") {
      listenCache[eventName] = {} as { [key: string]: MnmlEventCallback[] };
    }

    if (!(selector in (listenCache[eventName] as object))) {
      listenCache[eventName][selector] = [];
    }
    if (replace) {
      listenCache[eventName][selector] = [];
    }

    listenCache[eventName][selector].push(_cb);

    if (listenRegisteredEvents.indexOf(eventName) === -1) {
      listenRegisteredEvents.push(eventName);

      document.addEventListener(eventName, (ev) => {
        Object.keys(listenCache[eventName]).map((s) => {
          const match = _findEventTarget(ev, s);
          if (match) {
            listenCache[eventName][s].map((cb: MnmlEventCallbackGuaranteedParams) => {
              cb(ev, match);
            });
          }
        });
      });
    }
  }
  const listenCache = {} as { [key: string]: { [key: string]: MnmlEventCallback[] } };
  const listenRegisteredEvents = [] as string[];

  const uuid = (): string => {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: string) =>
      (
        parseInt(c, 10) ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (parseInt(c, 10) / 4)))
      ).toString(16)
    );
  };

  const params = (str: string = document.location.search): ParamsObject => {
    str = str.replace(/(^\?)/, "");
    if (!str) {
      return {};
    } else if (params.cache[str]) {
      return params.cache[str];
    }
    const _params = new URLSearchParams(str);
    const obj: ParamsObject = {};
    [..._params.entries()].map((entry) => {
      const [key, value] = entry;
      if (Object.keys(obj).includes(key) && !Array.isArray(obj[key])) {
        // if there's already a property here and the value isn't an array, make it one
        obj[key] = [obj[key] as string] as string[];
      }
      if (Array.isArray(obj[key])) {
        (obj[key] as string[]).push(value);
      } else {
        obj[key] = value as string;
      }
    });
    return obj;
  };
  params.cache = {} as { [key: string]: any };

  const any = (things: any[]): boolean => {
    return things.filter((thing) => !!thing).length > 0;
  };

  const all = (things: any[]): boolean => {
    return things.filter((thing) => !!thing).length === things.length;
  };

  return {
    parser,
    createElement,
    createHTML,
    find,
    findAll,
    findParent,
    findParents,
    html,
    listen,
    uuid,
    params,
    any,
    all,
  };
})();

export default mnml;

declare global {
  interface Window {
    mnml: typeof mnml;
  }
}

if (window) {
  window.mnml = mnml;
}
