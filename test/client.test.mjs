import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const requireHere = createRequire(import.meta.url);
const React = requireHere('react');

test('the client bundle registers both slots and renders', async () => {
  let entry;
  globalThis.window = { __ModuleLoader__: { load(value) { entry = value; } } };
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ spaces: [] }) });

  await import(pathToFileURL(path.join(root, 'client.js')).href);
  assert.ok(entry, 'client.js must call __ModuleLoader__.load');
  assert.equal(entry.id, 'dsh-knowledge-space');

  const module = entry.factory((name) => (name === 'react' ? React : {}));
  assert.deepEqual(module.inject.sort(), ['locale', 'slots']);

  const registered = [];
  const dictionaries = [];
  const ctx = {
    locale: {
      register(namespace, locale, dict) {
        dictionaries.push([namespace, locale, dict]);
      },
      getLocale: () => ({ active: 'en' }),
      subscribe: () => () => {},
    },
    slots: {
      inject(key, callback) {
        registered.push({ key, registration: callback() });
        return () => {};
      },
      register(definition, component) {
        return { definition, component };
      },
    },
  };

  module.apply(ctx);
  assert.deepEqual(registered.map((item) => item.key).sort(), ['main', 'sidebar.panellist']);
  assert.deepEqual(dictionaries.map((item) => item[1]).sort(), ['en', 'zh']);

  const main = registered.find((item) => item.key === 'main').registration.component;
  const { renderToString } = requireHere('react-dom/server');
  const html = renderToString(React.createElement(main, {}));
  assert.match(html, /Knowledge spaces/);
  assert.ok(html.length > 1000);

  const sidebar = registered.find((item) => item.key === 'sidebar.panellist').registration.definition;
  assert.equal(sidebar.id, 'dsh-knowledge-space');
  assert.equal(sidebar.label(), 'Knowledge spaces');
});

test('the sidebar label follows the active locale', async () => {
  let entry;
  globalThis.window = { __ModuleLoader__: { load(value) { entry = value; } } };
  await import(`${pathToFileURL(path.join(root, 'client.js')).href}?zh`);
  const module = entry.factory((name) => (name === 'react' ? React : {}));
  const registered = [];
  const ctx = {
    locale: {
      register() {},
      getLocale: () => ({ active: 'zh' }),
      subscribe: () => () => {},
    },
    slots: {
      inject(key, callback) {
        registered.push({ key, registration: callback() });
        return () => {};
      },
      register(definition, component) {
        return { definition, component };
      },
    },
  };
  module.apply(ctx);
  const sidebar = registered.find((item) => item.key === 'sidebar.panellist').registration.definition;
  assert.equal(sidebar.label(), '知识空间');
});
