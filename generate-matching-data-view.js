
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var parse = require('csv-parse/lib/sync');
var Json2csvParser = require('json2csv').Parser;
var webpagesCsv = fs.readFileSync('./webpages-data-view-deduped.txt', 'utf8');
var Entities = require('html-entities').AllHtmlEntities;

var WEBPAGES_PREFIX = './webpages';

var alphanumericRegex = /[^0-9a-z]/gi;
var entities = new Entities();

var PEPFAR_TERMS = ["PEPFAR", "President's Emergency Plan for AIDS Relief", "Presidential Emergency Plan for AIDS Relief", "Presidents Emergency Plan for AIDS Relief", "Plano de Emergência do Presidente dos Estados Unidos para o Alívio da SIDA", "Plano de Emergência do Presidente dos E.U.A. para o Alívio do SIDA", "Plano de Emergência do Presidente dos Estados", "Plano de Emergência do Presidente para o Alívio do VIH/SIDA ", "Plano de Emergência do Presidente dos Estados Unidos para Alívio da Sida", "Plano de Emergência do Presidente dos EUA para o Alívio do SIDA", "Plan d'urgence du Président pour la lutte contre le SIDA", "Plan Présidentiel d'Urgence contre le SIDA", "Plan d'Urgence du Président Américain pour la Lutte contre le SIDA ", "Plan d’aide d’Urgence du Président à la Lutte Contre le SIDA", "Plan d'urgence du Président des États-Unis pour la lutte contre le sida", "du Plan présidentiel américain d' aide d'urgence à la lutte contre le sida", "Plan de Emergencia del Presidente de los Estados Unidos para el Alivio del Sida", "Plan Presidencial de Emergencia para Alivio del SIDA ", "Plan de Emergencia del Presidente para el Alivio del SIDA ", "Plan de Emergencia del Presidente de los E.U. para el Alivio del Sida", "Plan de Emergencia para el Alivio del SIDA del Presidente de los Estados Unidos"].map(e => {
  return e.toLowerCase().replace(alphanumericRegex, '');
});

var PMI_OR_TERMS = ["malaria", "paludisme", "malária", "PEPFAR"].map(e => {
  return e.toLowerCase().replace(alphanumericRegex, '');
});

var PMI_TERMS = ["President's Malaria Initiative", "Presidents Malaria Initiative", "Presidential Malaria Initiative", "Iniciativa Presidencial Contra a Malaria", "Iniciativa do Presidente dos Estados Unidos para o Controlo da Malária", "Iniciativa Presidencial de Luta contra a Malária", "Iniciativa Presidencial Contra a Malária", "Initiative Malaria du Président des États-Unis ", "Initiative Présidentielle Contre le Paludisme", "Initiative du Président des États-Unis pour la lutte contre le paludisme", "Président des États-Unis de l'Initiative pour lutter contre le paludisme", "Iniciativa del Presidente contra la Malaria", "Iniciativa Presidencial Americana contra a Malária"].map(e => {
  return e.toLowerCase().replace(alphanumericRegex, '');
});

SPECIAL_PEPFAR_TERMS = ["总统防治艾滋病紧急救援计划", "总统疟疾倡议"];
SPECIAL_PMI_TERMS = ["总统防治疟疾行动计划", "总统艾滋救助紧急计划"];

var webpages = parse(webpagesCsv, {
  columns: true,
  delimiter: '\t'
});

// TODO: remove
webpages.forEach((e, i) => {
  e.fileId = i;
});

var outputWebpages = [];

webpages.forEach(webpage => {
  if (!fs.existsSync(path.join(WEBPAGES_PREFIX, webpage.fileId + '.output'))) {
    return;
  }

  webpage['pepfar term(s) present?'] = false;
  webpage['pmi term(s) present?'] = false;

  var webpageContents = entities.decode(fs.readFileSync(path.join(WEBPAGES_PREFIX, webpage.fileId + '.output'), 'utf8'));

  var specialWebpageContents = _.cloneDeep(webpageContents);
  webpageContents = webpageContents.toLowerCase().replace(alphanumericRegex, '');

  for (var i = 0; i < PEPFAR_TERMS.length; i++) {
    if (webpageContents.includes(PEPFAR_TERMS[i])) {
      webpage['pepfar term(s) present?'] = true;
      break;
    }
  }

  if (webpage.language === 'Mandarin' || webpage.language === 'Chinese') {
    console.log('Chinese webpage found');
    for (var is = 0; is < SPECIAL_PEPFAR_TERMS.length; is++) {
      if (specialWebpageContents.includes(SPECIAL_PEPFAR_TERMS[is])) {
        webpage['pepfar term(s) present?'] = true;
        break;
      }
    }
  }

  if (webpageContents.includes('pmi')) {
    for (var j = 0; j < PMI_OR_TERMS.length; j++) {
      if (webpageContents.includes(PMI_OR_TERMS[j])) {
        webpage['pmi term(s) present?'] = true;
        break;
      }
    }
  }

  if (!webpage['pmi term(s) present?']) {
    for (var k = 0; k < PMI_TERMS.length; k++) {
      if (webpageContents.includes(PMI_TERMS[k])) {
        webpage['pmi term(s) present?'] = true;
        break;
      }
    }

    if (webpage.language === 'Mandarin' || webpage.language === 'Chinese') {
      console.log('Chinese webpage found');
      for (var ks = 0; ks < SPECIAL_PMI_TERMS.length; ks++) {
        if (specialWebpageContents.includes(SPECIAL_PMI_TERMS[ks])) {
          webpage['pmi term(s) present?'] = true;
          break;
        }
      }
    }
  }

  if (webpage['pepfar term(s) present?'] || webpage['pmi term(s) present?']) {
    outputWebpages.push(webpage);
  }
});

var csvFields = ['unique id', 'world region', 'country', 'iso code', 'language', 'rank', 'newspaper title', 'pub year', 'webpage title', 'url', 'snippet', 'pepfar term(s) present?', 'pmi term(s) present?', 'google year', 'wayback year', 'normalized url', 'google indexed', 'bing indexed'];

var sortedOutputWebpages = _.sortBy(outputWebpages, ['country', 'iso code', 'rank', 'newspaper title', 'unique id', 'pub year', 'webpage title']);

var outputView = (new Json2csvParser({ fields: csvFields, delimiter: '\t' })).parse(sortedOutputWebpages);

fs.writeFileSync('./webpages-data-view-matching.txt', outputView, 'utf8');
