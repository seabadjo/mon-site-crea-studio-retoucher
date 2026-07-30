// routes/api.js - Routes REST API
const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

// ═══════════════════════════════════════════════════════════
// DEVIS
// ═══════════════════════════════════════════════════════════

// POST /api/devis  — Soumettre un nouveau devis
router.post('/devis', (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, company, sector, team_size,
      services, budget, delai, livrables, project_name, project_desc,
      references, has_identity, extra, base_price, final_price
    } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'Prénom, nom et email requis.' });
    }

    // Upsert client
    let client = db.clients.findByEmail.get(email);
    if (!client) {
      const uuid = uuidv4();
      db.clients.create.run({ uuid, first_name, last_name, email, phone: phone||null, company: company||null, sector: sector||null, team_size: team_size||null });
      client = db.clients.findByEmail.get(email);
    }

    // Générer ref unique
    const ref = 'REF-' + Math.random().toString(36).substring(2,8).toUpperCase();

    // Créer devis
    db.devis.create.run({
      ref,
      client_id:    client.id,
      services:     JSON.stringify(services || []),
      budget:       budget || 0,
      delai:        delai || 'Standard',
      livrables:    JSON.stringify(livrables || []),
      project_name: project_name || '',
      project_desc: project_desc || '',
      references:   references || '',
      has_identity: has_identity || '',
      extra:        extra || '',
      base_price:   base_price || 0,
      final_price:  final_price || 0,
    });

    const devisRow = db.devis.findByRef.get(ref);

    // Créer conversation automatiquement
    const convResult = db.conversations.create.run(devisRow.id, client.id);
    const convId = convResult.lastInsertRowid;

    // Message système d'accueil
    db.messages.create.run({
      conversation_id: convId,
      sender_type: 'system',
      sender_name: 'Créa Studio',
      content: `Bonjour ${first_name} ! Votre demande de devis **${ref}** a bien été reçue. Je vais l'analyser et revenir vers vous très rapidement. N'hésitez pas à me poser vos questions ici.`,
      type: 'system',
      offer_amount: null,
      offer_status: null,
    });

    // Notification admin
    db.notifications.create.run({
      type:  'new_devis',
      title: `Nouveau devis de ${first_name} ${last_name}`,
      body:  `Projet : ${project_name} — Estimation : ${final_price?.toLocaleString('fr-FR')} FCFA`,
      ref,
    });

    res.json({
      success: true,
      ref,
      devis_id:  devisRow.id,
      client_id: client.id,
      conv_id:   convId,
      client_uuid: client.uuid,
    });
  } catch (err) {
    console.error('POST /devis error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/devis  — Tous les devis (admin)
router.get('/devis', (req, res) => {
  const rows = db.devis.all.all();
  rows.forEach(r => {
    r.services  = JSON.parse(r.services  || '[]');
    r.livrables = JSON.parse(r.livrables || '[]');
  });
  res.json(rows);
});

// GET /api/devis/:ref  — Détail d'un devis
router.get('/devis/:ref', (req, res) => {
  const row = db.devis.findByRef.get(req.params.ref);
  if (!row) return res.status(404).json({ error: 'Devis introuvable' });
  row.services  = JSON.parse(row.services  || '[]');
  row.livrables = JSON.parse(row.livrables || '[]');
  res.json(row);
});

// PATCH /api/devis/:id/status  — Changer statut (admin)
router.patch('/devis/:id/status', (req, res) => {
  const { status } = req.body;
  db.devis.updateStatus.run(status, req.params.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════
// CONVERSATIONS & MESSAGES
// ═══════════════════════════════════════════════════════════

// GET /api/conversations  — Toutes les conversations (admin)
router.get('/conversations', (req, res) => {
  const rows = db.conversations.all.all();
  res.json(rows);
});

// GET /api/conversations/:id/messages  — Messages d'une conversation
router.get('/conversations/:id/messages', (req, res) => {
  const msgs = db.messages.findByConv.all(req.params.id);
  res.json(msgs);
});

// POST /api/conversations/:id/messages  — Envoyer un message (REST fallback)
router.post('/conversations/:id/messages', (req, res) => {
  const { sender_type, sender_name, content, type, offer_amount } = req.body;
  const result = db.messages.create.run({
    conversation_id: req.params.id,
    sender_type, sender_name, content,
    type: type || 'text',
    offer_amount: offer_amount || null,
    offer_status: offer_amount ? 'pending' : null,
  });
  const msg = { id: result.lastInsertRowid, conversation_id: parseInt(req.params.id), sender_type, sender_name, content, type: type||'text', offer_amount, created_at: new Date().toISOString() };
  res.json(msg);
});

// PATCH /api/messages/:id/offer  — Répondre à une offre
router.patch('/messages/:id/offer', (req, res) => {
  const { status } = req.body;  // accepted | rejected | countered
  db.messages.updateOfferStatus.run(status, req.params.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════
router.get('/notifications', (req, res) => {
  res.json({
    items: db.notifications.all.all(),
    unread: db.notifications.unread.get().count,
  });
});
router.post('/notifications/read', (req, res) => {
  db.notifications.markRead.run();
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════
// CLIENT SESSION — retrouver sa conversation via uuid
// ═══════════════════════════════════════════════════════════
router.get('/client/:uuid/devis', (req, res) => {
  const client = db.clients.findByUuid.get(req.params.uuid);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });
  const devisList = db.devis.listByClient.all(client.id).map((row) => {
    const conv = db.conversations.findByDevis.get(row.id);
    return {
      ...row,
      conv_id: conv?.id || null,
      services: JSON.parse(row.services || '[]'),
      livrables: JSON.parse(row.livrables || '[]'),
    };
  });
  res.json({ client, devis: devisList });
});

module.exports = router;
