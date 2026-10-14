const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('DB error:', err);
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS resellers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        public_key TEXT UNIQUE NOT NULL,
        tg_bot_id INTEGER, tg_bot_start_id INTEGER, tg_channel_id INTEGER,
        tg_channel_large_id INTEGER, tg_group_id INTEGER, tg_post_id INTEGER,
        max_channel_id INTEGER, max_post_id INTEGER,
        is_active INTEGER DEFAULT 1
    )`);
});

function generateKey() {
    return 'pk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function detectType(target, quantity) {
    target = target.trim();
    if (/^https?:\/\/t\.me\/[a-zA-Z0-9_]+\/\d+(\?.*)?$/.test(target)) return { type: 'TG_POST' };
    if (/https?:\/\/t\.me\/.*\?start=.*/i.test(target) || /^@.*\?start=.*/i.test(target)) return { type: 'TG_BOT_START' };
    if (/https?:\/\/max\.ru\/.*_biz\//i.test(target)) return { type: 'MAX_POST' };
    if (/https?:\/\/max\.ru\//i.test(target)) return { type: 'MAX_CHANNEL' };

    let identifier = target.startsWith('@') ? target.substring(1).split('?')[0] : (target.match(/https?:\/\/t\.me\/([a-zA-Z0-9_]+)/) || [])[1];
    if (!identifier) return { type: 'UNKNOWN' };
    if (identifier.toLowerCase().endsWith('bot')) return { type: 'TG_BOT' };

    try {
        const res = await axios.get(`https://t.me/${identifier}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        const html = res.data.toLowerCase();
        if (html.includes('subscriber')) return { type: 'TG_CHANNEL' };
        if (html.includes('member')) return { type: 'TG_GROUP' };
        return { type: 'UNKNOWN' };
    } catch (e) { return { type: 'UNKNOWN' }; }
}

app.get('/api/config', (req, res) => {
    db.get('SELECT * FROM resellers WHERE public_key = ?', [req.query.key], (err, row) => {
        if (!row || !row.is_active) return res.status(404).json({ error: 'Invalid' });
        res.json(row);
    });
});

app.post('/api/detect', async (req, res) => {
    res.json(await detectType(req.body.target, req.body.quantity));
});

const ADMIN_TOKEN = 'admin_' + Math.random().toString(36).substring(7);
app.post('/api/login', (req, res) => {
    if (req.body.password === process.env.ADMIN_PASSWORD) res.json({ token: ADMIN_TOKEN });
    else res.status(401).json({ error: 'Invalid' });
});

const requireAdmin = (req, res, next) => req.headers['authorization']?.split(' ')[1] === ADMIN_TOKEN ? next() : res.status(401).json({ error: 'No' });

app.get('/api/resellers', requireAdmin, (req, res) => db.all('SELECT * FROM resellers ORDER BY id DESC', (err, rows) => res.json(rows || [])));

app.post('/api/resellers', requireAdmin, (req, res) => {
    const k = generateKey();
    db.run(`INSERT INTO resellers (name, public_key, tg_bot_id, tg_bot_start_id, tg_channel_id, tg_channel_large_id, tg_group_id, tg_post_id, max_channel_id, max_post_id, is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [req.body.name, k, req.body.tg_bot_id, req.body.tg_bot_start_id, req.body.tg_channel_id, req.body.tg_channel_large_id, req.body.tg_group_id, req.body.tg_post_id, req.body.max_channel_id, req.body.max_post_id, 1], 
        function() { res.json({ key: k }); });
});

app.delete('/api/resellers/:id', requireAdmin, (req, res) => db.run(`DELETE FROM resellers WHERE id=?`, [req.params.id], () => res.json({ ok: true })));

app.listen(PORT, () => console.log('✅ Server running'));
