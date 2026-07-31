const test = require('node:test');
const assert = require('node:assert/strict');
const devis = require('../dist/devis.js');

test('calculateEstimate adds selected extras and applies modifiers', () => {
  const result = devis.calculateEstimate(
    [{ name: 'Communication', price: 80000 }],
    ['Fichiers sources (Ai, Psd, Figma…)', 'Guide de marque (Charte graphique)', 'Formation & présentation'],
    1.3,
    0.9
  );

  assert.equal(result.basePrice, 80000 + 12000 + 50000 + 30000);
  assert.equal(result.finalPrice, Math.round((80000 + 12000 + 50000 + 30000) * 1.3 * 0.9));
});

test('buildDevisPayload composes the expected payload shape', () => {
  const payload = devis.buildDevisPayload({
    firstName: 'Jean',
    lastName: 'Placali',
    email: 'jean@studio.com',
    company: 'Créa Studio',
    selectedServices: [{ name: 'UX / UI Design', price: 150000 }],
    selectedLivrables: ['Fichiers finaux exportés'],
    budget: 500000,
    selectedDelai: 'Standard (2–4 semaines)',
    projectName: 'Refonte',
    projectDesc: 'Besoin d’un site vitrine',
    references: 'https://example.com',
    hasIdentity: 'Oui, à moderniser',
    extra: 'Date clé en septembre',
  });

  assert.equal(payload.first_name, 'Jean');
  assert.equal(payload.last_name, 'Placali');
  assert.equal(payload.services[0].name, 'UX / UI Design');
  assert.equal(payload.final_price, 150000);
});

test('resolveApiBase returns a local backend URL for port 8080', () => {
  assert.equal(devis.resolveApiBase({ location: { port: '8080' } }), 'http://localhost:3000');
});
