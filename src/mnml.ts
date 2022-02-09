(window as any).mnml = (window as any).mnml || {};
const mnml = (window as any).mnml;

mnml.parser = new DOMParser();

const isInstance = (thing: any, kind: any, param: string): void => {
  if (!(thing instanceof kind)) {
    throw new Error(
      `Expected ${param} to be a ${kind && kind.constructor && kind.constructor.name}`
    );
  }
};

const isType = (thing: any, kind: string, param: string): void => {
  if (typeof thing !== kind) {
    throw new Error(`Expected ${param} to be a ${kind}`);
  }
};

const createElement = (tagName: string): HTMLElement => {
  if (!createElement[tagName]) {
    createElement[tagName] = document.createElement(tagName);
  }
  return createElement[tagName].cloneNode();
};
mnml.createElement = createElement;

const createHTML = (content: string): HTMLElement => {
  const template = createElement("template") as HTMLTemplateElement;
  isInstance(template, HTMLTemplateElement, "template");
  template.innerHTML = content.trim();
  const output = template.content.firstChild as HTMLElement;
  isInstance(output, HTMLElement, "output");
  return output;
};
mnml.createHTML = createHTML;

const find = (elem: HTMLElement | string, selector: string): HTMLElement => {
  if (typeof elem === "string") {
    selector = elem;
    elem = document.documentElement;
  }
  return elem.querySelector(selector);
};
mnml.find = find;

const findAll = (elem: HTMLElement | string, selector: string): HTMLElement[] => {
  if (typeof elem === "string") {
    selector = elem;
    elem = document.documentElement as HTMLElement;
  }
  return [...elem.querySelectorAll(selector)].map((elem) => elem as HTMLElement);
};
mnml.find = findAll;

const findParent = (elem: HTMLElement, selector: string): HTMLElement => {
  let parent = elem.parentElement;
  if (!parent.matches) {
    return;
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
mnml.findParent = findParent;

const findParents = (elem: HTMLElement, selector: string): HTMLElement[] => {
  const parents = [];
  let parent = elem;
  while ((parent = parent.parentElement)) {
    if (parent.matches && parent.matches(selector)) {
      parents.push(parent);
    }
  }
  return parents;
};
mnml.findParents = findParents;

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

type EventCallback = (ev?: Event, match?: HTMLElement) => void;

const _loadListener = (callback: EventCallback, priority?: number): any => {
  priority = priority || 10;
  if (_loadListener.loaded) {
    return callback();
  }
  _loadListener.queue.push([callback, priority]);
};
_loadListener.queue = [] as Array<[EventCallback, number]>;
_loadListener.loaded = false;
window.addEventListener("load", () => {
  _loadListener.queue = _loadListener.queue.sort((a, b) => a[1] - b[1]);
  while (_loadListener.queue.length) {
    _loadListener.queue.shift()[0]();
  }
  _loadListener.loaded = true;
});

const _readyListener = (callback: EventCallback, priority?: number): any => {
  priority = priority || 10;
  if (_readyListener.loaded) {
    return callback();
  }
  _readyListener.queue.push([callback, priority]);
};
_readyListener.queue = [] as Array<[EventCallback, number]>;
_readyListener.loaded = false;
document.addEventListener("DOMContentLoaded", () => {
  _readyListener.queue = _readyListener.queue.sort((a, b) => a[1] - b[1]);
  while (_readyListener.queue.length) {
    _readyListener.queue.shift()[0]();
  }
  _readyListener.loaded = true;
});

const listen = (
  eventName: string,
  selector: string | number | EventCallback,
  callback: EventCallback,
  replace: boolean = true
): void => {
  if (eventName === "load") {
    if (typeof selector === "function") {
      return _loadListener(selector);
    }
    if (typeof selector !== "number") {
      throw new Error(
        `Expected selector to be a number but was ${
          (selector && selector.constructor && selector.constructor.name) || selector
        }`
      );
    }
    return _loadListener(callback, selector);
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
    return _readyListener(callback, selector);
  }

  if (typeof selector !== "string") {
    throw new Error(
      `Expected selector to be a string but was ${
        (selector && selector.constructor && selector.constructor.name) || selector
      }`
    );
  }

  if (typeof listen.cache[eventName] === "undefined") {
    listen.cache[eventName] = {};
  }

  if (!(selector in (listen.cache[eventName] as object))) {
    (listen.cache[eventName] as object)[selector] = [];
  }
  if (replace) {
    (listen.cache[eventName] as object)[selector] = [];
  }

  (listen.cache[eventName] as object)[selector].push(callback);

  if (listen.registeredEvents.indexOf(eventName) === -1) {
    listen.registeredEvents.push(eventName);

    document.addEventListener(eventName, (ev) => {
      Object.keys(listen.cache[eventName]).map((s) => {
        const match = _findEventTarget(ev, s);
        if (match) {
          (listen.cache[eventName] as object)[s].map((cb: EventCallback) => {
            cb(ev, match);
          });
        }
      });
    });
  }
};
listen.cache = {};
listen.registeredEvents = [] as Array<string>;
mnml.listen = listen;

const uuid = (): string => {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: string) =>
    (
      parseInt(c, 10) ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (parseInt(c, 10) / 4)))
    ).toString(16)
  );
};
mnml.uuid = uuid;

const params = (str: string = document.location.search): object => {
  str = str.replace(/(^\?)/, "");
  if (!str) {
    return {};
  } else if (params.cache[str]) {
    return params.cache[str];
  }
  const _params = new URLSearchParams(str);
  const obj = {};
  [..._params.entries()].map((entry) => {
    const [key, value] = entry;
    if (obj.hasOwnProperty(key) && !(obj[key] instanceof Array)) {
      obj[key] = [obj[key]];
    }
    if (obj[key] instanceof Array) {
      obj[key].push(value);
    } else {
      obj[key] = value;
    }
  });
  return obj;
};
params.cache = {};
mnml.params = params;
