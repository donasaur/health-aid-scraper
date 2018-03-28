
var fs = require('fs');
var moment = require('moment');
var Json2csvParser = require('json2csv').Parser;

var NEWSPAPERS_SCRAPED_DATA_FILE = './newspapers-scraped-data.json';

var newspapers = JSON.parse(fs.readFileSync('./newspapers.json', 'utf8'));
var nTToWebpages = JSON.parse(fs.readFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, 'utf8'));

var nTToNewspaper = {};
newspapers.forEach(function (newspaper) {
  nTToNewspaper[newspaper.title] = newspaper;
});

var bingResults = [];

Object.keys(nTToWebpages).forEach(function(newspaperTitle) {
  var newspaper = nTToNewspaper[newspaperTitle];
  var wTToBingResult = nTToWebpages[newspaperTitle];
  Object.keys(wTToBingResult).forEach(function (webpageTitle) {
    var bingResult = wTToBingResult[webpageTitle];
    bingResult.worldRegion = newspaper.worldRegion;
    bingResult.country = newspaper.country;
    bingResult.isoCode = newspaper.isoCode;
    bingResult.rank = newspaper.rank;
    bingResult.newspaperTitle = newspaperTitle;
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

var csvFields = ['world region', 'country', 'iso code', 'rank', 'newspaper title', 'webpage title', 'first-indexed date', 'url', 'snippet', 'pepfar keyword(s) present?', 'pmi keyword(s) present?', 'language'];
var objFields = ['worldRegion', 'country', 'isoCode', 'rank', 'newspaperTitle', 'name', 'firstIndexedTimestamp', 'url', 'snippet', 'pepfar', 'pmi', 'language'];

var fieldMappingsList = [];
csvFields.forEach(function(e, i) {
  fieldMappingsList.push({
    label: csvFields[i],
    value: objFields[i]
  });
});


var outputView = (new Json2csvParser({ fields: fieldMappingsList, delimiter: '\t' })).parse(bingResults);

fs.writeFileSync('./webpages-data-view.txt', outputView, 'utf8');
