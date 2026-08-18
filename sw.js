// sw.js - 工具箱 Service Worker：离线缓存 + 网络兜底
// 版本号：修改缓存策略或文件清单后必须递增 CACHE_VERSION，否则不更新

var CACHE_VERSION = 'v17';
var CACHE_NAME = 'toolbox-' + CACHE_VERSION;

var PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './icons/brain-192.png',
  './icons/brain-512.png',
  './js/theme.js',
  './js/nav.js',
  './js/cron.js',
  './js/gold.js',
  './js/exchange.js',
  './js/ip.js',
  './js/timestamp.js',
  './js/regex.js',
  './js/base64.js',
  './js/hotlist.js',
  './js/filehash.js',
  './js/hash.js',
  './js/imgtool.js',
  './js/convert.js',
  './js/sudoku.js',
  './js/diff.js',
  './js/markdown.js',
  './js/admin.js',
  './js/easter-egg.js',
  './js/asciiart.js',
  './js/stock.js',
  './js/backtest.js',
  './js/monitor.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(PRECACHE_URLS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);

  if (url.origin === location.origin) {
    if (url.pathname.endsWith('hotlist.json')) {
      event.respondWith(
        fetch(request)
          .then(function (res) {
            var copy = res.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
            return res;
          })
          .catch(function () { return caches.match(request); })
      );
      return;
    }
    event.respondWith(
      caches.match(request).then(function (cached) {
        if (cached) return cached;
        return fetch(request).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
          return res;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(request).then(function (res) {
      return res;
    }).catch(function () {
      return caches.match(request);
    })
  );
});
