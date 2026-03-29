import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/auth_user=([^;]+)/);
    if (!match) return res.status(401).json({ error: 'Unauthorized' });

    let userId;
    try {
        const u = JSON.parse(decodeURIComponent(match[1]));
        userId = u.id;
    } catch(e) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    let body = '';
    await new Promise(resolve => {
        req.on('data', chunk => body += chunk);
        req.on('end', resolve);
    });

    let name;
    try {
        name = JSON.parse(body).name;
    } catch(e) {
        return res.status(400).json({ error: 'Invalid body' });
    }

    if (!name || !/^[a-zA-Z0-9]{3,24}$/.test(name)) {
        return res.status(400).json({ error: 'Invalid nickname' });
    }

    const client = await pool.connect();
    try {
        await client.query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
        return res.status(200).json({ success: true });
    } catch(e) {
        return res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
}
