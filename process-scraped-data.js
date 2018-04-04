
var fs = require('fs');

var SERVICED_QUERIES_FILE = './serviced-queries/serviced-queries-final-040418.json';

var NEWSPAPERS_SCRAPED_DATA_FILE = './newspapers-scraped-data.json';

var servicedQueries = JSON.parse(fs.readFileSync(SERVICED_QUERIES_FILE, 'utf8'));

// Maps from newspaper id to (webpage title, search json object)
var nIdToWebpages = {};

var newspapers = JSON.parse(fs.readFileSync('./newspapers.json', 'utf8'));
newspapers.forEach(function (newspaper) {
  nIdToWebpages[newspaper.uid] = {};
});

Object.keys(servicedQueries).forEach(function (newspaperId) {
  Object.keys(servicedQueries[newspaperId]).forEach(function (q) {
    Object.keys(servicedQueries[newspaperId][q]).forEach(function (year) {
      servicedQueries[newspaperId][q][year].forEach(function (resBody) {
        if (!('items' in resBody)) {
          return;
        }

        resBody['items'].forEach(function (rawWebpageMeta) {
          var rawYear = parseInt(year);
          if (rawWebpageMeta.title in nIdToWebpages[newspaperId]) {
            var webpageMeta = nIdToWebpages[newspaperId][rawWebpageMeta.title];
            if (rawYear < parseInt(webpageMeta.year)) {
              webpageMeta.year = rawYear;
            }
          } else {

            webpageMeta = {
              year: rawYear,
              title: rawWebpageMeta.title,
              url: rawWebpageMeta.link,
              snippet: rawWebpageMeta.snippet
            }

            nIdToWebpages[newspaperId][rawWebpageMeta.title] = webpageMeta;
          }
          webpageMeta[q] = true;
        });
      });
    });
  });
});

fs.writeFileSync(NEWSPAPERS_SCRAPED_DATA_FILE, JSON.stringify(nIdToWebpages), 'utf8');
