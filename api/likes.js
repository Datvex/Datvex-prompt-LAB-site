import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
    const { prompt_id } = req.query;

    if (!prompt_id) return res.status(400).json({ error: 'Missing prompt_id' });

    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/auth_user=([^;]+)/);
    let userId = null;
    if (match) {
        try {
            const u = JSON.parse(decodeURIComponent(match[1]));
            userId = u.id;
        } catch(e) {}
    }

    const client = await pool.connect();

    try {
        if (req.method === 'GET') {
            const countRes = await client.query(
                'SELECT COUNT(*) as count FROM likes WHERE prompt_id = $1',
                [prompt_id]
            );
            const count = parseInt(countRes.rows[0].count);

            let liked = false;
            if (userId) {
                const likedRes = await client.query(
                    'SELECT 1 FROM likes WHERE prompt_id = $1 AND user_id = $2',
                    [prompt_id, userId]
                );
                liked = likedRes.rows.length > 0;
            }

            return res.status(200).json({ count, liked });

        } else if (req.method === 'POST') {
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const likedRes = await client.query(
                'SELECT 1 FROM likes WHERE prompt_id = $1 AND user_id = $2',
                [prompt_id, userId]
            );

            let liked, count;

            if (likedRes.rows.length > 0) {
                await client.query(
                    'DELETE FROM likes WHERE prompt_id = $1 AND user_id = $2',
                    [prompt_id, userId]
                );
                liked = false;
            } else {
                await client.query(
                    'INSERT INTO likes (prompt_id, user_id) VALUES ($1, $2)',
                    [prompt_id, userId]
                );
                liked = true;
            }

            const countRes = await client.query(
                'SELECT COUNT(*) as count FROM likes WHERE prompt_id = $1',
                [prompt_id]
            );
            count = parseInt(countRes.rows[0].count);

            return res.status(200).json({ count, liked });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } finally {
        client.release();
    }
}