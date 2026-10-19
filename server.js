const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

pool.query(`
    CREATE TABLE IF NOT EXISTS resellers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        public_key TEXT UNIQUE NOT NULL,
        tg_bot_id INTEGER,
        tg_bot_start_id INTEGER,
        tg_channel_id INTEGER,
        tg_channel_large_id INTEGER,
        tg_group_id INTEGER,
        tg_post_id INTEGER,
        max_channel_id INTEGER,
        max_post_id INTEGER,
        is_active INTEGER DEFAULT 1
    )
`).then(() => console.log('✅ Database connected'))
  .catch(err => console.error('DB error:', err));

function generateKey() {
    return 'pk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function detectType(target, quantity) {
    target = target.trim();
    if (/^https?:\/\/t\.me\/[a-zA-Z0-9_]+\/\d+(\?.*)?$/.test(target)) return { type: 'TG_POST' };
    if (/https?:\/\/t\.me\/.*\?start=.*/i.test(target) || /^@.*\?start=.*/i.test(target)) return { type: 'TG_BOT_START' };
    if (/https?:\/\/max\.ru\/.*_biz\//i.test(target)) return { type: 'MAX_POST' };
    if (/https?:\/\/max\.ru\//i.test(target)) return { type: 'MAX_CHANNEL' };

    let identifier = target.startsWith('@') 
        ? target.substring(1).split('?')[0] 
        : (target.match(/https?:\/\/t\.me\/([^\/\?]+)/) || [])[1];
        
    if (!identifier) return { type: 'UNKNOWN' };
    if (identifier.toLowerCase().endsWith('bot')) return { type: 'TG_BOT' };

    try {
        const res = await axios.get(`https://t.me/${identifier}`, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, 
            timeout: 5000 
        });
        const html = res.data.toLowerCase();
        if (html.includes('subscriber')) return { type: 'TG_CHANNEL' };
        if (html.includes('member')) return { type: 'TG_GROUP' };
        return { type: 'UNKNOWN' };
    } catch (e) { 
        return { type: 'UNKNOWN' }; 
    }
}

app.get('/api/config', (req, res) => {
    pool.query('SELECT * FROM resellers WHERE public_key = $1 AND is_active = 1', [req.query.key])
        .then(result => {
            if (result.rows.length === 0) return res.status(404).json({ error: 'Invalid' });
            res.json(result.rows[0]);
        })
        .catch(err => res.status(500).json({ error: 'DB error' }));
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

app.get('/api/resellers', requireAdmin, (req, res) => {
    pool.query('SELECT * FROM resellers ORDER BY id DESC')
        .then(result => res.json(result.rows))
        .catch(err => res.status(500).json({ error: 'DB error' }));
});

app.post('/api/resellers', requireAdmin, (req, res) => {
    const k = generateKey();
    pool.query(`
        INSERT INTO resellers (name, public_key, tg_bot_id, tg_bot_start_id, tg_channel_id, tg_channel_large_id, tg_group_id, tg_post_id, max_channel_id, max_post_id, is_active) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [req.body.name, k, req.body.tg_bot_id, req.body.tg_bot_start_id, req.body.tg_channel_id, req.body.tg_channel_large_id, req.body.tg_group_id, req.body.tg_post_id, req.body.max_channel_id, req.body.max_post_id, 1])
        .then(() => res.json({ key: k }))
        .catch(err => res.status(500).json({ error: 'DB error' }));
});

app.delete('/api/resellers/:id', requireAdmin, (req, res) => {
    pool.query('DELETE FROM resellers WHERE id = $1', [req.params.id])
        .then(() => res.json({ ok: true }))
        .catch(err => res.status(500).json({ error: 'DB error' }));
});

// ==========================================
// NEW: SMART ORDER ROUTER ENDPOINT
// ==========================================
app.post('/api/smart-order', async (req, res) => {
    try {
        const { key, action, service, link, quantity } = req.body;

        if (key !== process.env.ROUTER_API_KEY) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        if (action !== 'add') {
            return res.status(400).json({ error: 'Only "add" action is supported' });
        }

        const detection = await detectType(link, parseInt(quantity));
        
        // ⚠️ IMPORTANT: Update these numbers to match your ACTUAL panel's service IDs!
        let correctServiceId = service; 
        if (detection.type === 'TG_CHANNEL') correctServiceId = 29;       // Change to your Channel ID
        else if (detection.type === 'TG_GROUP') correctServiceId = 61;    // Change to your Group ID
        else if (detection.type === 'TG_BOT') correctServiceId = 31;       // Change to your Bot ID
        else if (detection.type === 'TG_BOT_START') correctServiceId = 39;// Change to your Bot Start ID
        else if (detection.type === 'TG_POST') correctServiceId = 60;     // Change to your Post ID
        else if (detection.type === 'MAX_CHANNEL') correctServiceId = 48; // Change to your MAX Channel ID
        else if (detection.type === 'MAX_POST') correctServiceId = 49;    // Change to your MAX Post ID

        const upstreamResponse = await axios.post(process.env.UPSTREAM_API_URL, {
            key: process.env.UPSTREAM_API_KEY,
            action: 'add',
            service: correctServiceId,
            link: link,
            quantity: quantity
        });

        res.json({
            status: 'success',
            order: upstreamResponse.data.order
        });

    } catch (error) {
        console.error('Smart Order Routing Error:', error);
        res.status(500).json({ error: 'Failed to process order' });
    }
});

app.listen(PORT, () => console.log('✅ Server running'));
