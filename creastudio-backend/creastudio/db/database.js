// db/database.js - Stockage JSON local sans dépendance native
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'creastudio.db.json');
const defaultData = {
  clients: [],
  devis: [],
  conversations: [],
  messages: [],
  notifications: [],
};

let db = loadData();

function loadData() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
    return JSON.parse(JSON.stringify(defaultData));
  }

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      clients: Array.isArray(parsed.clients) ? parsed.clients : [],
      devis: Array.isArray(parsed.devis) ? parsed.devis : [],
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    };
  } catch (error) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
    return JSON.parse(JSON.stringify(defaultData));
  }
}

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function nextId(list) {
  return list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function getClient(clientId) {
  return db.clients.find((client) => Number(client.id) === Number(clientId)) || null;
}

function getDevisWithClient(devis) {
  const client = getClient(devis.client_id);
  return {
    ...devis,
    first_name: client?.first_name || '',
    last_name: client?.last_name || '',
    email: client?.email || '',
    company: client?.company || '',
  };
}

const clientQueries = {
  create: {
    run(values) {
      const client = {
        id: nextId(db.clients),
        uuid: values.uuid,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        phone: values.phone || null,
        company: values.company || null,
        sector: values.sector || null,
        team_size: values.team_size || null,
        created_at: new Date().toISOString(),
      };
      db.clients.push(client);
      save();
      return { lastInsertRowid: client.id };
    },
  },
  findByEmail: {
    get(email) {
      return db.clients.find((client) => client.email === email) || null;
    },
  },
  findById: {
    get(id) {
      return getClient(id);
    },
  },
  findByUuid: {
    get(uuid) {
      return db.clients.find((client) => client.uuid === uuid) || null;
    },
  },
};

const devisQueries = {
  create: {
    run(values) {
      const devis = {
        id: nextId(db.devis),
        ref: values.ref,
        client_id: values.client_id,
        services: values.services || '[]',
        budget: values.budget || 0,
        delai: values.delai || 'Standard',
        livrables: values.livrables || '[]',
        project_name: values.project_name || '',
        project_desc: values.project_desc || '',
        references: values.references || '',
        has_identity: values.has_identity || '',
        extra: values.extra || '',
        base_price: values.base_price || 0,
        final_price: values.final_price || 0,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.devis.push(devis);
      save();
      return { lastInsertRowid: devis.id };
    },
  },
  findByRef: {
    get(ref) {
      const devis = db.devis.find((item) => item.ref === ref);
      return devis ? getDevisWithClient(devis) : null;
    },
  },
  findById: {
    get(id) {
      const devis = db.devis.find((item) => Number(item.id) === Number(id));
      return devis ? getDevisWithClient(devis) : null;
    },
  },
  updateStatus: {
    run(status, id) {
      const devis = db.devis.find((item) => Number(item.id) === Number(id));
      if (devis) {
        devis.status = status;
        devis.updated_at = new Date().toISOString();
        save();
      }
      return { changes: devis ? 1 : 0 };
    },
  },
  updatePrice: {
    run(finalPrice, id) {
      const devis = db.devis.find((item) => Number(item.id) === Number(id));
      if (devis) {
        devis.final_price = finalPrice;
        devis.updated_at = new Date().toISOString();
        save();
      }
      return { changes: devis ? 1 : 0 };
    },
  },
  all: {
    all() {
      return db.devis.map((devis) => getDevisWithClient(devis)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
  },
  listByClient: {
    all(clientId) {
      return db.devis
        .filter((devis) => Number(devis.client_id) === Number(clientId))
        .map((devis) => getDevisWithClient(devis))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
  },
};

const convQueries = {
  create: {
    run(devisId, clientId) {
      const conversation = {
        id: nextId(db.conversations),
        devis_id: Number(devisId),
        client_id: Number(clientId),
        status: 'open',
        created_at: new Date().toISOString(),
      };
      db.conversations.push(conversation);
      save();
      return { lastInsertRowid: conversation.id };
    },
  },
  findByDevis: {
    get(devisId) {
      return db.conversations.find((item) => Number(item.devis_id) === Number(devisId)) || null;
    },
  },
  findById: {
    get(id) {
      return db.conversations.find((item) => Number(item.id) === Number(id)) || null;
    },
  },
  all: {
    all() {
      return db.conversations
        .map((conversation) => {
          const devis = db.devis.find((item) => Number(item.id) === Number(conversation.devis_id));
          const client = db.clients.find((item) => Number(item.id) === Number(conversation.client_id));
          return {
            ...conversation,
            ref: devis?.ref || '',
            project_name: devis?.project_name || '',
            devis_status: devis?.status || 'pending',
            first_name: client?.first_name || '',
            last_name: client?.last_name || '',
          };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
  },
};

const msgQueries = {
  create: {
    run(values) {
      const message = {
        id: nextId(db.messages),
        conversation_id: Number(values.conversation_id),
        sender_type: values.sender_type,
        sender_name: values.sender_name,
        content: values.content,
        type: values.type || 'text',
        offer_amount: values.offer_amount || null,
        offer_status: values.offer_status || null,
        read_at: null,
        created_at: new Date().toISOString(),
      };
      db.messages.push(message);
      save();
      return { lastInsertRowid: message.id };
    },
  },
  findByConv: {
    all(conversationId) {
      return db.messages
        .filter((item) => Number(item.conversation_id) === Number(conversationId))
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    },
  },
  updateOfferStatus: {
    run(status, id) {
      const message = db.messages.find((item) => Number(item.id) === Number(id));
      if (message) {
        message.offer_status = status;
        save();
      }
      return { changes: message ? 1 : 0 };
    },
  },
  markRead: {
    run(conversationId) {
      let changed = 0;
      db.messages.forEach((message) => {
        if (Number(message.conversation_id) === Number(conversationId) && message.sender_type === 'client' && !message.read_at) {
          message.read_at = new Date().toISOString();
          changed += 1;
        }
      });
      if (changed) save();
      return { changes: changed };
    },
  },
  unreadCount: {
    get(conversationId) {
      return {
        count: db.messages.filter((message) => Number(message.conversation_id) === Number(conversationId) && message.sender_type === 'client' && !message.read_at).length,
      };
    },
  },
};

const notifQueries = {
  create: {
    run(values) {
      const notification = {
        id: nextId(db.data.notifications),
        type: values.type,
        title: values.title,
        body: values.body || '',
        ref: values.ref || '',
        read: 0,
        created_at: new Date().toISOString(),
      };
      db.notifications.push(notification);
      save();
      return { lastInsertRowid: notification.id };
    },
  },
  all: {
    all() {
      return db.notifications.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
    },
  },
  markRead: {
    run() {
      db.notifications.forEach((notification) => {
        notification.read = 1;
      });
      save();
      return { changes: db.notifications.length };
    },
  },
  unread: {
    get() {
      return { count: db.notifications.filter((notification) => notification.read === 0).length };
    },
  },
};

module.exports = {
  db,
  clients: clientQueries,
  devis: devisQueries,
  conversations: convQueries,
  messages: msgQueries,
  notifications: notifQueries,
};
