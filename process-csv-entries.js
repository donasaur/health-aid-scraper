
var fs = require('fs');
var parse = require('csv-parse/lib/sync');
const { URL } = require('url');

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
