# Silent Frontend

Proyek ini adalah bagian frontend dari aplikasi **SILENT**, dibangun menggunakan alat pengembangan web modern. Proyek ini memanfaatkan teknologi seperti **Vite**, **TailwindCSS**, dan **PostCSS** untuk pengembangan yang cepat, serta **ESLint** untuk menjaga kualitas dan konsistensi kode.

## Struktur Proyek

Berikut adalah struktur folder proyek dalam format pohon direktori:

```bash
silent-frontend/
└── FRONTEND FILES
    └── frontend/                     ← Root aplikasi React
        ├── src/
        │   ├── components/           ← Komponen UI
        │   │   ├── CameraCapture.jsx       ← Antarmuka kamera
        │   │   ├── ImageUpload.jsx         ← Unggah gambar
        │   │   ├── Header.jsx              ← Navigasi atas
        │   │   ├── Footer.jsx              ← Bagian bawah aplikasi
        │   │   ├── LanguageSelector.jsx    ← Pemilih bahasa
        │   │   ├── PredictionResult.jsx    ← Tampilan hasil prediksi
        │   │   ├── ModelInfo.jsx           ← Informasi model ML
        │   │   ├── DebugPanel.jsx          ← Panel debugging (opsional)
        │   │   └── YoutubeEmbed.jsx        ← Menyematkan video YouTube
        │   ├── services/
        │   │   └── apiService.js           ← Komunikasi dengan API backend
        │   ├── utils/
        │   │   └── cameraUtils.js          ← Utilitas untuk kamera
        │   ├── assets/                     ← Gambar dan ikon
        │   ├── App.jsx                     ← Komponen utama React
        │   ├── main.jsx                    ← Titik masuk React
        │   └── index.css                   ← Gaya utama
        ├── index.html                      ← Template HTML
        ├── package.json                    ← Dependensi Node.js
        ├── package-lock.json               ← Lockfile dependensi
        ├── tailwind.config.js              ← Konfigurasi Tailwind CSS
        ├── postcss.config.js               ← Konfigurasi PostCSS
        ├── vite.config.js                  ← Konfigurasi Vite
        ├── server.js                       ← Server pengembangan frontend
        ├── vercel.json                     ← Konfigurasi untuk deployment Vercel
        ├── .eslintrc.cjs                   ← Konfigurasi ESLint
        └── .gitignore                      ← File yang diabaikan Git
```
## Tech overview
* Bahasa:
    - JavaScript (ES6+)
    - HTML5
    - CSS3

* Framework & Library:
    - React.js 18.2.0
    - React DOM 18.2.0
    - React Router DOM 6.20.1
    - Vite 6.3.5
    - @vitejs/plugin-react 4.1.1
    - Tailwind CSS 3.3.5
    - PostCSS 8.4.31
    - Autoprefixer 10.4.16
    - @mediapipe/hands 0.4.1675469240
    - @tensorflow/tfjs 4.22.0
    - Axios 1.6.2
    - Lucide React 0.294.0
    - FontAwesome
    - ESLint 8.53.0

## Instalasi

Ikuti langkah-langkah berikut untuk mengatur proyek secara lokal:

### Prasyarat

- Node.js (v16 atau lebih baru)
- npm (v7 atau lebih baru)

### Langkah-langkah

1. Clone repositori:
   ```bash
   git clone https://github.com/your-username/silent-frontend.git
   cd silent-frontend-main/frontend
   ```

2. Instal dependensi:
   ```bash
   npm install
   ```

3. Jalankan server pengembangan:
   ```bash
   npm run dev
   ```

4. Buka browser dan kunjungi `http://localhost:3000` untuk melihat aplikasi.

## Konfigurasi

- **Vite** digunakan untuk membundel dan melayani aplikasi. File konfigurasi: `vite.config.js`
- **TailwindCSS** dikonfigurasi melalui `tailwind.config.js` untuk pendekatan styling berbasis utilitas.
- **PostCSS** disiapkan di `postcss.config.js` untuk memproses CSS modern.
- **ESLint** diatur melalui `.eslintrc.cjs` untuk menjaga gaya penulisan kode.

## Deployment

Proyek ini telah menyertakan file konfigurasi `vercel.json` untuk deployment di Vercel. Cukup push repositori ke GitHub, hubungkan ke Vercel, dan lakukan deployment.
LINK : https://silent-sign.vercel.app/

## Kontribusi

1. Fork repositori ini.
2. Buat branch baru untuk fitur (`git checkout -b fitur/namafitur`).
3. Commit perubahan (`git commit -am 'Tambah fitur x'`).
4. Push ke repositori Anda (`git push origin fitur/namafitur`).
5. Buka pull request ke repositori utama.
