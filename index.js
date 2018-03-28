
var fs = require('fs');
var _ = require('lodash');
var async = require('async');
var request = require('requestretry');

var RESULTS_PER_PAGE = 50;


var NEWSPAPERS_SCRAPED_DATA_FILE = './newspapers-scraped-data.json';
var SERVICED_QUERIES_FILE = './serviced-queries.json';

var request = request.defaults({
  url: 'https://api.cognitive.microsoft.com/bing/v7.0/search',  
  headers: {
    'Ocp-Apim-Subscription-Key': '6e290f2bf904465e894febbace8774b2',
  },
  json: true,
  delayStrategy: function(err, res, body) {
    if (res.statusCode === 429 && res.headers['Retry-After']) {
      console.log("response-specified delay: " + res.headers['Retry-After']);
      return parseInt(res.headers['Retry-After'] * 1000);
    } else {
      console.log("standard delay: " + 1);
      return 1000;
    }
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

// Maps from newspaper title to (article title, bing json object)
var nTToArticles;
var servicedQueries;
if (fs.existsSync(NEWSPAPERS_SCRAPED_DATA_FILE)) {
  nTToArticles = JSON.parse(fs.readFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, 'utf8'));
} else {
  nTToArticles = {};
}
if (fs.existsSync(SERVICED_QUERIES_FILE)) {
  servicedQueries = JSON.parse(fs.readFileSync(SERVICED_QUERIES_FILE, 'utf8'));
} else {
  servicedQueries = {};
}

newspapers.forEach(function (newspaper) {
  if (!(newspaper.title in nTToArticles)) {
    nTToArticles[newspaper.title] = {};
  }
});

function processNewspaper(newspaper, cb1) {
  var relevantSearchTerms = _.clone(languageToSearchTerms.all);

  if (newspaper.language !== 'all' && newspaper.language in languageToSearchTerms) {
    relevantSearchTerms = relevantSearchTerms.concat(languageToSearchTerms[newspaper.language]);
  }

  var aTToBingResult = nTToArticles[newspaper.title];

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
        request({
          qs: {
            'offset': resultsOffset,
            'q': query
          }
        }, function (err, res, body) {
          if (err) {
            return cb3(err);
          }
          if (!('webPages' in body) || body.webPages.totalEstimatedMatches <= 0) {
            totalEstimatedMatches = 0;
            return cb3();
          }

          if (totalEstimatedMatches < 0) {
            totalEstimatedMatches = body.webPages.totalEstimatedMatches;
          }

          body.webPages.value.forEach(function (bingResult) {
            if (!(bingResult.name in aTToBingResult)) {
              aTToBingResult[bingResult.name] = bingResult;
            }
            if (searchTerm.program === 'PEPFAR') {
              aTToBingResult[bingResult.name].pepfar = true;
            }

            if (searchTerm.program === 'PMI') {
              aTToBingResult[bingResult.name].pmi = true;
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

    fs.writeFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, JSON.stringify(nTToArticles), 'utf8');
    fs.writeFileSync(SERVICED_QUERIES_FILE, JSON.stringify(servicedQueries), 'utf8');

    console.log('Finished processing newspaper: ' + newspaper.title);
    cb1();
  });
}

// Main loop
async.forEachSeries(newspapers, processNewspaper, function (err) {
  if (err) {
    console.log("Error during op");
    console.log(err);
    return;
  }

  console.log("Success");
});
