
var fs = require('fs');
var _ = require('lodash');

var NEWSPAPERS_SCRAPED_DATA_FILE = './newspapers-scraped-data-wayback.json';

var nIdToWebpages = JSON.parse(fs.readFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, 'utf8'));

var totalWebpages = 0;

var itemsToPrint = [];

Object.keys(nIdToWebpages).forEach(function(newspaperId) {
  itemsToPrint.push([newspaperId, Object.keys(nIdToWebpages[newspaperId]).length]);
  totalWebpages += Object.keys(nIdToWebpages[newspaperId]).length;
});


var linesToPrint = _.sortBy(itemsToPrint, e => e[0]).map(e => e.join('\t'));
linesToPrint.forEach(e => console.log(e));

console.log('Total webpages: ' + totalWebpages);
