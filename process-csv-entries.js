
var fs = require('fs');
const { URL } = require('url');
var _ = require('lodash');
var parse = require('csv-parse/lib/sync');
var Json2csvParser = require('json2csv').Parser;

var GEN_SIMPLIFIED_NEWSPAPERS_VIEW = true;

var newspapersCsv = fs.readFileSync('./newspapers.csv', 'utf8');

var newspapers = parse(newspapersCsv, {
  columns: true,
  delimiter: '\t'
});

console.log(newspapers[23]);

fs.writeFileSync('./newspapers.json', JSON.stringify(newspapers), 'utf8');

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
