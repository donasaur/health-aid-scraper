
var fs = require('fs');

var SERVICED_QUERIES_FILE = './serviced-queries.json';

var servicedQueries = JSON.parse(fs.readFileSync(SERVICED_QUERIES_FILE, 'utf8'));

Object.keys(servicedQueries).forEach(function(servicedQuery) {
  console.log(servicedQuery);
});
