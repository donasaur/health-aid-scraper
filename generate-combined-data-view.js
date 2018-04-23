
var fs = require('fs');
var _ = require('lodash');
var normalizeUrl = require('normalize-url');
var parse = require('csv-parse/lib/sync');

var webpagesCsvBing = fs.readFileSync('./webpages-data-view-032918.txt', 'utf8');

var webpagesCsvGoogle = fs.readFileSync('./webpages-data-view-040418.txt', 'utf8');

var webpagesBing = parse(webpagesCsvBing, {
  columns: true,
  delimiter: '\t'
});

var webpagesGoogle = parse(webpagesCsvGoogle, {
  columns: true,
  delimiter: '\t'
});

var normalizedUrlToWebpageBing = _.groupBy(webpagesBing, e => normalizeUrl(e.url, {
  normalizeHttps: true
}));
var normalizedUrlToWebpageGoogle = _.groupBy(webpagesGoogle, e => normalizeUrl(e.url, {
  normalizeHttps: true
}));

function customizer(objValue, srcValue) {
  if (_.isArray(objValue)) {
    return objValue.concat(srcValue);
  }
}

var normalizedUrlToWebpages = _.mergeWith(_.cloneDeep(normalizedUrlToWebpageBing), normalizedUrlToWebpageGoogle, customizer);

var cnt = 0;

Object.keys(normalizedUrlToWebpages).forEach(function (normalizedUrl) {
  if (normalizedUrlToWebpages[normalizedUrl].length >= 2) {
    cnt++;
  }
});

console.log(cnt);

var normalizedUrlsBing = webpagesBing.map(e => normalizeUrl(e.url, {
  normalizeHttps: true
}));

var normalizedUrlsGoogle = webpagesGoogle.map(e => normalizeUrl(e.url, {
  normalizeHttps: true
}));

fs.writeFileSync('./normalized-urls-bing.txt', normalizedUrlsBing.join('\n'), 'utf8');
fs.writeFileSync('./normalized-urls-google.txt', normalizedUrlsGoogle.join('\n'), 'utf8');
