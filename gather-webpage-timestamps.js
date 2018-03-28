
var fs = require('fs');
var async = require('async');
var request = require('requestretry');

var NEWSPAPERS_SCRAPED_DATA_FILE = './newspapers-scraped-data.json';

var nTToWebpages = JSON.parse(fs.readFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, 'utf8'));

var bingResults = [];
var numUnsavedTimestamps = 0;

Object.keys(nTToWebpages).forEach(function(newspaperTitle) {
  var wTToBingResult = nTToWebpages[newspaperTitle];
  Object.keys(wTToBingResult).forEach(function (webpageTitle) {
    var bingResult = wTToBingResult[webpageTitle];
    bingResults.push(bingResult);
  });
});

var waybackRequest = request.defaults({
  url: 'http://archive.org/wayback/available',
  json: true,
  delayStrategy: function(err, res, body) {
    var nextRequestDelay = Math.floor(Math.random() * (1500 - 500 + 1) + 500);
    console.log('Next request delay: ' + nextRequestDelay);
    return nextRequestDelay;
  },
  retryStrategy: function(err, res, body) {
    return err || request.RetryStrategies.HTTPOrNetworkError(err, res, body) || res.statusCode !== 200;
  },
  qs: {
    'timestamp': '00000101000000'
  }
});

function processBingResult(bingResult, cb) {
  if ('firstIndexedTimestamp' in bingResult) {
    console.log('Already added first-indexed timestamp for: ' + bingResult.url);
    return cb();
  }

  waybackRequest({
    qs: {
      'url': bingResult.url
    }
  }, function (err, res, body) {
    if (err) {
      return cb(err);
    }

    if (res.statusCode !== 200) {
      console.log('Ended up with a response with a status code that is not 200');
      process.exit(1);
    }

    if (body.archived_snapshots && body.archived_snapshots.closest && body.archived_snapshots.closest.timestamp) {
      bingResult.firstIndexedTimestamp = body.archived_snapshots.closest.timestamp;
    } else {
      bingResult.firstIndexedTimestamp = null;
    }

    numUnsavedTimestamps += 1;

    console.log('Added first-indexed timestamp for: ' + bingResult.url + ' (' + numUnsavedTimestamps + ')');

    if (numUnsavedTimestamps > 0 && (numUnsavedTimestamps % 100) === 0) {
      console.log('Saving unsaved first-indexed timestamps');
      fs.writeFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, JSON.stringify(nTToWebpages), 'utf8');
      numUnsavedTimestamps = 0;
    }
    cb();
  });
}

async.forEachSeries(bingResults, processBingResult, function (err) {
  if (err) {
    console.log('Error during op');
    console.log(err);
    return;
  }

  if (numUnsavedTimestamps > 0) {
    console.log('Saving new first-indexed timestamps');
    fs.writeFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, JSON.stringify(nTToWebpages), 'utf8');
    numUnsavedTimestamps = 0;
  }

  console.log('Success');
});
