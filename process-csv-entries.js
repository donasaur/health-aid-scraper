
var fs = require('fs');
var parse = require('csv-parse/lib/sync');

var origNewspapersCsv = fs.readFileSync('./newspapers.csv', 'utf8');

var newspapersCsv = origNewspapersCsv
  .replace('worldregion', 'worldRegion')
  .replace('isocode', 'isoCode')
  .replace('newspaper', 'title');

var newspapers = parse(newspapersCsv, {
  columns: true,
  delimiter: '\t'
});

console.log(newspapers[0]);

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
