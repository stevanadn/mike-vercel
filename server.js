const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Keamanan Password
const jwt = require('jsonwebtoken'); // Token Login
const openDb = require('./database'); // <--- INI YG MEMBUAT DATABASE MUNCUL
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.CLASH_ROYALE_API_KEY;
// Gunakan Proxy agar tidak kena blokir IP
const BASE_URL = 'https://proxy.royaleapi.dev/v1'; 

const JWT_SECRET = "rahasia_negara_royale_hub_123";

// --- LOGGING SAAT STARTUP ---
console.log("------------------------------------------------");
console.log("🚀 MEMULAI SERVER...");
if (API_KEY) {
    console.log("✅ API KEY DITEMUKAN: " + API_KEY.substring(0, 10) + "...");
} else {
    console.error("❌ API KEY TIDAK DITEMUKAN! Cek file .env Anda.");
}
console.log("------------------------------------------------");

// --- API: REGISTER (DAFTAR AKUN BARU) ---
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username dan Password wajib diisi!" });
    }

    try {
        const db = await openDb();
        
        // Cek username kembar
        const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(400).json({ error: "Username sudah dipakai!" });
        }

        // Enkripsi Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Simpan ke Database
        await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);

        res.json({ success: true, message: "Pendaftaran Berhasil!" });
    } catch (e) {
        console.error("Register Error:", e);
        res.status(500).json({ error: "Gagal mendaftar." });
    }
});

// --- API: LOGIN (MASUK) ---
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const db = await openDb();

        // Cari user
        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        
        if (!user) {
            return res.status(400).json({ error: "Username tidak ditemukan." });
        }

        // Cek Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Password salah!" });
        }

        // Buat Token
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ success: true, token: token, username: user.username });

    } catch (e) {
        console.error("Login Error:", e);
        res.status(500).json({ error: "Terjadi kesalahan server." });
    }
});

// --- API: CARDS (CLASH ROYALE) ---
const apiRequest = axios.create({
    baseURL: BASE_URL,
    headers: { 'Authorization': `Bearer ${API_KEY}` }
});

app.get('/api/cards', async (req, res) => {
    try {
        if(!API_KEY) throw new Error("API Key Missing");
        console.log("📥 Mengambil data kartu...");
        const response = await apiRequest.get('/cards');
        res.json(response.data);
    } catch (error) {
        console.error("❌ Gagal ambil kartu:", error.message);
        // Kirim null agar frontend pakai Mock Data
        res.status(500).json({ items: null }); 
    }
});

// --- API: PLAYER SPY ---
app.get('/api/player/:tag', async (req, res) => {
    try {
        const tag = req.params.tag.replace('#', '');
        const response = await apiRequest.get(`/players/%23${tag}`);
        res.json(response.data);
    } catch (error) {
        res.status(404).json({ error: "Pemain tidak ditemukan" });
    }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => {
      console.log('Server is running on port 3000');
  });
}

module.exports = app;