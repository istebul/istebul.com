'use strict';

const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('esbuild');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function camelToKebab(value) {
  return String(value).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

class StaticElement {
  constructor(tagName) {
    this.tagName = String(tagName).toLowerCase();
    this.attributes = new Map();
    this.children = [];
    this.text = '';
    this.styleProperties = new Map();

    this.style = {
      setProperty: (name, value) => {
        this.styleProperties.set(String(name), String(value));
      },
      getPropertyValue: (name) => this.styleProperties.get(String(name)) || ''
    };

    this.dataset = new Proxy(Object.create(null), {
      get: (_target, key) => {
        if (typeof key !== 'string') return undefined;
        return this.getAttribute(`data-${camelToKebab(key)}`) ?? undefined;
      },
      set: (_target, key, value) => {
        if (typeof key !== 'string') return false;
        this.setAttribute(`data-${camelToKebab(key)}`, value);
        return true;
      }
    });

    this.classList = {
      add: (...names) => {
        const current = String(this.className || '').split(/\s+/).filter(Boolean);
        this.className = [...new Set([...current, ...names])].join(' ');
      },
      remove: (...names) => {
        const remove = new Set(names);
        this.className = String(this.className || '')
          .split(/\s+/)
          .filter((name) => name && !remove.has(name))
          .join(' ');
      },
      contains: (name) => String(this.className || '').split(/\s+/).includes(name)
    };

    const properties = {
      id: 'id',
      className: 'class',
      href: 'href',
      src: 'src',
      alt: 'alt',
      width: 'width',
      height: 'height',
      type: 'type',
      decoding: 'decoding',
      loading: 'loading'
    };

    for (const [property, attribute] of Object.entries(properties)) {
      Object.defineProperty(this, property, {
        enumerable: true,
        get: () => this.getAttribute(attribute) ?? '',
        set: (value) => {
          if (value === null || value === undefined) {
            this.removeAttribute(attribute);
          } else {
            this.setAttribute(attribute, value);
          }
        }
      });
    }
  }

  setAttribute(name, value) {
    this.attributes.set(String(name), String(value));
  }

  getAttribute(name) {
    return this.attributes.has(String(name))
      ? this.attributes.get(String(name))
      : null;
  }

  removeAttribute(name) {
    this.attributes.delete(String(name));
  }

  append(...nodes) {
    this.text = '';
    this.children.push(...nodes);
  }

  replaceChildren(...nodes) {
    this.text = '';
    this.children = [...nodes];
  }

  addEventListener() {}

  set textContent(value) {
    this.children = [];
    this.text = String(value ?? '');
  }

  get textContent() {
    return this.text + this.children.map((child) => child.textContent).join('');
  }
}

function serializeElement(element) {
  const attributes = new Map(element.attributes);

  if (element.styleProperties.size) {
    attributes.set(
      'style',
      [...element.styleProperties.entries()]
        .map(([name, value]) => `${name}: ${value}`)
        .join('; ')
    );
  }

  const serializedAttributes = [...attributes.entries()]
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
    .join('');

  const open = `<${element.tagName}${serializedAttributes}>`;
  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
    'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);

  if (voidElements.has(element.tagName)) return open;

  const content = escapeHtml(element.text) +
    element.children.map(serializeElement).join('');

  return `${open}${content}</${element.tagName}>`;
}

function renderPlatformLandingMount() {
  const entryPoint = path.resolve(
    __dirname,
    '../../js/runtime/platform-shell-landing.js'
  );

  const build = esbuild.buildSync({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    write: false,
    minify: false,
    legalComments: 'none',
    logLevel: 'silent'
  });

  const output = build.outputFiles?.[0]?.text;
  if (!output) {
    throw new Error('Platform Landing prerender bundle could not be generated.');
  }

  const registry = new Map();
  const fakeDocument = {
    documentElement: new StaticElement('html'),
    createElement: (tag) => new StaticElement(tag),
    getElementById: (id) => registry.get(id) || null
  };

  const mount = new StaticElement('div');
  mount.id = 'platform-landing-mount';
  mount.className = 'ib-platform-landing-preview__mount';
  registry.set(mount.id, mount);

  const section = new StaticElement('section');
  section.id = 'platform-landing';
  registry.set(section.id, section);

  const runtimeModule = { exports: {} };
  vm.runInNewContext(
    output,
    {
      module: runtimeModule,
      exports: runtimeModule.exports,
      require,
      document: fakeDocument
    },
    { filename: entryPoint }
  );

  if (typeof runtimeModule.exports.initPlatformLanding !== 'function') {
    throw new Error('Platform Landing runtime export is missing.');
  }

  const mounted = runtimeModule.exports.initPlatformLanding();

    if (!mounted || mount.children.length !== 3) {
      throw new Error('Platform Landing prerender returned an incomplete mount.');
    }

    const markup = serializeElement(mount);

    if (!markup.includes('ib-platform-hero__title') ||
        !markup.includes('ib-platform-urun-izgarasi')) {
      throw new Error('Platform Landing prerender is missing required components.');
    }

    return markup;
}

module.exports = { renderPlatformLandingMount };
