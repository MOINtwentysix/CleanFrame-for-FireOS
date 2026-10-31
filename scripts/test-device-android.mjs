// Test FireBridge integration in device.js with a synthetic Android environment.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../app/device.js', import.meta.url), 'utf8');

function harness(customBridge) {
  const launched = [];
  const settingsCalled = [];
  const screensaverCalled = [];
  const homeCalled = [];

  const defaultBridge = {
    launchApp: (pkg) => {
      launched.push(pkg);
      return pkg !== 'invalid.pkg';
    },
    getInstalledApps: () => JSON.stringify([
      { packageName: 'com.netflix.ninja', name: 'Netflix', icon: 'data:image/png;base64,fake' },
      { packageName: 'com.amazon.firetv.youtube', name: 'YouTube', icon: '' },
      { packageName: 'com.custom.app', name: 'Custom App', icon: '' }
    ]),
    openSettings: () => { settingsCalled.push(true); return true; },
    openScreensaver: () => { screensaverCalled.push(true); return true; },
    openNativeHome: () => { homeCalled.push(true); return true; }
  };

  const bridge = customBridge || defaultBridge;
  const window = { FireBridge: bridge };

  vm.runInNewContext(source, {
    window,
    setTimeout: (cb) => { cb(); return 1; },
    clearTimeout: () => {}
  });

  return { device: window.FrameDevice, launched, settingsCalled, screensaverCalled, homeCalled };
}

test('FireBridge discovers installed apps and maps brands', () => {
  const h = harness();
  let result;
  h.device.apps((err, apps) => {
    assert.equal(err, null);
    result = apps;
  });

  assert.equal(result.length, 3);
  assert.equal(result[0].appId, 'com.netflix.ninja');
  assert.equal(result[0].brand, 'netflix');
  assert.equal(result[1].appId, 'com.amazon.firetv.youtube');
  assert.equal(result[1].brand, 'youtube');
  assert.equal(result[2].appId, 'com.custom.app');
  assert.equal(result[2].brand, '');
});

test('FireBridge launches apps and translates legacy Tizen IDs to Android package names', () => {
  const h = harness();
  
  // Direct Android package
  h.device.launchApp('com.plexapp.android', (err) => {
    assert.equal(err, null);
  });
  assert.equal(h.launched[0], 'com.plexapp.android');

  // Translation from brand
  h.device.launch('netflix', (err) => {
    assert.equal(err, null);
  });
  assert.equal(h.launched[1], 'com.netflix.ninja');

  // Translation from legacy Tizen ID
  h.device.launchApp('9Ur5IzDKqV.TizenYouTube', (err) => {
    assert.equal(err, null);
  });
  assert.equal(h.launched[2], 'com.amazon.firetv.youtube');
});

test('FireBridge art/settings/home bridge calls work as expected', () => {
  const h = harness();
  
  h.device.art((err) => assert.equal(err, null));
  assert.equal(h.screensaverCalled.length, 1);

  h.device.settings((err) => assert.equal(err, null));
  assert.equal(h.settingsCalled.length, 1);

  h.device.home((err) => assert.equal(err, null));
  assert.equal(h.homeCalled.length, 1);
});

test('Browser preview fallback reports unavailable when neither Tizen nor FireBridge is present', () => {
  const window = {};
  vm.runInNewContext(source, {
    window,
    setTimeout: (cb) => { cb(); return 1; },
    clearTimeout: () => {}
  });

  let appError;
  window.FrameDevice.apps((err) => { appError = err; });
  assert.match(appError.message, /Open CleanFrame on the TV/);

  let launchError;
  window.FrameDevice.launchApp('com.netflix.ninja', (err) => { launchError = err; });
  assert.match(launchError.message, /Open CleanFrame on the TV/);
});
