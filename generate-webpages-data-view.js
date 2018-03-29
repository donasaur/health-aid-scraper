
var fs = require('fs');
var _ = require('lodash');
var moment = require('moment');
var Json2csvParser = require('json2csv').Parser;

var NEWSPAPERS_SCRAPED_DATA_FILE = './newspapers-scraped-data.json';

var newspapers = JSON.parse(fs.readFileSync('./newspapers.json', 'utf8'));
var nTToWebpages = JSON.parse(fs.readFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, 'utf8'));

var nIdToNewspaper = {};
newspapers.forEach(function (newspaper) {
  nIdToNewspaper[newspaper.uid] = newspaper;
});

var bingResults = [];

Object.keys(nTToWebpages).forEach(function(newspaperId) {
  var newspaper = nIdToNewspaper[newspaperId];
  var wTToBingResult = nTToWebpages[newspaperId];
  Object.keys(wTToBingResult).forEach(function (webpageTitle) {
    var bingResult = wTToBingResult[webpageTitle];
    bingResult.uid = newspaperId;
    bingResult.worldRegion = newspaper.worldRegion;
    bingResult.country = newspaper.country;
    bingResult.isoCode = newspaper.isoCode;
    bingResult.rank = newspaper.rank;
    bingResult.newspaperTitle = newspaper.title;
    bingResult.pepfar = !!bingResult.pepfar;
    bingResult.pmi = !!bingResult.pmi;
    bingResult.language = newspaper.language;

    if (bingResult.firstIndexedTimestamp != null) {
      bingResult.firstIndexedTimestamp = moment(bingResult.firstIndexedTimestamp, 'YYYYMMDDhhmmss').format('YYYY-MM-DD');
    } else {
      bingResult.firstIndexedTimestamp = 'N/A';
    }

    bingResults.push(bingResult);
  });
});

var csvFields = ['unique id', 'world region', 'country', 'iso code', 'rank', 'newspaper title', 'webpage title', 'first-indexed date', 'url', 'snippet', 'pepfar keyword(s) present?', 'pmi keyword(s) present?', 'language'];
var objFields = ['uid', 'worldRegion', 'country', 'isoCode', 'rank', 'newspaperTitle', 'name', 'firstIndexedTimestamp', 'url', 'snippet', 'pepfar', 'pmi', 'language'];

var fieldMappingsList = [];
csvFields.forEach(function(e, i) {
  fieldMappingsList.push({
    label: csvFields[i],
    value: objFields[i]
  });
});

var sortedBingResults = _.sortBy(bingResults, ['country', 'isoCode', 'rank', 'newspaperTitle', 'uid', 'name']);

var outputView = (new Json2csvParser({ fields: fieldMappingsList, delimiter: '\t' })).parse(sortedBingResults);

fs.writeFileSync('./webpages-data-view.txt', outputView, 'utf8');
