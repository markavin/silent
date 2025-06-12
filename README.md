
### Silent Frontend

Proyek ini adalah bagian frontend dari aplikasi Silent, dibangun menggunakan alat pengembangan web modern. Proyek ini memanfaatkan teknologi seperti Vite, TailwindCSS, dan PostCSS untuk pengembangan yang cepat, bersama dengan ESLint untuk menjaga kualitas dan konsistensi kode.

## Struktur Proyek

Folder proyek ini memiliki struktur sebagai berikut:
silent-frontend/
└── FRONTEND FILES
    └── frontend/                   ← React application root
        ├── src/
        │   ├── components/
        │   │   ├── CameraCapture.jsx     ← Kamera real-time
        │   │   ├── ImageUpload.jsx       ← Upload gambar
        │   │   ├── Header.jsx            ← Navigasi atas
        │   │   ├── Footer.jsx            ← Footer aplikasi
        │   │   ├── LanguageSelector.jsx  ← Pilih bahasa
        │   │   ├── PredictionResult.jsx  ← Tampilkan hasil prediksi
        │   │   ├── ModelInfo.jsx         ← Info model ML
        │   │   ├── DebugPanel.jsx        ← Debugging tools (opsional)
        │   │   └── YoutubeEmbed.jsx      ← Embed video YouTube
        │   ├── services/
        │   │   └── apiService.js         ← Komunikasi API ke backend
        │   ├── utils/
        │   │   └── cameraUtils.js        ← Utilitas kamera
        │   ├── assets/                   ← Gambar, ikon, dll
        │   ├── App.jsx                   ← Komponen utama aplikasi
        │   ├── main.jsx                  ← Entry point React
        │   └── index.css                 ← Styling utama
        ├── index.html                    ← Template HTML
        ├── package.json                  ← Dependensi Node.js
        ├── package-lock.json             ← Lockfile dependensi
        ├── tailwind.config.js            ← Konfigurasi Tailwind CSS
        ├── postcss.config.js             ← Konfigurasi PostCSS
        ├── vite.config.js                ← Konfigurasi Vite
        ├── server.js                     ← Server dev frontend
        ├── vercel.json                   ← Konfigurasi deployment Vercel
        ├── .eslintrc.cjs                 ← Konfigurasi ESLint
        └── .gitignore                    ← Daftar file yang diabaikan Git

        
## Instalasi

Ikuti langkah-langkah berikut untuk mengatur proyek secara lokal.

## Prasyarat

- Node.js (v16 atau lebih baru)
- npm (v7 atau lebih baru)

## Langkah-langkah

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

4. Buka browser Anda dan kunjungi `http://localhost:3000` untuk melihat aplikasi.

## Konfigurasi

- **Vite** digunakan untuk membundel dan melayani aplikasi. File konfigurasi `vite.config.js` memungkinkan kustomisasi pengaturan build, plugin, dan lainnya.
- **TailwindCSS** dikonfigurasi menggunakan `tailwind.config.js` untuk pendekatan CSS berbasis utilitas.
- **PostCSS** disiapkan dengan `postcss.config.js` untuk memproses CSS, memungkinkan fitur modern.
- **ESLint** dikonfigurasi melalui `.eslintrc.cjs` untuk menjaga praktik pengkodean yang konsisten.

## Deployment

Untuk melakukan deployment proyek menggunakan Vercel, proyek ini sudah menyertakan file konfigurasi `vercel.json` yang diperlukan. Cukup dorong proyek Anda ke repositori Git, hubungkan ke Vercel, dan lakukan deployment.

## Kontribusi

1. Fork repositori.
2. Buat cabang fitur Anda (`git checkout -b feature/fitur-anda`).
3. Commit perubahan Anda (`git commit -am 'Tambah fitur baru'`).
4. Dorong cabang ke repositori (`git push origin feature/fitur-anda`).
5. Buka pull request.


