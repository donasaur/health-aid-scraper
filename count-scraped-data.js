
var fs = require('fs');

var NEWSPAPERS_SCRAPED_DATA_FILE = './newspapers-scraped-data.json';

var nIdToWebpages = JSON.parse(fs.readFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, 'utf8'));

var totalWebpages = 0;

Object.keys(nIdToWebpages).forEach(function(newspaperId) {
  console.log(newspaperId, Object.keys(nIdToWebpages[newspaperId]).length);
  totalWebpages += Object.keys(nIdToWebpages[newspaperId]).length;
});

console.log('Total webpages: ' + totalWebpages);
