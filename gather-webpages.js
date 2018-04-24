
// PARALLEL MODE

var async = require('async');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var parse = require('csv-parse/lib/sync');
var webpagesCsv = fs.readFileSync('./webpages-data-view-deduped.txt', 'utf8');
var request = require('requestretry');

var NORMALIZED_URL_TO_FILE_ID_FILE = './normalized-url-to-file-id.json';
var WEBPAGES_PREFIX = './webpages';

var webpageRequest = request.defaults({
  maxAttempts: 3,
  retryDelay: 5000,
  retryStrategy: function(err, res, body) {
    var retryRequest = err || request.RetryStrategies.HTTPOrNetworkError(err, res, body);
    return retryRequest;
  },
  strictSSL: false
});

var webpages = parse(webpagesCsv, {
  columns: true,
  delimiter: '\t'
});

// TODO: remove
webpages.forEach((e, i) => {
  e.fileId = i;
});

var normalizedUrlToFileId;
if (fs.existsSync(NORMALIZED_URL_TO_FILE_ID_FILE)) {
  normalizedUrlToFileId = JSON.parse(fs.readFileSync(NORMALIZED_URL_TO_FILE_ID_FILE, 'utf8'));
} else {
  normalizedUrlToFileId = {
    // Special key value
    // TODO: use `nextAvailableFileId`
    nextAvailableFileId: 0
  };
}

function processWebpage(webpage, cb) {
  if (fs.existsSync(path.join(WEBPAGES_PREFIX, webpage.fileId + '.output'))) {
  // if (_.has(normalizedUrlToFileId, webpage['normalized url'])) {
    console.log(`Already visited ${webpage.url}`);
    return process.nextTick(cb);
  }

  webpageRequest({
    url: webpage.url.replace('tto.tuoitre.vn', 'thethao.tuoitre.vn')
  }, function (err, res, body) {
    if (err) {
      console.log(err);
    }
    fs.writeFileSync(path.join(WEBPAGES_PREFIX, webpage.fileId + '.output'), err || res.body, 'utf8');

    // normalizedUrlToFileId[webpage['normalized url']] = webpage.fileId;

    // fs.writeFileSync(NORMALIZED_URL_TO_FILE_ID_FILE, JSON.stringify(normalizedUrlToFileId), 'utf8');
    console.log(`Visited ${webpage.url}`);
    cb();
  });
}

async.each(webpages, processWebpage, function (err) {
  if (err) {
    console.log('Error during op');
    console.log(err);
    return;
  }

  normalizedUrlToFileId.nextAvailableFileId = webpages.length;
  fs.writeFileSync(NORMALIZED_URL_TO_FILE_ID_FILE, JSON.stringify(normalizedUrlToFileId), 'utf8');

  console.log('Success');
});
