
var fs = require('fs');

var NEWSPAPERS_SCRAPED_DATA_FILE = './newspapers-scraped-data.json';

var nTToArticles = JSON.parse(fs.readFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, 'utf8'));

var totalArticles = 0;

Object.keys(nTToArticles).forEach(function(key) {
  console.log(key, Object.keys(nTToArticles[key]).length);
  totalArticles += Object.keys(nTToArticles[key]).length;
});

console.log('Total articles: ' + totalArticles);
