
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var async = require('async');
var request = require('requestretry');

var SEARCH_API_KEY = 'AIzaSyCT8bmjc-fjWT7KC-pAoccnO_Qvk-1GFbU';

var RESULTS_PER_PAGE = 10;

var MALARIA_TRANS = '"malaria" "paludisme" "ملاريا" "malária" "малярия" "疟疾" "maliarija" "sıtma" "ম্যালেরিয়া" "малария" "มาลาเรีย" "bệnh sốt rét" "ወባ" "малярія" "ملیریا" "bezgak"';

var SERVICED_NEWSPAPERS_FILE = './serviced-newspapers.json';
var SERVICED_QUERIES_PREFIX = './serviced-queries';
var LAST_SAVED_UID = './serviced-queries-final-040418';

var YEAR_START = 2000;
var YEAR_END = 2016;

var searchRequest = request.defaults({
  url: 'https://www.googleapis.com/customsearch/v1',
  json: true,
  retryStrategy: function(err, res, body) {
    var retryRequest = err || request.RetryStrategies.HTTPOrNetworkError(err, res, body) || res.statusCode !== 200;
    if (retryRequest) {
      console.log('Retrying request');
      if (res) {
        console.log(res.statusCode);
        console.log(res.body);
      }
    }
    return retryRequest;
  },
  qs: {
    'key': SEARCH_API_KEY,
    'num': RESULTS_PER_PAGE
  }
});

var newspapers = JSON.parse(fs.readFileSync('./newspapers.json', 'utf8'));

var servicedQueries;
var servicedQueriesFile = path.join(SERVICED_QUERIES_PREFIX, LAST_SAVED_UID + '.json');
if (servicedQueriesFile != '') {
  servicedQueries = JSON.parse(fs.readFileSync(servicedQueriesFile, 'utf8'));
} else {
  servicedQueries = {};
}

var servicedNewspapers;
if (fs.existsSync(SERVICED_NEWSPAPERS_FILE)) {
  servicedNewspapers = JSON.parse(fs.readFileSync(SERVICED_NEWSPAPERS_FILE, 'utf8'));
} else {
  servicedNewspapers = {};
}

newspapers.forEach(function (newspaper) {
  if (!(newspaper.uid in servicedQueries)) {
    servicedQueries[newspaper.uid] = {
      'pepfar': {},
      'pmi': {}
    };

    for (var i = YEAR_START; i <= YEAR_END; i++) {
      servicedQueries[newspaper.uid]['pepfar'][i] = [];
      servicedQueries[newspaper.uid]['pmi'][i] = [];
    }
  }
});

var servicedNewspapersSet = new Set(Object.keys(servicedNewspapers));

var unservicedNewspapers = newspapers.filter(e => !(servicedNewspapersSet.has(e.uid)));

function processNewspaper(newspaper, cb1) {

  function processNewspaperAndQuery(queryMeta, cb2) {

    var queryReadable = `${queryMeta.year} ${queryMeta.q} query for ${newspaper.uid}`;

    if (servicedQueries[newspaper.uid][queryMeta.q][queryMeta.year].length > 0) {
      console.log(`Already serviced ${queryReadable}`);
      return cb2();
    }

    console.log(`Servicing ${queryReadable}`);

    var startIndex = 1;
    var morePages = true;
    var searchQueryResults = [];
    async.until(
      function() { return !morePages; },
      function (cb3) {
        var searchOptions = {
          qs: {
            'q': queryMeta.q,
            'cx': newspaper['cse id'],
            'filter': 1,
            'sort': `date:r:${queryMeta.year}0101:${queryMeta.year}1231`,
            'start': startIndex
          }
        };

        if (queryMeta.q === 'pmi') {
          searchOptions['qs']['orTerms'] = MALARIA_TRANS;
        }

        searchRequest(searchOptions, function (err, res, body) {
          if (err) {
            return cb3(err);
          }

          if (res.statusCode !== 200) {
            console.log(`Received response with status code ${res.statusCode} for ${queryReadable}`);
            process.exit(1);
          }

          searchQueryResults.push(body);
          morePages = 'nextPage' in body.queries;
          if (morePages) {
            console.log('total estimated results: ' + body.searchInformation.totalResults);
            console.log('current start index: ' + startIndex);
            console.log('number of results on this page: ' + body.queries.request[0].count);
          }

          startIndex += RESULTS_PER_PAGE;
          cb3();
        });
      }, function (err) {
        if (err) {
          return cb2(err);
        }

        assert(queryMeta.year in servicedQueries[newspaper.uid][queryMeta.q], `Missing support for year ${queryMeta.year}`);
        servicedQueries[newspaper.uid][queryMeta.q][queryMeta.year] = searchQueryResults;
        cb2();
      }
    );
  }

  var queriesMeta = [];

  for (var i = YEAR_START; i <= YEAR_END; i++) {
    queriesMeta.push({
      q: 'pepfar',
      year: i
    });
    queriesMeta.push({
      q: 'pmi',
      year: i
    });
  }

  process.nextTick(function() {
    // Queries loop
    async.forEachSeries(queriesMeta, processNewspaperAndQuery, function (err) {
      if (err) {
        return cb1(err);
      }
      fs.writeFileSync(path.join(SERVICED_QUERIES_PREFIX, newspaper.uid + '.json'), JSON.stringify(servicedQueries), 'utf8');

      servicedNewspapers[newspaper.uid] = true;

      fs.writeFileSync(SERVICED_NEWSPAPERS_FILE, JSON.stringify(servicedNewspapers), 'utf8');
      console.log('Finished processing newspaper: ' + newspaper.uid);
      cb1();
    });
  });
}

// Main loop
async.forEachSeries(unservicedNewspapers, processNewspaper, function (err) {
  if (err) {
    console.log('Error during op');
    console.log(err);
    return;
  }

  console.log('Success');
});
