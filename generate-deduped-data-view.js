
var fs = require('fs');
var _ = require('lodash');
var parse = require('csv-parse/lib/sync');
var Json2csvParser = require('json2csv').Parser;

var webpagesCsvBing = fs.readFileSync('./webpages-data-view-bing.txt', 'ucs2');

var webpagesCsvGoogle = fs.readFileSync('./webpages-data-view-google.txt', 'ucs2');

var webpagesBing = parse(webpagesCsvBing, {
  columns: true,
  delimiter: '\t'
});

webpagesBing.forEach(e => {
  if (e['first-indexed date'] === 'N/A') {
    e['wayback year'] = 'N/A';
    e['pub year'] = 'N/A';
  } else {
    var waybackYear = (new Date(e['first-indexed date'])).getFullYear();
    e['wayback year'] = waybackYear;
    e['pub year'] = waybackYear;
  }
  e['google year'] = 'N/A';
  e['bing indexed'] = true;
});

var webpagesGoogle = parse(webpagesCsvGoogle, {
  columns: true,
  delimiter: '\t'
})

webpagesGoogle.forEach(e => {
  e['google indexed'] = true;
});

var normalizedUrlToWebpageBing = _.groupBy(webpagesBing, e => e['normalized url']);
var normalizedUrlToWebpageGoogle = _.groupBy(webpagesGoogle, e => e['normalized url']);

function customizer(objValue, srcValue) {
  if (_.isArray(objValue)) {
    return objValue.concat(srcValue);
  }
}

var normalizedUrlToWebpages = _.mergeWith(_.cloneDeep(normalizedUrlToWebpageBing), normalizedUrlToWebpageGoogle, customizer);

var normalizedUrlToWebpage = {};

Object.keys(normalizedUrlToWebpages).forEach(k => {
  var l = normalizedUrlToWebpages[k];
  var earliestPageFoundSoFar = null;
  var bingIndexed = false;
  var googleIndexed = false;

  l.forEach(e => {
    if (e['google indexed']) {
      googleIndexed = true;
    }
    if (e['bing indexed']) {
      bingIndexed = true;
    }

    if (!earliestPageFoundSoFar) {
      earliestPageFoundSoFar = e;
      return;
    }

    if (earliestPageFoundSoFar['pub year'] === 'N/A') {
      earliestPageFoundSoFar = e;
      return;
    }

    if (parseInt(e['pub year']) < parseInt(earliestPageFoundSoFar['pub year'])) {
      earliestPageFoundSoFar = e;
      return;
    }

    if ((parseInt(e['pub year']) === parseInt(earliestPageFoundSoFar['pub year'])) && e['google indexed']) {
      earliestPageFoundSoFar = e;
      return;
    }
  });

  earliestPageFoundSoFar['google indexed'] = googleIndexed;
  earliestPageFoundSoFar['bing indexed'] = bingIndexed;

  normalizedUrlToWebpage[k] = earliestPageFoundSoFar;
});

var webpages = _.values(normalizedUrlToWebpage);

var csvFields = ['unique id', 'world region', 'country', 'iso code', 'language', 'rank', 'newspaper title', 'pub year', 'webpage title', 'url', 'snippet', 'pepfar keyword(s) present?', 'pmi keyword(s) present?', 'google year', 'wayback year', 'normalized url', 'google indexed', 'bing indexed'];

var sortedWebpages = _.sortBy(webpages, ['country', 'iso code', 'rank', 'newspaper title', 'unique id', 'pub year', 'webpage title']);

var outputView = (new Json2csvParser({ fields: csvFields, delimiter: '\t' })).parse(sortedWebpages);

fs.writeFileSync('./webpages-data-view-deduped.txt', outputView, 'utf8');
