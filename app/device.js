/* Public Tizen and Android/FireOS application APIs. No Mac server, network address or credentials. */
(function () {
  'use strict';
  var TIZEN_IDS = {
    stremio: 'IkWsFHtOY9.Stremio', netflix: 'org.tizen.netflix-app',
    disneyplus: 'MCmYXNxgcu.DisneyPlus', youtube: '9Ur5IzDKqV.TizenYouTube',
    appletv: 'com.samsung.tv.aria-video', primevideo: 'org.tizen.primevideo',
    abciview: 'mWK87Xghap.ABCiview', sbs: 'OyE7OuxlUi.SBSOnDemand',
    applemusic: 'org.tizen.apple.apple-music'
  };
  var ANDROID_IDS = {
    stremio: 'com.stremio.one',
    netflix: 'com.netflix.ninja',
    disneyplus: 'com.disney.disneyplus',
    youtube: 'com.amazon.firetv.youtube',
    appletv: 'com.apple.atve.amazon.appletv',
    primevideo: 'com.amazon.amazonvideo.livingroom',
    spotify: 'com.spotify.tv.android',
    twitch: 'tv.twitch.android.app',
    kodi: 'org.xbmc.kodi',
    plex: 'com.plexapp.android'
  };
  var TIZEN_TO_ANDROID = {
    'IkWsFHtOY9.Stremio': 'com.stremio.one',
    'org.tizen.netflix-app': 'com.netflix.ninja',
    'MCmYXNxgcu.DisneyPlus': 'com.disney.disneyplus',
    '9Ur5IzDKqV.TizenYouTube': 'com.amazon.firetv.youtube',
    'com.samsung.tv.aria-video': 'com.apple.atve.amazon.appletv',
    'org.tizen.primevideo': 'com.amazon.amazonvideo.livingroom'
  };
  var TIZEN_STREAMING = ['as6cYRgkPy.Binge', '73iTZRTc34.Stan', '5b8c3eb16b.BeamCTVDev',
    'cj37Ni3qXM.HBONow', 'LBUAQX1exg.Hulu', 'gzcc4LRFBF.Peacock', 'rJyOSqC6Up.CBSAllAccess',
    'Rk72oKFsRS.OtterKidsProd', '70fRFUwYlD.OtterGAProd', 'PvWgqxV3Xa.YouTubeTV',
    'XtU8fQk2gN.ESPN', 'ZmmGjO6VKO.slingtv', 'VtuWAiZdHN.STARZPlay', 'ckfgqqzvt0.dplus',
    'kk8MbItQ0H.VUDU', 'Jz7aUrV2Q4.Twitch', 'OK2Rdkjmsi.IMDbTV', 'Ob3XhAVMu6.amcplus',
    'KaLitts8bq.tenplaySamsungTizen', 'eYuOiOLYQX.KayoSports', 'Ne2ZsPWdKl.9NOW',
    '3KA0pm7a7V.TubiTV', 'rJeHak5zRg.Spotify', 'icp4AvUPiA.7plus'];
  var CONSUMER_SYSTEM = ['org.tizen.browser', 'com.microsoft.copilot'];
  var EXTRA_BRANDS = {'rJeHak5zRg.Spotify': 'spotify', '5b8c3eb16b.BeamCTVDev': 'hbomax', 'cj37Ni3qXM.HBONow': 'hbomax', '3KA0pm7a7V.TubiTV': 'tubi'};
  var INTERNAL = ['adplatform.ADPlayer', 'WykOS4t4F0.cmsWebApp', '25emanual3.emanual',
    'd0m1lV1nt2.emanual', '2022ePop01.SmartTV',
    'ZODRT12q2l.WebAccountExtension', 'ByJlgt0XeD.CastSettingsApp', 'tv6pbVMQFF.PrivacyChoices'];
  var SELF = 'nClrkHome1.FrameHome';

  function fireBridge() {
    return window.FireBridge || window.AndroidBridge;
  }
  function tizenApi() {
    return window.tizen && window.tizen.application;
  }
  function selfId() {
    try { return tizenApi().getCurrentApplication().appInfo.id || SELF; }
    catch (err) { return SELF; }
  }
  function unavailable(done) {
    done({ message: 'Open CleanFrame on the TV to use this control.', detail: 'The web preview cannot control the TV.' });
  }
  function failure(err) {
    return { message: 'The TV could not open this screen.', detail: err && (err.message || err.name) || 'Try again, or press the remote’s Home button to return to CleanFrame.' };
  }
  function bounded(done, timeout) {
    var finished = false, timer = setTimeout(function () { finish({ message: 'The TV did not respond. Please try again.' }); }, timeout || 8000);
    function finish(err, value) { if (finished) return; finished = true; clearTimeout(timer); done(err, value); }
    return finish;
  }

  function launchApp(id, done) {
    var bridge = fireBridge(), targetId = id, finish;
    if (bridge) {
      if (TIZEN_TO_ANDROID[targetId]) targetId = TIZEN_TO_ANDROID[targetId];
      if (ANDROID_IDS[targetId]) targetId = ANDROID_IDS[targetId];
      try {
        var ok = bridge.launchApp(targetId);
        if (ok) { done(null); }
        else { done({ message: 'App could not be launched.', detail: 'Package ' + targetId + ' is not installed or refused to start.' }); }
      } catch (err) { done(failure(err)); }
      return;
    }

    if (!tizenApi()) { unavailable(done); return; }
    finish = bounded(done);
    try { tizenApi().launch(id, function () { finish(null); }, function (err) { finish(failure(err)); }); }
    catch (err) { finish(failure(err)); }
  }

  function launch(brand, done) {
    var bridge = fireBridge();
    if (bridge && ANDROID_IDS[brand]) {
      launchApp(ANDROID_IDS[brand], done);
      return;
    }
    if (!TIZEN_IDS[brand]) { done({message: 'This app has no launch target.'}); return; }
    launchApp(TIZEN_IDS[brand], done);
  }

  function art(done) {
    var bridge = fireBridge();
    if (bridge) {
      try {
        if (typeof bridge.openScreensaver === 'function') {
          bridge.openScreensaver();
          done(null);
          return;
        }
      } catch (err) { done(failure(err)); return; }
    }

    if (!tizenApi()) { unavailable(done); return; }
    var finish = bounded(done);
    try {
      var data = [new tizen.ApplicationControlData('mode', ['fullscreen']), new tizen.ApplicationControlData('requester', ['mobile'])];
      var control = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/default', null, null, null, data);
      tizenApi().launchAppControl(control, 'org.tizen.art-app', function () { finish(null); }, function (err) { finish(failure(err)); });
    } catch (err) { finish(failure(err)); }
  }

  function home(done) {
    var bridge = fireBridge();
    if (bridge) {
      try {
        if (typeof bridge.openNativeHome === 'function') {
          bridge.openNativeHome();
          done(null);
          return;
        }
      } catch (err) { done(failure(err)); return; }
    }
    launchApp('com.samsung.tv.csfs', done);
  }

  function settings(done) {
    var bridge = fireBridge();
    if (bridge) {
      try {
        if (typeof bridge.openSettings === 'function') {
          bridge.openSettings();
          done(null);
          return;
        }
      } catch (err) { done(failure(err)); return; }
    }
    launchApp('com.samsung.tv.coba.setting', done);
  }

  function apps(done) {
    var bridge = fireBridge();
    if (bridge) {
      try {
        var raw = bridge.getInstalledApps(), parsed = JSON.parse(raw || '[]'), res = [];
        var knownAndroid = {};
        Object.keys(ANDROID_IDS).forEach(function (brand) { knownAndroid[ANDROID_IDS[brand]] = brand; });
        parsed.forEach(function (item) {
          if (!item.packageName || !item.name) return;
          var brand = knownAndroid[item.packageName] || '';
          res.push({
            appId: item.packageName,
            name: item.name,
            brand: brand,
            icon: item.icon || '',
            rank: brand ? Object.keys(ANDROID_IDS).indexOf(brand) : 50
          });
        });
        res.sort(function (a, b) { return a.rank - b.rank || a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
        done(null, res);
      } catch (err) { done(failure(err)); }
      return;
    }

    if (!tizenApi()) { unavailable(done); return; }
    // Large installed catalogues can take longer than a launch response.
    var finish = bounded(done, 20000);
    try {
      tizenApi().getAppsInfo(function (list) {
        var known = {}, seen = {}, result = [], self = selfId();
        Object.keys(TIZEN_IDS).forEach(function (brand) { known[TIZEN_IDS[brand]] = brand; });
        list.forEach(function (a) {
          var primary = !!known[a.id], stream = TIZEN_STREAMING.indexOf(a.id) >= 0;
          var consumer = /^[A-Za-z0-9]{10}\.[A-Za-z0-9_-]+$/.test(a.id) || CONSUMER_SYSTEM.indexOf(a.id) >= 0;
          if (a.id === self || INTERNAL.indexOf(a.id) >= 0 || seen[a.id] || !a.name || (!primary && !stream && (!a.show || !consumer))) return;
          if (!primary && /(?:service|worker|preview|promotion|plugin|launcher|test|sdk|^ep[ -]|factory|daemon)/i.test(a.name + ' ' + a.id)) return;
          if (/-dummy$/.test(a.id) || a.id === 'com.samsung.tv.cobalt-yt') return;
          seen[a.id] = true;
          result.push({ appId: a.id, name: a.name, brand: known[a.id] || EXTRA_BRANDS[a.id] || '', icon: a.iconPath || '', rank: primary ? Object.keys(TIZEN_IDS).indexOf(known[a.id]) : (stream ? 20 : 30) });
        });
        result.sort(function (a, b) { return a.rank - b.rank || a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
        finish(null, result);
      }, function (err) { finish(failure(err)); });
    } catch (err) { finish(failure(err)); }
  }

  window.FrameDevice = { launch: launch, launchApp: launchApp, art: art, home: home, settings: settings, apps: apps };
}());
