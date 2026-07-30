# 🎨 Créa Studio — Backend Complet

Système de devis + chat en temps réel pour un studio créatif.
**Node.js + Express + Socket.IO + SQLite**

---

## 📁 Structure du projet

```
creastudio/
├── server.js              # Serveur principal (Express + Socket.IO)
├── package.json
├── .env.example           # Variables d'environnement (copier en .env)
├── db/
│   └── database.js        # Schéma SQLite + requêtes préparées
├── routes/
│   └── api.js             # Routes REST API
└── public/                # Pages HTML (servis statiquement)
    ├── index.html         # Page d'accueil (crea-studio.html)
    ├── devis.html         # Formulaire de devis
    ├── chat.html          # Chat client (négociation)
    └── admin.html         # Tableau de bord admin
```

---

## 🚀 Installation & Démarrage

### 1. Prérequis
- **Node.js** v18+ installé : https://nodejs.org
- Un terminal (CMD, PowerShell, ou terminal Mac/Linux)

### 2. Installer les dépendances
```bash
cd creastudio
npm install
```

### 3. Configurer l'environnement
```bash
cp .env.example .env
# Modifier le fichier .env avec votre code admin
```

### 4. Copier vos pages HTML
Placez vos fichiers dans le dossier `public/` :
- `crea-studio.html` → renommer en `index.html`
- `devis.html`
- `chat.html` (fourni)
- `admin.html` (fourni)

### 5. Démarrer le serveur
```bash
# Production
npm start

# Développement (avec rechargement auto)
npm run dev
```

Le serveur démarre sur **http://localhost:3000**

---

## 🌐 Pages disponibles

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | Site principal |
| `http://localhost:3000/devis` | Formulaire de devis client |
| `http://localhost:3000/chat?ref=REF-XXX&email=...` | Chat client |
| `http://localhost:3000/admin` | Tableau de bord admin |

---

## 🔑 Accès Admin

Le code admin par défaut est **`admin1234`**  
→ Changez-le dans `.env` : `ADMIN_CODE=votre_code_secret`  
→ Et dans `public/admin.html` ligne `const ADMIN_CODE = '...'`

---

## 🔌 API REST

### Devis
```
POST   /api/devis              Créer un devis + ouvrir une conversation
GET    /api/devis              Lister tous les devis
GET    /api/devis/:ref         Détail d'un devis
PATCH  /api/devis/:id/status   Changer le statut (pending/negotiating/accepted/rejected)
```

### Conversations & Messages
```
GET    /api/conversations                  Toutes les conversations
GET    /api/conversations/:id/messages     Messages d'une conversation
POST   /api/conversations/:id/messages     Envoyer un message (REST)
PATCH  /api/messages/:id/offer             Répondre à une offre
```

### Client
```
GET    /api/client/:uuid/devis   Retrouver ses devis via UUID
```

### Notifications
```
GET    /api/notifications       Liste des notifications admin
POST   /api/notifications/read  Marquer tout comme lu
```

---

## ⚡ Événements Socket.IO

### Client → Serveur
| Événement | Données |
|-----------|---------|
| `join_conversation` | `{conv_id, sender_name, sender_type}` |
| `send_message` | `{conv_id, sender_type, sender_name, content}` |
| `send_offer` | `{conv_id, sender_type, sender_name, amount, message}` |
| `respond_offer` | `{conv_id, message_id, response, counter_amount?}` |
| `typing` | `{conv_id, name}` |
| `stop_typing` | `{conv_id}` |

### Serveur → Client
| Événement | Données |
|-----------|---------|
| `history` | `[messages]` |
| `new_message` | `{message}` |
| `offer_response` | `{message_id, response}` |
| `typing` / `stop_typing` | `{name}` |
| `user_joined` / `user_left` | `{name, type}` |
| `admin_notification` | `{type, sender_name, content, conv_id}` |

---

## 💾 Base de données SQLite

Fichier créé automatiquement : `db/creastudio.db`

Tables : `clients`, `devis`, `conversations`, `messages`, `notifications`

---

## 🔄 Workflow complet

1. **Client** remplit le formulaire sur `/devis`
2. Soumission → `POST /api/devis` crée : client + devis + conversation + message d'accueil
3. **Client** accède à `/chat?ref=REF-XXX&email=...` pour discuter
4. **Admin** voit la notification sur `/admin` et répond
5. Les deux parties peuvent **proposer un prix**, **accepter**, **refuser** ou **contre-proposer**
6. Quand l'offre est acceptée, le statut du devis passe en `accepted`

---

## 🛡️ Sécurité (production)

- Changer `ADMIN_CODE` dans `.env`
- Ajouter HTTPS (Let's Encrypt / Nginx reverse proxy)
- Utiliser un vrai système d'auth (JWT) pour l'admin
- Configurer CORS pour votre domaine uniquement
- Sauvegarder régulièrement `creastudio.db`

---

## 📞 Support

Créa Studio — hello@creastudio.com
