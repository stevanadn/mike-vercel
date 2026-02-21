const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// Fungsi untuk membuka koneksi database
async function openDb() {
  return open({
    filename: './users.db', // Nanti file ini muncul otomatis
    driver: sqlite3.Database
  });
}

// Inisialisasi: Buat tabel user jika belum ada
async function initDb() {
  const db = await openDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )
  `);
  console.log("📂 Database User Siap (users.db)");
}

initDb();

module.exports = openDb;