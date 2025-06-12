
#Silent Frontend

Proyek ini adalah bagian frontend dari aplikasi Silent, dibangun menggunakan alat pengembangan web modern. Proyek ini memanfaatkan teknologi seperti Vite, TailwindCSS, dan PostCSS untuk pengembangan yang cepat, bersama dengan ESLint untuk menjaga kualitas dan konsistensi kode.

## Struktur Proyek

Folder proyek ini memiliki struktur sebagai berikut:
silent-frontend-main/
└── 🌐 FRONTEND FILES
    └── frontend/                ← React application
        ├── src/
        │   ├── components/
        │   │   ├── CameraCapture.jsx    ← Camera interface
        │   │   ├── ImageUpload.jsx      ← Image upload
        │   │   ├── Header.jsx           ← Navigation
        │   │   ├── Footer.jsx           ← Footer
        │   │   ├── LanguageSelector.jsx ← Language picker
        │   │   ├── PredictionResult.jsx ← Results display
        │   │   └── ModelInfo.jsx        ← Model information
        │   │   └── DebugPanel.jsx
        │   │   └── YoutubeEmbed.jsx
        │   ├── services/
        │   │   └── apiService.js        ← API communication
        │   │
        │   ├── utils/
        │   │   └── cameraUtils.js       ← Camera utilities
        │   │
        │   ├── assets/                  ← Images, icons
        │   ├── App.jsx                  ← Main app component
        │   ├── main.jsx                 ← React entry point
        │   └── index.css                ← Styles
        │
        ├── index.html               ← HTML template
        ├── package.json             ← Node.js dependencies
        ├── tailwind.config.js       ← CSS framework config
        ├── vite.config.js           ← Build tool config
        ├── server.js                ← Frontend dev server
        ├── .eslintrc.cjs
        ├── package-lock.json
        ├── postcss.config.js
        ├── vercel.json
        └── .gitignore
        
## Instalasi

Ikuti langkah-langkah berikut untuk mengatur proyek secara lokal.

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


