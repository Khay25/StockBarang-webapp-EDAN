import imageCompression from 'browser-image-compression';
import { supabase } from './supabaseClient'; // sesuaikan path client kamu

const handleFileUpload = async (event) => {
  const imageFile = event.target.files[0];
  if (!imageFile) return;

  // 1. Opsi Pengaturan Kompresi
  const options = {
    maxSizeMB: 0.2,          // Ukuran maksimal file hasil kompresi (0.2 MB = 200 KB)
    maxWidthOrHeight: 1200,  // Dimensi maksimal gambar (piksel)
    useWebWorker: true,      // Proses kompresi di background biar web tidak lag
  };

  try {
    console.log(`Ukuran awal: ${imageFile.size / 1024 / 1024} MB`);

    // 2. Kompres Foto Otomatis
    const compressedFile = await imageCompression(imageFile, options);
    console.log(`Ukuran setelah dikompres: ${compressedFile.size / 1024 / 1024} MB`);

    // 3. Upload File yang Sudah Dikompres ke Supabase Storage
    const fileName = `barang-${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from('foto-barang') // Nama Bucket di Supabase Storage kamu
      .upload(fileName, compressedFile);

    if (error) {
      alert('Gagal upload gambar: ' + error.message);
    } else {
      alert('Gambar berhasil dikompres dan di-upload!');
      console.log('Path gambar:', data.path);
    }

  } catch (error) {
    console.error('Error saat mengompres gambar:', error);
  }
};