import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
    const { code, state, error } = req.query;

    if (error === 'access_denied' || error || !code) {
        res.setHeader('Location', '/');
        return res.status(302).end();
    }

    try {
        let uName = 'User';
        if (state) {
            try {
                const dec = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
                if (dec.name) uName = dec.name;
            } catch (e) {}
        }

        const tr = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code: code
            })
        });

        const td = await tr.json();
        const at = td.access_token;

        if (!at) {
            res.setHeader('Location', '/');
            return res.status(302).end();
        }

        const ur = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': 'Bearer ' + at,
                'User-Agent': 'Datvex-Prompt-LAB'
            }
        });
        const ud = await ur.json();
        const pid = ud.id.toString();

        const client = await pool.connect();
        const q = 'INSERT INTO users (name, provider, provider_id) VALUES ($1, $2, $3) ON CONFLICT (provider_id) DO UPDATE SET name = $1 RETURNING id, name;';
        const v = [uName, 'github', pid];
        const r = await client.query(q, v);
        client.release();

        const dbUser = r.rows[0];
        const ui = encodeURIComponent(JSON.stringify({ id: dbUser.id, name: dbUser.name }));
        
        res.setHeader('Set-Cookie', 'auth_user=' + ui + '; Path=/; Max-Age=2592000; SameSite=Lax');
        res.setHeader('Location', '/');
        return res.status(302).end();

    } catch (err) {
        console.error('OAuth callback error:', err);
        res.setHeader('Location', '/');
        return res.status(302).end();
    }
}