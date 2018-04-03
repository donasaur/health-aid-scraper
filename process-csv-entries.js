
var fs = require('fs');
const { URL } = require('url');
var _ = require('lodash');
var parse = require('csv-parse/lib/sync');
var Json2csvParser = require('json2csv').Parser;

var GEN_SIMPLIFIED_NEWSPAPERS_VIEW = true;

var origNewspapersCsv = fs.readFileSync('./newspapers.csv', 'utf8');

var newspapersCsv = origNewspapersCsv
  .replace('worldregion', 'worldRegion')
  .replace('isocode', 'isoCode')
  .replace('newspaper', 'title');

var newspapers = parse(newspapersCsv, {
  columns: true,
  delimiter: '\t'
});

newspapers.forEach(function (newspaper) {
  newspaper.uid = (new URL(newspaper.link)).hostname.replace('www.', '');
});

console.log(newspapers[23]);

fs.writeFileSync('./newspapers.json', JSON.stringify(newspapers), 'utf8');

var origSearchTermsCsv = fs.readFileSync('./search-terms.csv', 'utf8');

var searchTermsCsv = origSearchTermsCsv
  .replace('search_term', 'keywords');

var searchTerms = parse(searchTermsCsv, {
  columns: true,
  delimiter: '\t'
});

searchTerms.forEach(function(term) {
  if (term.keywords.includes("&")) {
    term.keywords = term.keywords.replace(" & ", " ");
  } else {
    term.keywords = "\"" + term.keywords + "\"";
  }
});

console.log(searchTerms[23]);

fs.writeFileSync('./search-terms.json', JSON.stringify(searchTerms), 'utf8');

if (GEN_SIMPLIFIED_NEWSPAPERS_VIEW) {
  var csvFields = ['hostname', 'world region', 'country', 'iso code', 'rank', 'newspaper title', 'language'];
  var objFields = ['uid', 'worldRegion', 'country', 'isoCode', 'rank', 'title', 'language'];

  var fieldMappingsList = [];
  csvFields.forEach(function(e, i) {
    fieldMappingsList.push({
      label: csvFields[i],
      value: objFields[i]
    });
  });

  var sortedEntries = _.sortBy(newspapers, ['country', 'isoCode', 'rank', 'newspaperTitle', 'uid', 'name']);

  var outputView = (new Json2csvParser({ fields: fieldMappingsList, delimiter: '\t' })).parse(sortedEntries);

  fs.writeFileSync('./simplified-newspapers-view.txt', outputView, 'utf8');
}
