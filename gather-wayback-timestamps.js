
var fs = require('fs');
var async = require('async');
var request = require('requestretry');

var NEWSPAPERS_SCRAPED_DATA_FILE = './newspapers-scraped-data-wayback.json';

var nIdToWebpages = JSON.parse(fs.readFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, 'utf8'));

var searchResults = [];
var numUnsavedTimestamps = 0;

Object.keys(nIdToWebpages).forEach(function(newspaperId) {
  var wTToSearchResult = nIdToWebpages[newspaperId];
  Object.keys(wTToSearchResult).forEach(function (webpageTitle) {
    var searchResult = wTToSearchResult[webpageTitle];
    searchResults.push(searchResult);
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

function processsearchResult(searchResult, cb) {
  if ('waybackTimestamp' in searchResult) {
    console.log('Already added wayback timestamp for: ' + searchResult.url);
    return cb();
  }

  waybackRequest({
    qs: {
      'url': searchResult.url
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
      searchResult.waybackTimestamp = body.archived_snapshots.closest.timestamp;
    } else {
      searchResult.waybackTimestamp = null;
    }

    numUnsavedTimestamps += 1;

    console.log('Added wayback timestamp for: ' + searchResult.url + ' (' + numUnsavedTimestamps + ')');

    if (numUnsavedTimestamps > 0 && (numUnsavedTimestamps % 100) === 0) {
      console.log('Saving unsaved wayback timestamps');
      fs.writeFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, JSON.stringify(nIdToWebpages), 'utf8');
      numUnsavedTimestamps = 0;
    }
    cb();
  });
}

async.forEachSeries(searchResults, processsearchResult, function (err) {
  if (err) {
    console.log('Error during op');
    console.log(err);
    return;
  }

  if (numUnsavedTimestamps > 0) {
    console.log('Saving new wayback timestamps');
    fs.writeFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, JSON.stringify(nIdToWebpages), 'utf8');
    numUnsavedTimestamps = 0;
  }

  console.log('Success');
});
