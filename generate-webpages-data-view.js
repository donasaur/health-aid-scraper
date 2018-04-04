
var fs = require('fs');
var _ = require('lodash');
var moment = require('moment');
var Json2csvParser = require('json2csv').Parser;

var NEWSPAPERS_SCRAPED_DATA_FILE = './newspapers-scraped-data-wayback.json';

var newspapers = JSON.parse(fs.readFileSync('./newspapers.json', 'utf8'));
var nTToWebpages = JSON.parse(fs.readFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, 'utf8'));

var nIdToNewspaper = {};
newspapers.forEach(function (newspaper) {
  nIdToNewspaper[newspaper.uid] = newspaper;
});

var searchResults = [];

Object.keys(nTToWebpages).forEach(function(newspaperId) {
  var newspaper = nIdToNewspaper[newspaperId];
  var wTTosearchResult = nTToWebpages[newspaperId];
  Object.keys(wTTosearchResult).forEach(function (webpageTitle) {
    var searchResult = wTTosearchResult[webpageTitle];
    searchResult['unique id'] = newspaperId;
    searchResult['world region'] = newspaper['world region'];
    searchResult.country = newspaper.country;
    searchResult['iso code'] = newspaper['iso code'];
    searchResult.language = newspaper.language;
    searchResult.rank = newspaper.rank;
    searchResult['newspaper title'] = newspaper['newspaper title'];
    searchResult['webpage title'] = searchResult.title;
    searchResult['pepfar keyword(s) present?'] = !!searchResult.pepfar;
    searchResult['pmi keyword(s) present?'] = !!searchResult.pmi;

    searchResult['google year'] = searchResult.year;
    searchResult['wayback year'] = searchResult.waybackTimestamp != null
      ? moment(searchResult.waybackTimestamp, 'YYYYMMDDhhmmss').year()
      : 'N/A';
    searchResult['pub year'] = searchResult['google year'];

    if (searchResult.waybackTimestamp != null && searchResult['wayback year'] < searchResult['google year']) {
      console.log('url: ' + searchResult.url);
      console.log('google search api year: ' + searchResult['google year']);
      console.log('wayback year: ' + searchResult['wayback year']);
      searchResult['pub year'] = searchResult['wayback year'];
    }
    searchResults.push(searchResult);
  });
});

var csvFields = ['unique id', 'world region', 'country', 'iso code', 'language', 'rank', 'newspaper title', 'pub year', 'webpage title', 'url', 'snippet', 'pepfar keyword(s) present?', 'pmi keyword(s) present?', 'google year', 'wayback year'];

var sortedsearchResults = _.sortBy(searchResults, ['country', 'iso code', 'rank', 'newspaper title', 'unique id', 'pub year', 'webpage title']);

var outputView = (new Json2csvParser({ fields: csvFields, delimiter: '\t' })).parse(sortedsearchResults);

fs.writeFileSync('./webpages-data-view.txt', outputView, 'utf8');
