
var fs = require('fs');

var NEWSPAPERS_SCRAPED_DATA_FILE = './newspapers-scraped-data.json';

var nTToWebpages = JSON.parse(fs.readFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, 'utf8'));

var totalWebpages = 0;

Object.keys(nTToWebpages).forEach(function(newspaperTitle) {
  console.log(newspaperTitle, Object.keys(nTToWebpages[newspaperTitle]).length);
  totalWebpages += Object.keys(nTToWebpages[newspaperTitle]).length;
});

console.log('Total webpages: ' + totalWebpages);
