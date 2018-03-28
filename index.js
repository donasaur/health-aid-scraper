
var fs = require('fs');
var _ = require('lodash');
var async = require('async');
var request = require('requestretry');

var RESULTS_PER_PAGE = 50;


var NEWSPAPERS_SCRAPED_DATA_FILE = './newspapers-scraped-data.json';
var SERVICED_QUERIES_FILE = './serviced-queries.json';

var bingRequest = request.defaults({
  url: 'https://api.cognitive.microsoft.com/bing/v7.0/search',  
  headers: {
    'Ocp-Apim-Subscription-Key': '6e290f2bf904465e894febbace8774b2',
  },
  json: true,
  delayStrategy: function(err, res, body) {
    var nextReqDelay = 1000;
    if (!err && res.statusCode === 429) {
      if ('retry-after' in res.headers) {
        nextReqDelay = parseInt(res.headers['retry-after']) * 1000;
        console.log('response-specified delay: ' + nextReqDelay);
        return nextReqDelay;
      }
    }
    console.log('standard delay: ' + nextReqDelay);
    return nextReqDelay;
  },
  retryStrategy: function(err, res, body) {
    return err || request.RetryStrategies.HTTPOrNetworkError(err, res, body) || res.statusCode !== 200;
  },
  qs: {
    'count': RESULTS_PER_PAGE,
    'responseFilter': 'Webpages'
  }
});

// Note: for now, we only care about rank 1 newspapers
var newspapers = JSON.parse(fs.readFileSync('./newspapers.json', 'utf8'));
var searchTerms = JSON.parse(fs.readFileSync('./search-terms.json', 'utf8'));

var languageToSearchTerms = _.groupBy(searchTerms, function (e) {
  return e.language;
});

// Maps from newspaper title to (webpage title, bing json object)
var nTToWebpages;
var servicedQueries;
if (fs.existsSync(NEWSPAPERS_SCRAPED_DATA_FILE)) {
  nTToWebpages = JSON.parse(fs.readFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, 'utf8'));
} else {
  nTToWebpages = {};
}
if (fs.existsSync(SERVICED_QUERIES_FILE)) {
  servicedQueries = JSON.parse(fs.readFileSync(SERVICED_QUERIES_FILE, 'utf8'));
} else {
  servicedQueries = {};
}

newspapers.forEach(function (newspaper) {
  if (!(newspaper.title in nTToWebpages)) {
    nTToWebpages[newspaper.title] = {};
  }
});

function processNewspaper(newspaper, cb1) {
  var relevantSearchTerms = _.clone(languageToSearchTerms.all);

  if (newspaper.language !== 'all' && newspaper.language in languageToSearchTerms) {
    relevantSearchTerms = relevantSearchTerms.concat(languageToSearchTerms[newspaper.language]);
  }

  var wTToBingResult = nTToWebpages[newspaper.title];

  function processNewspaperAndSearchTerm(searchTerm, cb2) {
    var query = `${searchTerm.keywords} (site: ${newspaper.link})`;

    if (query in servicedQueries) {
      console.log('Already serviced query: ' + query);
      return cb2();
    }

    var resultsOffset = 0;
    var totalEstimatedMatches = -1;
    async.until(
      function() { return totalEstimatedMatches >= 0 && resultsOffset >= totalEstimatedMatches; },
      function (cb3) {
        bingRequest({
          qs: {
            'offset': resultsOffset,
            'q': query
          }
        }, function (err, res, body) {
          if (err) {
            return cb3(err);
          }

          if (res.statusCode !== 200) {
            console.log('Ended up with a response with a status code that is not 200');
            process.exit(1);
          }

          if (!('webPages' in body) || body.webPages.totalEstimatedMatches <= 0) {
            totalEstimatedMatches = 0;
            return cb3();
          }

          if (totalEstimatedMatches < 0) {
            totalEstimatedMatches = body.webPages.totalEstimatedMatches;

            if (totalEstimatedMatches > RESULTS_PER_PAGE) {
              console.log(newspaper.title + ' has a total of ' + totalEstimatedMatches + ' estimated matches for query ' + query);
            }
          }

          if (totalEstimatedMatches > RESULTS_PER_PAGE) {
            console.log('current offset: ' + resultsOffset);
            console.log('number of results on this page: ' + body.webPages.value.length);
          }

          body.webPages.value.forEach(function (bingResult) {
            if (!(bingResult.name in wTToBingResult)) {
              wTToBingResult[bingResult.name] = bingResult;
            }
            if (searchTerm.program === 'PEPFAR') {
              wTToBingResult[bingResult.name].pepfar = true;
            }

            if (searchTerm.program === 'PMI') {
              wTToBingResult[bingResult.name].pmi = true;
            }
          });
          resultsOffset += RESULTS_PER_PAGE;
          cb3();
        });
      }, function (err) {
        if (err) {
          return cb2(err);
        }
        servicedQueries[query] = true;
        console.log('Serviced query: ' + query);
        cb2();
      }
    );
  }

  // Search terms loop
  async.forEachSeries(relevantSearchTerms, processNewspaperAndSearchTerm, function (err) {
    if (err) {
      return cb1(err);
    }

    fs.writeFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, JSON.stringify(nTToWebpages), 'utf8');
    fs.writeFileSync(SERVICED_QUERIES_FILE, JSON.stringify(servicedQueries), 'utf8');

    console.log('Finished processing newspaper: ' + newspaper.title);
    cb1();
  });
}

// Main loop
async.forEachSeries(newspapers, processNewspaper, function (err) {
  if (err) {
    console.log('Error during op');
    console.log(err);
    return;
  }

  console.log('Success');
});
