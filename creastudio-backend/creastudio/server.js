// server.js — Créa Studio Backend
// Node.js + Express + Socket.IO + SQLite
require('dotenv').config();

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const path       = require('path');
const rateLimit  = require('express-rate-limit');
const db         = require('./db/database');
const apiRoutes  = require('./routes/api');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT       = process.env.PORT || 3000;
const ADMIN_CODE = process.env.ADMIN_CODE || 'admin1234'; // à changer en prod !
const FRONTEND_ROOT = path.resolve(__dirname, '..', '..', 'front_end');

// ─── MIDDLEWARES ────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(FRONTEND_ROOT));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting sur l'API
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api', limiter);

// ─── ROUTES REST ─────────────────────────────────────────────
app.use('/api', apiRoutes);

// Servir les pages HTML depuis le frontend et le dossier public du backend
app.get('/', (_, res) => res.sendFile(path.join(FRONTEND_ROOT, 'crea-studio.html')));
app.get('/devis', (_, res) => res.sendFile(path.join(FRONTEND_ROOT, 'devis.html')));
app.get('/chat', (_, res) => res.sendFile(path.join(__dirname, 'public', 'chat.html')));
app.get('/admin', (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ─── SOCKET.IO — CHAT TEMPS RÉEL ────────────────────────────
// Rooms: "conv_{id}"  — chaque conversation est une room

io.on('connection', (socket) => {
  console.log(`🔌 Socket connecté : ${socket.id}`);

  // Rejoindre une conversation
  socket.on('join_conversation', ({ conv_id, sender_name, sender_type }) => {
    const room = `conv_${conv_id}`;
    socket.join(room);
    socket.data = { conv_id, sender_name, sender_type };
    console.log(`👤 ${sender_name} (${sender_type}) rejoint ${room}`);

    // Marquer les messages comme lus si c'est l'admin
    if (sender_type === 'admin') {
      db.messages.markRead.run(conv_id);
      io.to(room).emit('messages_read', { conv_id });
    }

    // Envoyer l'historique
    const history = db.messages.findByConv.all(conv_id);
    socket.emit('history', history);

    // Notifier présence
    socket.to(room).emit('user_joined', { name: sender_name, type: sender_type });
  });

  // Message texte
  socket.on('send_message', ({ conv_id, sender_type, sender_name, content }) => {
    const room = `conv_${conv_id}`;
    const result = db.messages.create.run({
      conversation_id: conv_id,
      sender_type, sender_name, content,
      type: 'text',
      offer_amount: null,
      offer_status: null,
    });

    const msg = {
      id: result.lastInsertRowid,
      conversation_id: conv_id,
      sender_type, sender_name, content,
      type: 'text',
      created_at: new Date().toISOString(),
    };

    io.to(room).emit('new_message', msg);

    // Notif admin si c'est le client
    if (sender_type === 'client') {
      const conv = db.conversations.findById.get(conv_id);
      const devisRow = conv ? db.devis.findById.get(conv.devis_id) : null;
      db.notifications.create.run({
        type:  'new_message',
        title: `Message de ${sender_name}`,
        body:  content.slice(0, 80),
        ref:   devisRow?.ref || '',
      });
      io.emit('admin_notification', { type: 'new_message', sender_name, content, conv_id });
    }
  });

  // Proposition de prix (offre)
  socket.on('send_offer', ({ conv_id, sender_type, sender_name, amount, message }) => {
    const room = `conv_${conv_id}`;
    const content = message || `Proposition de prix : ${parseInt(amount).toLocaleString('fr-FR')} FCFA`;

    const result = db.messages.create.run({
      conversation_id: conv_id,
      sender_type, sender_name, content,
      type: 'offer',
      offer_amount: amount,
      offer_status: 'pending',
    });

    const msg = {
      id: result.lastInsertRowid,
      conversation_id: conv_id,
      sender_type, sender_name, content,
      type: 'offer',
      offer_amount: amount,
      offer_status: 'pending',
      created_at: new Date().toISOString(),
    };

    io.to(room).emit('new_message', msg);
    io.emit('admin_notification', { type: 'offer', sender_name, amount, conv_id });
  });

  // Répondre à une offre
  socket.on('respond_offer', ({ conv_id, message_id, response, counter_amount }) => {
    const room = `conv_${conv_id}`;
    db.messages.updateOfferStatus.run(response, message_id);

    // Message système de réponse
    let sysContent = '';
    if (response === 'accepted') {
      sysContent = '✅ L\'offre a été acceptée ! Je vous prépare le contrat.';
      // Mettre à jour le statut du devis
      const conv = db.conversations.findById.get(conv_id);
      if (conv) db.devis.updateStatus.run('accepted', conv.devis_id);
    } else if (response === 'rejected') {
      sysContent = '❌ L\'offre a été refusée.';
    } else if (response === 'countered' && counter_amount) {
      sysContent = `↩️ Contre-proposition : ${parseInt(counter_amount).toLocaleString('fr-FR')} FCFA`;
      // Créer un nouveau message offre
      const counterResult = db.messages.create.run({
        conversation_id: conv_id,
        sender_type: socket.data.sender_type,
        sender_name: socket.data.sender_name,
        content: sysContent,
        type: 'offer',
        offer_amount: counter_amount,
        offer_status: 'pending',
      });
      io.to(room).emit('new_message', {
        id: counterResult.lastInsertRowid,
        conversation_id: conv_id,
        sender_type: socket.data.sender_type,
        sender_name: socket.data.sender_name,
        content: sysContent,
        type: 'offer',
        offer_amount: counter_amount,
        offer_status: 'pending',
        created_at: new Date().toISOString(),
      });
    }

    if (sysContent && response !== 'countered') {
      db.messages.create.run({
        conversation_id: conv_id,
        sender_type: 'system',
        sender_name: 'Créa Studio',
        content: sysContent,
        type: 'system',
        offer_amount: null,
        offer_status: null,
      });
    }

    io.to(room).emit('offer_response', { message_id, response, counter_amount });
    if (sysContent && response !== 'countered') {
      io.to(room).emit('new_message', {
        conversation_id: conv_id,
        sender_type: 'system',
        sender_name: 'Créa Studio',
        content: sysContent,
        type: 'system',
        created_at: new Date().toISOString(),
      });
    }
  });

  // Typing indicator
  socket.on('typing', ({ conv_id, name }) => {
    socket.to(`conv_${conv_id}`).emit('typing', { name });
  });
  socket.on('stop_typing', ({ conv_id }) => {
    socket.to(`conv_${conv_id}`).emit('stop_typing');
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket déconnecté : ${socket.id}`);
    if (socket.data?.conv_id) {
      socket.to(`conv_${socket.data.conv_id}`).emit('user_left', { name: socket.data?.sender_name });
    }
  });
});

// ─── DÉMARRAGE ───────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🚀 Créa Studio Backend démarré`);
  console.log(`📡 Serveur     : http://localhost:${PORT}`);
  console.log(`🔑 Admin code  : ${ADMIN_CODE}`);
  console.log(`💾 Base de données : SQLite (creastudio.db)\n`);
});
