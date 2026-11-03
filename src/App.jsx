import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import imageCompression from 'browser-image-compression';
import logoEdan from './logoedan.png';
import Login from './login';

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname === '/keluar' ? 'keluar' : 'masuk';

  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // State info ukuran foto
  const [fileSizeInfo, setFileSizeInfo] = useState({ original: '', compressed: '' });

  // State Modal standar
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null
  });

  // State khusus Modal Pengembalian (dengan input tanggal)
  const [returnModal, setReturnModal] = useState({
    isOpen: false,
    log: null,
    returnDate: new Date().toISOString().split('T')[0]
  });

  const [formData, setFormData] = useState({
    asal: '',
    sn: '',
    nama: '',
    qty: '',
    tanggal: new Date().toISOString().split('T')[0],
    ket: '',
    status_keluar: 'Keluar Permanen',
    foto_url: ''
  });

  const monthsList = [
    { value: 'all', label: 'Semua Bulan' },
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  const getRoleByUser = (user) => {
    if (!user) return null;
    if (user.user_metadata?.role) return user.user_metadata.role;

    const email = (user.email || '').toLowerCase();
    if (email.includes('user1') || email.includes('masuk')) return 'masuk';
    if (email.includes('user2') || email.includes('keluar')) return 'keluar';
    return 'admin';
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setUserRole(getRoleByUser(session.user));
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setUserRole(getRoleByUser(session.user));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && userRole) {
      if (userRole === 'masuk' && location.pathname !== '/masuk') {
        navigate('/masuk', { replace: true });
      } else if (userRole === 'keluar' && location.pathname !== '/keluar') {
        navigate('/keluar', { replace: true });
      }

      document.title = activeTab === 'masuk' 
        ? 'Halaman Barang Masuk - EDAN' 
        : 'Halaman Barang Keluar - EDAN';

      fetchLogs();
      fetchAllLogsForStock();
    }
  }, [activeTab, session, userRole, location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const showAlert = (title, message, type = 'info') => {
    setModal({ isOpen: true, title, message, type, onConfirm: null });
  };

  const showConfirm = (title, message, onConfirm) => {
    setModal({ isOpen: true, title, message, type: 'danger', onConfirm });
  };

  const closeModal = () => {
    setModal({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null });
  };

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('stok_barang')
      .select('*')
      .eq('tipe', activeTab === 'masuk' ? 'Barang Masuk' : 'Barang Keluar')
      .order('tanggal', { ascending: true });

    if (!error) setLogs(data || []);
    setLoading(false);
  };

  const fetchAllLogsForStock = async () => {
    const { data } = await supabase.from('stok_barang').select('*');
    if (data) setAllLogs(data);
  };

  const getSisaStokByNama = (namaBarang) => {
    if (!namaBarang) return 0;
    const cleanNama = namaBarang.trim().toLowerCase();

    const totalMasuk = allLogs
      .filter(item => item.tipe === 'Barang Masuk' && item.nama?.trim().toLowerCase() === cleanNama)
      .reduce((acc, curr) => acc + (parseInt(curr.qty) || 0), 0);

    const totalKeluar = allLogs
      .filter(item => item.tipe === 'Barang Keluar' && item.nama?.trim().toLowerCase() === cleanNama)
      .reduce((acc, curr) => acc + (parseInt(curr.qty) || 0), 0);

    return totalMasuk - totalKeluar;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    const origMB = (file.size / 1024 / 1024).toFixed(2);
    const origKB = (file.size / 1024).toFixed(0);
    const originalSizeText = file.size >= 1024 * 1024 ? `${origMB} MB` : `${origKB} KB`;

    setFileSizeInfo({ original: originalSizeText, compressed: '' });

    const options = {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);

      const compMB = (compressedFile.size / 1024 / 1024).toFixed(2);
      const compKB = (compressedFile.size / 1024).toFixed(0);
      const compressedSizeText = compressedFile.size >= 1024 * 1024 ? `${compMB} MB` : `${compKB} KB`;

      setFileSizeInfo({ original: originalSizeText, compressed: compressedSizeText });
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('foto_barang')
        .upload(filePath, compressedFile);

      if (uploadError) {
        showAlert('Gagal Upload', 'Gagal upload foto: ' + uploadError.message, 'danger');
      } else {
        const { data } = supabase.storage
          .from('foto_barang')
          .getPublicUrl(filePath);
        
        setFormData(prev => ({ ...prev, foto_url: data.publicUrl }));
      }
    } catch (error) {
      showAlert('Gagal Kompres', 'Error saat mengompres foto: ' + error.message, 'danger');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama || !formData.qty) {
      showAlert('Peringatan', 'Nama barang dan Quantity wajib diisi!', 'danger');
      return;
    }

    const inputQty = parseInt(formData.qty);

    if (activeTab === 'keluar') {
      const sisaStokSaatIni = getSisaStokByNama(formData.nama);
      if (inputQty > sisaStokSaatIni) {
        showAlert(
          'Stok Tidak Cukup', 
          `Gagal mengeluarkan barang! Sisa stok real "${formData.nama}" saat ini hanya: ${sisaStokSaatIni} unit`, 
          'danger'
        );
        return;
      }
    }

    const fullKet = activeTab === 'keluar' && formData.status_keluar === 'Pinjam'
      ? `[DIPINJAM] ${formData.ket}`
      : formData.ket;

    const payload = {
      tipe: activeTab === 'masuk' ? 'Barang Masuk' : 'Barang Keluar',
      asal: formData.asal,
      sn: formData.sn,
      nama: formData.nama,
      qty: inputQty,
      tanggal: formData.tanggal,
      ket: fullKet,
      foto_url: formData.foto_url
    };

    const { error } = await supabase.from('stok_barang').insert([payload]);

    if (error) {
      showAlert('Gagal Simpan', 'Gagal menyimpan data: ' + error.message, 'danger');
    } else {
      showAlert('Berhasil!', `Data ${activeTab === 'masuk' ? 'Barang Masuk' : 'Barang Keluar'} sukses tersimpan.`, 'info');
      setFormData({
        asal: '',
        sn: '',
        nama: '',
        qty: '',
        tanggal: new Date().toISOString().split('T')[0],
        ket: '',
        status_keluar: 'Keluar Permanen',
        foto_url: ''
      });
      setFileSizeInfo({ original: '', compressed: '' });
      fetchLogs();
      fetchAllLogsForStock();
    }
  };

  // 1. MEMBUKA MODAL PENGEMBALIAN BARANG
  const openReturnModal = (log) => {
    setReturnModal({
      isOpen: true,
      log: log,
      returnDate: new Date().toISOString().split('T')[0]
    });
  };

  // 2. PROSES PENGEMBALIAN BARANG DENGAN TANGGAL & KETERANGAN LEBIH JELAS
  const handleConfirmReturn = async () => {
    const { log, returnDate } = returnModal;
    if (!log) return;

    const payload = {
      tipe: 'Barang Masuk',
      asal: `Pengembalian Pinjaman (${log.asal || 'Tanpa SJ'})`,
      sn: log.sn,
      nama: log.nama,
      qty: parseInt(log.qty),
      tanggal: returnDate,
      ket: `[DIKEMBALIKAN] Pinjaman tgl ${log.tanggal}`,
      foto_url: log.foto_url
    };

    const { error } = await supabase.from('stok_barang').insert([payload]);

    if (error) {
      showAlert('Gagal', 'Gagal memproses pengembalian: ' + error.message, 'danger');
    } else {
      showAlert('Berhasil!', `Stok "${log.nama}" (${log.qty} unit) berhasil dikembalikan pada tanggal ${returnDate}.`, 'info');
      fetchLogs();
      fetchAllLogsForStock();
    }

    setReturnModal({ isOpen: false, log: null, returnDate: new Date().toISOString().split('T')[0] });
  };

  // CETAK BUKTI PDF
  const handlePrintPDF = (log) => {
    const printWindow = window.open('', '_blank');
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bukti Transaksi EDAN #${log.id}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #059669; padding-bottom: 20px; }
          .title { font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 12px; text-transform: uppercase; background: ${log.tipe === 'Barang Masuk' ? '#d1fae5' : '#ffe4e6'}; color: ${log.tipe === 'Barang Masuk' ? '#047857' : '#be123c'}; }
          .details-table { width: 100%; border-collapse: collapse; margin-top: 30px; }
          .details-table th, .details-table td { padding: 12px 16px; border: 1px solid #cbd5e1; text-align: left; font-size: 14px; }
          .details-table th { background-color: #f8fafc; font-weight: 600; width: 30%; }
          .signature-container { margin-top: 70px; display: flex; justify-content: space-between; padding: 0 40px; }
          .signature-box { text-align: center; width: 220px; }
          .signature-line { margin-top: 80px; border-bottom: 1.5px solid #475569; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">STOCK BARANG <span style="color:#059669">EDAN</span></div>
            <div class="subtitle">Dokumen Resmi Bukti Transaksi Gudang</div>
          </div>
          <div>
            <span class="badge">${log.tipe}</span>
          </div>
        </div>

        <table class="details-table">
          <tr><th>ID Transaksi</th><td>#${log.id}</td></tr>
          <tr><th>Tanggal Transaksi</th><td>${log.tanggal}</td></tr>
          <tr><th>Surat Jalan / Asal</th><td>${log.asal || '-'}</td></tr>
          <tr><th>Serial Number (SN)</th><td>${log.sn || '-'}</td></tr>
          <tr><th>Nama Barang</th><td><strong>${log.nama}</strong></td></tr>
          <tr><th>Jumlah (QTY)</th><td><strong>${log.qty} Unit</strong></td></tr>
          <tr><th>Keterangan</th><td>${log.ket || '-'}</td></tr>
        </table>

        <div class="signature-container">
          <div class="signature-box">
            <p style="font-weight:600; font-size:13px;">Petugas Gudang</p>
            <div class="signature-line"></div>
          </div>
          <div class="signature-box">
            <p style="font-weight:600; font-size:13px;">Penerima / Penanggung Jawab</p>
            <div class="signature-line"></div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  const handleDelete = (id) => {
    showConfirm('Konfirmasi Hapus', 'Apakah kamu yakin ingin menghapus data ini?', async () => {
      const { error } = await supabase.from('stok_barang').delete().eq('id', id);
      if (!error) {
        fetchLogs();
        fetchAllLogsForStock();
      }
      closeModal();
    });
  };

  const handleResetDateRange = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      showAlert('Export Gagal', 'Tidak ada data untuk di-export!', 'danger');
      return;
    }

    const excelData = filteredLogs.map((log, index) => ({
      'No': index + 1,
      'Tipe Transaksi': log.tipe,
      'Surat Jalan / Asal': log.asal || '-',
      'Serial Number (SN)': log.sn || '-',
      'Nama Barang': log.nama || '-',
      [activeTab === 'masuk' ? 'QTY Masuk' : 'QTY Keluar']: log.qty || 0,
      'Tanggal Transaksi': log.tanggal || '-',
      'Keterangan': log.ket || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === 'masuk' ? 'Barang Masuk' : 'Barang Keluar');

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 30 },
      { wch: 15 },
      { wch: 18 },
      { wch: 35 }
    ];

    const fileName = `Laporan_${activeTab === 'masuk' ? 'Barang_Masuk' : 'Barang_Keluar'}_EDAN_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Memeriksa sesi login...
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={(sess) => setSession(sess)} />;
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.nama?.toLowerCase().includes(search.toLowerCase()) ||
      log.sn?.toLowerCase().includes(search.toLowerCase()) ||
      log.asal?.toLowerCase().includes(search.toLowerCase()) ||
      log.ket?.toLowerCase().includes(search.toLowerCase());

    const logMonth = log.tanggal ? log.tanggal.split('-')[1] : '';
    const matchesMonth = selectedMonth === 'all' || logMonth === selectedMonth;

    let matchesDateRange = true;
    if (startDate && endDate) {
      matchesDateRange = log.tanggal >= startDate && log.tanggal <= endDate;
    } else if (startDate) {
      matchesDateRange = log.tanggal >= startDate;
    } else if (endDate) {
      matchesDateRange = log.tanggal <= endDate;
    }

    return matchesSearch && matchesMonth && matchesDateRange;
  });

  const sortedMonths = monthsList.filter(m => m.value !== 'all');
  const groupedLogs = sortedMonths.reduce((acc, monthObj) => {
    const itemsInMonth = filteredLogs
      .filter(log => log.tanggal && log.tanggal.split('-')[1] === monthObj.value)
      .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    if (itemsInMonth.length > 0) {
      acc[monthObj.label] = itemsInMonth;
    }
    return acc;
  }, {});

  const searchedItemName = search.trim();
  const currentSearchedStock = searchedItemName ? getSisaStokByNama(searchedItemName) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans relative">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <img 
              src={logoEdan} 
              alt="Logo EDAN" 
              className="w-10 h-10 object-contain rounded-xl"
            />
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                Stock Barang <span className="text-emerald-400">EDAN</span>
              </h1>
              <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-2">
                Mode: 
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'masuk' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {activeTab === 'masuk' ? 'Barang Masuk' : 'Barang Keluar'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {userRole === 'admin' && (
              <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => navigate('/masuk')}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
                    activeTab === 'masuk'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Barang Masuk
                </button>
                <button
                  onClick={() => navigate('/keluar')}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
                    activeTab === 'keluar'
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  Barang Keluar
                </button>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="px-4 py-2 text-xs font-semibold rounded-2xl bg-slate-900 hover:bg-rose-600/20 text-rose-400 border border-slate-800 hover:border-rose-500/30 transition-all"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
          <h2 className="text-xl font-semibold mb-6 text-slate-200 flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${activeTab === 'masuk' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            Input khusus {activeTab === 'masuk' ? 'Barang Masuk' : 'Barang Keluar'}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Surat Jalan / Asal
              </label>
              <input
                type="text"
                value={formData.asal}
                onChange={e => setFormData({ ...formData, asal: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                placeholder="Contoh: SJ-001 / Vendor A"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Serial Number (SN)
              </label>
              <input
                type="text"
                value={formData.sn}
                onChange={e => setFormData({ ...formData, sn: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                placeholder="SN12345678"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Nama Barang
              </label>
              <input
                type="text"
                value={formData.nama}
                onChange={e => setFormData({ ...formData, nama: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                placeholder="Masukkan nama barang"
              />
            </div>

            {activeTab === 'keluar' && (
              <div>
                <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                  Status Transaksi Keluar
                </label>
                <select
                  value={formData.status_keluar}
                  onChange={e => setFormData({ ...formData, status_keluar: e.target.value })}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-4 py-2.5 text-amber-300 focus:outline-none focus:border-amber-500 transition-all text-sm font-semibold"
                >
                  <option value="Keluar Permanen">🔴 Keluar Permanen (Dijual/Pakai)</option>
                  <option value="Pinjam">🟡 Pinjam (Sementara)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {activeTab === 'masuk' ? 'Quantity Masuk' : 'Quantity Keluar / Pinjam'}
              </label>
              <input
                type="number"
                value={formData.qty}
                onChange={e => setFormData({ ...formData, qty: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Tanggal
              </label>
              <input
                type="date"
                value={formData.tanggal}
                onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Foto Barang (Auto Kompres)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
              
              {uploading && <p className="text-xs text-indigo-400 mt-1">Mengompres & Uploading foto...</p>}
              
              {fileSizeInfo.original && !uploading && (
                <div className="mt-2 text-xs flex items-center gap-2 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400">
                    Awal: <strong className="text-rose-400">{fileSizeInfo.original}</strong>
                  </span>
                  {fileSizeInfo.compressed && (
                    <>
                      <span className="text-slate-600">➔</span>
                      <span className="text-slate-400">
                        Hasil: <strong className="text-emerald-400">{fileSizeInfo.compressed}</strong>
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Keterangan
              </label>
              <input
                type="text"
                value={formData.ket}
                onChange={e => setFormData({ ...formData, ket: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                placeholder={activeTab === 'keluar' && formData.status_keluar === 'Pinjam' ? 'Peminjam, tujuan, estimasi balik, dll' : 'Catatan atau keterangan tambahan'}
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3 mt-2">
              <button
                type="submit"
                className={`w-full py-3 px-6 rounded-xl font-medium text-white shadow-lg transition-all ${
                  activeTab === 'masuk'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
                    : formData.status_keluar === 'Pinjam'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/50'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                }`}
              >
                Simpan {activeTab === 'masuk' ? 'Barang Masuk' : formData.status_keluar === 'Pinjam' ? 'Pinjaman Barang' : 'Barang Keluar'}
              </button>
            </div>
          </form>
        </div>

        {/* Tabel Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-200">
              Riwayat {activeTab === 'masuk' ? 'Barang Masuk' : 'Barang Keluar & Pinjaman'}
            </h2>
            
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Excel
              </button>

              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 gap-2 text-xs">
                <span className="text-slate-400 font-medium">Dari:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none text-xs"
                />
                <span className="text-slate-400 font-medium">S/D:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none text-xs"
                />
                {(startDate || endDate) && (
                  <button
                    onClick={handleResetDateRange}
                    className="text-rose-400 hover:text-rose-300 font-bold ml-1 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {monthsList.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Cari Nama / SN / SJ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full sm:w-52"
              />
            </div>
          </div>

          {searchedItemName && (
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Info Total Stok Real-Time</p>
                <h4 className="text-lg font-bold text-white mt-0.5">Barang: "{searchedItemName}"</h4>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-400">{currentSearchedStock}</span>
                <span className="text-xs text-slate-400 block">Unit Tersedia di Gudang</span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-xs border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Tipe</th>
                  <th className="py-3.5 px-4">Asal / SJ</th>
                  <th className="py-3.5 px-4">SN</th>
                  <th className="py-3.5 px-4">Nama Barang</th>
                  <th className="py-3.5 px-4 text-emerald-400">{activeTab === 'masuk' ? 'QTY Masuk' : 'QTY Keluar'}</th>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Keterangan</th>
                  <th className="py-3.5 px-4">Foto</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-8 text-slate-500">Memuat data...</td>
                  </tr>
                ) : Object.keys(groupedLogs).length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-8 text-slate-500">Belum ada riwayat data</td>
                  </tr>
                ) : (
                  Object.entries(groupedLogs).map(([monthName, items]) => (
                    <React.Fragment key={monthName}>
                      <tr className="bg-slate-950/80">
                        <td colSpan="9" className="py-2.5 px-4 font-bold text-xs uppercase tracking-wider text-emerald-400 border-y border-slate-800/80">
                          📅 Bulan: {monthName} ({items.length} Transaksi)
                        </td>
                      </tr>

                      {items.map(log => {
                        const isPinjam = log.ket?.includes('[DIPINJAM]');

                        return (
                          <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              {log.tipe === 'Barang Masuk' ? (
                                /* BADGE TAMPILAN BARANG MASUK DIPERBAIKI SAMA KAYA MODE HEADER */
                                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Barang Masuk
                                </span>
                              ) : isPinjam ? (
                                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  🟡 Pinjam
                                </span>
                              ) : (
                                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                  🔴 Barang Keluar
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">{log.asal || '-'}</td>
                            <td className="py-3 px-4 font-mono text-slate-400">{log.sn || '-'}</td>
                            <td className="py-3 px-4 font-semibold text-white">{log.nama || '-'}</td>
                            <td className="py-3 px-4 font-bold text-emerald-400">{log.qty || 0} Unit</td>
                            <td className="py-3 px-4 text-slate-400">{log.tanggal}</td>
                            <td className="py-3 px-4 text-slate-400">{log.ket || '-'}</td>
                            <td className="py-3 px-4">
                              {log.foto_url ? (
                                <a href={log.foto_url} target="_blank" rel="noreferrer">
                                  <img src={log.foto_url} alt="Foto" className="w-10 h-10 object-cover rounded-lg border border-slate-700 hover:scale-110 transition-transform" />
                                </a>
                              ) : (
                                <span className="text-xs text-slate-600">Tidak ada</span>
                              )}
                            </td>
                            
                            <td className="py-3 px-4 text-center flex items-center justify-center gap-1.5">
                              {isPinjam && (
                                <button
                                  onClick={() => openReturnModal(log)}
                                  className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white rounded-lg text-xs font-medium border border-amber-500/20 transition-all"
                                  title="Kembalikan Stok Barang Pinjaman"
                                >
                                  ↩ Balik
                                </button>
                              )}

                              <button
                                onClick={() => handlePrintPDF(log)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-all"
                                title="Cetak Bukti PDF"
                              >
                                🖨️ PDF
                              </button>

                              <button
                                onClick={() => handleDelete(log.id)}
                                className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg text-xs font-medium border border-rose-500/20 transition-all"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL KHUSUS PENGEMBALIAN BARANG PINJAMAN (DENGAN INPUT TANGGAL) */}
      {returnModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-all">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Pengembalian Barang Pinjaman</h3>
                <p className="text-xs text-slate-400">Konfirmasi barang masuk kembali ke gudang</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
              <p><strong className="text-slate-400">Nama Barang:</strong> <span className="text-white font-bold">{returnModal.log?.nama}</span></p>
              <p><strong className="text-slate-400">Jumlah Dipinjam:</strong> <span className="text-emerald-400 font-bold">{returnModal.log?.qty} Unit</span></p>
              <p><strong className="text-slate-400">Tanggal Pinjam:</strong> <span className="text-amber-300 font-bold">{returnModal.log?.tanggal}</span></p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Pilih Tanggal Dikembalikan:
              </label>
              <input
                type="date"
                value={returnModal.returnDate}
                onChange={(e) => setReturnModal({ ...returnModal, returnDate: e.target.value })}
                className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setReturnModal({ isOpen: false, log: null, returnDate: new Date().toISOString().split('T')[0] })}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReturn}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-amber-950/50 transition-all"
              >
                Proses Dikembalikan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup Standard */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-all">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${modal.type === 'danger' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                {modal.type === 'danger' ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                  </svg>
                )}
              </div>
              <h3 className="text-lg font-bold text-white">{modal.title}</h3>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">{modal.message}</p>

            <div className="flex gap-3 justify-end pt-2">
              {modal.onConfirm ? (
                <>
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={modal.onConfirm}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/50 transition-all"
                  >
                    Ya, Lanjutkan
                  </button>
                </>
              ) : (
                <button
                  onClick={closeModal}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/50 transition-all"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}