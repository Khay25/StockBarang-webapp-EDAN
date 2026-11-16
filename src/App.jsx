import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './login';
import StockMaqna from './StockMaqna';

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [onlyPinjam, setOnlyPinjam] = useState(false);

  const [fileSizeInfo, setFileSizeInfo] = useState({ original: '', compressed: '' });

  const [formData, setFormData] = useState({
    asal: '',
    sn: '',
    nama: '',
    qty: '',
    tanggal: new Date().toISOString().split('T')[0],
    ket: '',
    foto_url: '',
    status_keluar: 'Keluar Permanen',
  });

  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
  });

  const [returnModal, setReturnModal] = useState({
    isOpen: false,
    log: null,
    returnDate: new Date().toISOString().split('T')[0],
  });

  const [editModal, setEditModal] = useState({
    isOpen: false,
    id: null,
    tipe: '',
    asal: '',
    sn: '',
    nama: '',
    qty: '',
    tanggal: '',
    ket: '',
    foto_url: '',
  });

  const showAlert = (title, message, type = 'info') => {
    setModal({ isOpen: true, title, message, type, onConfirm: null });
  };

  const showConfirm = (title, message, onConfirmCallback) => {
    setModal({
      isOpen: true,
      title,
      message,
      type: 'danger',
      onConfirm: () => {
        setModal((prev) => ({ ...prev, isOpen: false }));
        onConfirmCallback();
      },
    });
  };

  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const monthsList = [
    { value: 'all', label: 'Semua Bulan' },
    { value: '0', label: 'Januari' },
    { value: '1', label: 'Februari' },
    { value: '2', label: 'Maret' },
    { value: '3', label: 'April' },
    { value: '4', label: 'Mei' },
    { value: '5', label: 'Juni' },
    { value: '6', label: 'Juli' },
    { value: '7', label: 'Agustus' },
    { value: '8', label: 'September' },
    { value: '9', label: 'Oktober' },
    { value: '10', label: 'November' },
    { value: '11', label: 'Desember' },
  ];

  // --- DETEKSI ROLE USER ---
  const getRoleByUser = (user) => {
    if (!user) return null;
    if (user.user_metadata?.role) return user.user_metadata.role;

    const email = (user.email || '').toLowerCase();
    if (email.includes('user1') || email.includes('masuk')) return 'masuk';
    if (email.includes('user2') || email.includes('keluar')) return 'keluar';
    if (email.includes('view')) return 'viewer';
    return 'admin';
  };

  // --- FUNGSI MENCATAT AUDIT LOG ---
  const recordAudit = async (actionType, detailText) => {
    try {
      const userEmail = session?.user?.email || 'Admin / Sistem';
      await supabase.from('audit_logs').insert([
        {
          user_email: userEmail,
          action: actionType,
          detail: detailText,
        },
      ]);
    } catch (err) {
      console.error('Gagal mencatat audit:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const userRole = getRoleByUser(session?.user);

  const activeTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('maqna')) return 'maqna';

    if (userRole === 'masuk') return 'masuk';
    if (userRole === 'keluar') return 'keluar';

    if (path.includes('keluar')) return 'keluar';
    if (path.includes('audit')) return 'audit';
    return 'masuk';
  }, [location.pathname, userRole]);

  useEffect(() => {
    if (!authLoading && session) {
      const path = location.pathname.toLowerCase();
      if (userRole === 'masuk' && path !== '/masuk' && path !== '/maqna') {
        navigate('/masuk', { replace: true });
      } else if (userRole === 'keluar' && path !== '/keluar' && path !== '/maqna') {
        navigate('/keluar', { replace: true });
      } else if (location.pathname === '/') {
        navigate(userRole === 'keluar' ? '/keluar' : '/masuk', { replace: true });
      }
    }
  }, [authLoading, session, userRole, location.pathname, navigate]);

  useEffect(() => {
    if (session) {
      fetchAllLogsForStock();
      if (activeTab === 'audit') {
        fetchAuditLogs();
      } else if (activeTab === 'masuk' || activeTab === 'keluar') {
        fetchLogs();
      }
      setSearch('');
      setSelectedMonth('all');
      setStartDate('');
      setEndDate('');
      setOnlyPinjam(false);
      setFileSizeInfo({ original: '', compressed: '' });
    }
  }, [activeTab, session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchAllLogsForStock = async () => {
    const { data, error } = await supabase
      .from('stok_barang')
      .select('*')
      .order('tanggal', { ascending: false });

    if (!error) {
      setAllLogs(data || []);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    const tipeFilter = activeTab === 'masuk' ? 'Barang Masuk' : 'Barang Keluar';

    const { data, error } = await supabase
      .from('stok_barang')
      .select('*')
      .eq('tipe', tipeFilter)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      showAlert('Gagal Mengambil Data', error.message, 'danger');
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Error fetch audit:', error);
    } else {
      setAuditLogs(data || []);
    }
    setLoading(false);
  };

  const compressImage = (file, maxWidth = 1000, quality = 0.7) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              resolve(blob);
            },
            'image/jpeg',
            quality
          );
        };
      };
    });
  };

  const handleFileUpload = async (e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    if (!isEdit) {
      setFileSizeInfo({ original: formatBytes(file.size), compressed: 'Mengompres...' });
    }

    try {
      const compressedBlob = await compressImage(file, 1000, 0.7);
      const fileName = `${Date.now()}.jpg`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('foto-barang')
        .upload(filePath, compressedBlob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        showAlert('Gagal Upload Foto', uploadError.message, 'danger');
        setUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('foto-barang')
        .getPublicUrl(filePath);

      if (isEdit) {
        setEditModal((prev) => ({ ...prev, foto_url: publicUrlData.publicUrl }));
      } else {
        setFileSizeInfo({
          original: formatBytes(file.size),
          compressed: formatBytes(compressedBlob.size),
        });
        setFormData((prev) => ({ ...prev, foto_url: publicUrlData.publicUrl }));
      }
    } catch (err) {
      showAlert('Terjadi Kesalahan', err.message, 'danger');
    }

    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole === 'viewer') return;

    if (!formData.nama || !formData.qty) {
      showAlert('Data Belum Lengkap', 'Nama Barang dan Quantity wajib diisi!', 'danger');
      return;
    }

    const inputQty = parseInt(formData.qty, 10) || 0;

    if (activeTab === 'keluar') {
      const targetName = formData.nama.trim().toLowerCase();

      const totalMasuk = allLogs
        .filter(
          (item) =>
            item.tipe === 'Barang Masuk' &&
            item.nama?.trim().toLowerCase() === targetName
        )
        .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

      const totalKeluar = allLogs
        .filter(
          (item) =>
            item.tipe === 'Barang Keluar' &&
            item.nama?.trim().toLowerCase() === targetName
        )
        .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

      const sisaStok = totalMasuk - totalKeluar;

      if (sisaStok <= 0) {
        showAlert(
          'Stok Tidak Tersedia!',
          `Barang "${formData.nama}" tidak ada di gudang atau stok saat ini 0 unit.`,
          'danger'
        );
        return;
      }

      if (inputQty > sisaStok) {
        showAlert(
          'Stok Tidak Mencukupi!',
          `Stok "${formData.nama}" yang tersedia di gudang hanya ${sisaStok} Unit. Tidak bisa mengeluarkan ${inputQty} Unit.`,
          'danger'
        );
        return;
      }
    }

    let finalKet = formData.ket;
    if (activeTab === 'keluar' && formData.status_keluar === 'Pinjam') {
      finalKet = `[DIPINJAM] ${formData.ket}`.trim();
    }

    const newEntry = {
      tipe: activeTab === 'masuk' ? 'Barang Masuk' : 'Barang Keluar',
      asal: formData.asal,
      sn: formData.sn,
      nama: formData.nama,
      qty: inputQty,
      tanggal: formData.tanggal,
      ket: finalKet,
      foto_url: formData.foto_url,
    };

    const { error } = await supabase.from('stok_barang').insert([newEntry]);

    if (error) {
      showAlert('Gagal Menyimpan', error.message, 'danger');
    } else {
      await recordAudit(
        'TAMBAH',
        `Menambah ${newEntry.tipe}: "${newEntry.nama}" sebanyak ${newEntry.qty} Unit (Asal/SJ: ${newEntry.asal || '-'})`
      );

      setFormData({
        asal: '',
        sn: '',
        nama: '',
        qty: '',
        tanggal: new Date().toISOString().split('T')[0],
        ket: '',
        foto_url: '',
        status_keluar: 'Keluar Permanen',
      });
      setFileSizeInfo({ original: '', compressed: '' });
      fetchLogs();
      fetchAllLogsForStock();
      showAlert(
        'Berhasil Disimpan',
        `Data "${newEntry.nama}" berhasil ditambahkan ke sistem.`,
        'success'
      );
    }
  };

  const openEditModal = (log) => {
    setEditModal({
      isOpen: true,
      id: log.id,
      tipe: log.tipe,
      asal: log.asal || '',
      sn: log.sn || '',
      nama: log.nama || '',
      qty: log.qty || 0,
      tanggal: log.tanggal || new Date().toISOString().split('T')[0],
      ket: log.ket || '',
      foto_url: log.foto_url || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editModal.nama || !editModal.qty) {
      showAlert('Gagal', 'Nama barang dan quantity wajib diisi!', 'danger');
      return;
    }

    const updatedData = {
      asal: editModal.asal,
      sn: editModal.sn,
      nama: editModal.nama,
      qty: parseInt(editModal.qty, 10) || 0,
      tanggal: editModal.tanggal,
      ket: editModal.ket,
      foto_url: editModal.foto_url,
    };

    const { error } = await supabase
      .from('stok_barang')
      .update(updatedData)
      .eq('id', editModal.id);

    if (error) {
      showAlert('Gagal Edit Data', error.message, 'danger');
    } else {
      await recordAudit(
        'EDIT',
        `Mengedit ${editModal.tipe} #${editModal.id}: "${updatedData.nama}" (${updatedData.qty} Unit)`
      );

      setEditModal({ ...editModal, isOpen: false });
      fetchLogs();
      fetchAllLogsForStock();
      showAlert('Berhasil Diedit', 'Data transaksi telah diperbarui!', 'success');
    }
  };

  const openReturnModal = (log) => {
    setReturnModal({
      isOpen: true,
      log: log,
      returnDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleConfirmReturn = async () => {
    const log = returnModal.log;
    const tglKembali = returnModal.returnDate;
    if (!log) return;

    const cleanKet = (log.ket || '').replace('[DIPINJAM]', '').trim();
    const updatedKet = `[DIKEMBALIKAN: ${tglKembali}] ${cleanKet}`.trim();

    const { error: updateError } = await supabase
      .from('stok_barang')
      .update({ ket: updatedKet })
      .eq('id', log.id);

    if (updateError) {
      showAlert('Gagal Update Status', updateError.message, 'danger');
      return;
    }

    const returnEntry = {
      tipe: 'Barang Masuk',
      asal: `Pengembalian Pinjaman (${log.asal || '-'})`,
      sn: log.sn,
      nama: log.nama,
      qty: parseInt(log.qty, 10) || 0,
      tanggal: tglKembali,
      ket: `Pengembalian barang dipinjam tgl ${log.tanggal}`,
      foto_url: log.foto_url || '',
    };

    const { error: insertError } = await supabase
      .from('stok_barang')
      .insert([returnEntry]);

    if (insertError) {
      showAlert('Gagal Catat Barang Masuk', insertError.message, 'danger');
    } else {
      await recordAudit(
        'KEMBALIKAN',
        `Barang Pinjaman Dikembalikan: "${log.nama}" sebanyak ${log.qty} Unit (Tgl Kembali: ${tglKembali})`
      );

      setReturnModal({
        isOpen: false,
        log: null,
        returnDate: new Date().toISOString().split('T')[0],
      });
      fetchLogs();
      fetchAllLogsForStock();
      showAlert(
        'Barang Dikembalikan!',
        `Stok "${log.nama}" sebanyak ${log.qty} unit telah kembali ke gudang pada tanggal ${tglKembali}.`,
        'success'
      );
    }
  };

  const handleDelete = (log) => {
    showConfirm(
      'Hapus Riwayat?',
      `Yakin ingin menghapus data "${log.nama}"? Data yang dihapus tidak bisa dikembalikan.`,
      async () => {
        const { error } = await supabase
          .from('stok_barang')
          .delete()
          .eq('id', log.id);

        if (error) {
          showAlert('Gagal Menghapus', error.message, 'danger');
        } else {
          await recordAudit(
            'HAPUS',
            `Menghapus ${log.tipe}: "${log.nama}" (${log.qty} Unit, SN: ${log.sn || '-'})`
          );

          fetchLogs();
          fetchAllLogsForStock();
          showAlert('Terhapus', 'Data transaksi berhasil dihapus.', 'success');
        }
      }
    );
  };

  const handlePrintPDF = (log) => {
    const printWindow = window.open('', '_blank');
    const isPinjam = log.ket?.includes('[DIPINJAM]');
    const badgeText =
      log.tipe === 'Barang Masuk'
        ? 'BUKTI BARANG MASUK'
        : isPinjam
        ? 'SURAT PEMINJAMAN BARANG'
        : 'BUKTI BARANG KELUAR';
    const badgeColor =
      log.tipe === 'Barang Masuk' ? '#059669' : isPinjam ? '#d97706' : '#e11d48';

    printWindow.document.write(`
      <html>
        <head>
          <title>${badgeText} - ${log.nama}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #0f172a; }
            .badge { background-color: ${badgeColor}; color: white; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 13px; letter-spacing: 1px; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .info-table td { padding: 12px; border: 1px solid #cbd5e1; font-size: 14px; }
            .info-label { font-weight: bold; background-color: #f8fafc; width: 30%; color: #475569; }
            .signatures { display: flex; justify-content: space-between; margin-top: 60px; text-align: center; }
            .sig-box { width: 200px; }
            .sig-line { border-bottom: 1px solid #1e293b; height: 70px; margin-bottom: 8px; }
            .footer { margin-top: 50px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">PT. EDAN INDONESIA</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Sistem Manajemen Inventaris & Gudang</div>
            </div>
            <div class="badge">${badgeText}</div>
          </div>

          <table class="info-table">
            <tr>
              <td class="info-label">Nomor Dokumen / ID</td>
              <td>#TRX-${log.id}</td>
            </tr>
            <tr>
              <td class="info-label">Tanggal Transaksi</td>
              <td>${log.tanggal}</td>
            </tr>
            <tr>
              <td class="info-label">Surat Jalan / Asal / Tujuan</td>
              <td>${log.asal || '-'}</td>
            </tr>
            <tr>
              <td class="info-label">Nama Barang</td>
              <td><strong>${log.nama}</strong></td>
            </tr>
            <tr>
              <td class="info-label">Serial Number (SN)</td>
              <td style="font-family: monospace;">${log.sn || '-'}</td>
            </tr>
            <tr>
              <td class="info-label">Jumlah (Quantity)</td>
              <td><strong>${log.qty} Unit</strong></td>
            </tr>
            <tr>
              <td class="info-label">Keterangan / Catatan</td>
              <td>${log.ket || '-'}</td>
            </tr>
          </table>

          <div class="signatures">
            <div class="sig-box">
              <div>Diserahkan Oleh,</div>
              <div class="sig-line"></div>
              <div>( Admin Gudang )</div>
            </div>
            <div class="sig-box">
              <div>Mengetahui,</div>
              <div class="sig-line"></div>
              <div>( Kepala Logistik )</div>
            </div>
            <div class="sig-box">
              <div>Diterima Oleh,</div>
              <div class="sig-line"></div>
              <div>( Penerima / Peminjam )</div>
            </div>
          </div>

          <div class="footer">
            Dokumen ini dicetak secara otomatis dari sistem EDAN Stock App pada ${new Date().toLocaleString('id-ID')}
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        log.nama?.toLowerCase().includes(search.toLowerCase()) ||
        log.sn?.toLowerCase().includes(search.toLowerCase()) ||
        log.asal?.toLowerCase().includes(search.toLowerCase());

      let matchMonth = true;
      if (selectedMonth !== 'all' && log.tanggal) {
        const logMonth = new Date(log.tanggal).getMonth().toString();
        matchMonth = logMonth === selectedMonth;
      }

      let matchDateRange = true;
      if (startDate && log.tanggal) {
        matchDateRange = matchDateRange && log.tanggal >= startDate;
      }
      if (endDate && log.tanggal) {
        matchDateRange = matchDateRange && log.tanggal <= endDate;
      }

      let matchPinjam = true;
      if (activeTab === 'keluar' && onlyPinjam) {
        matchPinjam = log.ket?.includes('[DIPINJAM]');
      }

      return matchSearch && matchMonth && matchDateRange && matchPinjam;
    });
  }, [logs, search, selectedMonth, startDate, endDate, activeTab, onlyPinjam]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((a) => {
      const matchSearch =
        a.detail?.toLowerCase().includes(search.toLowerCase()) ||
        a.user_email?.toLowerCase().includes(search.toLowerCase()) ||
        a.action?.toLowerCase().includes(search.toLowerCase());

      let matchDateRange = true;
      if (startDate && a.created_at) {
        const auditDate = new Date(a.created_at).toISOString().split('T')[0];
        matchDateRange = matchDateRange && auditDate >= startDate;
      }
      if (endDate && a.created_at) {
        const auditDate = new Date(a.created_at).toISOString().split('T')[0];
        matchDateRange = matchDateRange && auditDate <= endDate;
      }

      return matchSearch && matchDateRange;
    });
  }, [auditLogs, search, startDate, endDate]);

  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      showAlert('Data Kosong', 'Tidak ada data untuk diexport ke Excel.', 'danger');
      return;
    }

    const headers = [
      'No',
      'Tipe Transaksi',
      'Asal / Surat Jalan',
      'Serial Number (SN)',
      'Nama Barang',
      'Quantity',
      'Tanggal',
      'Jam Input',
      'Keterangan',
    ];
    const rows = filteredLogs.map((log, index) => {
      const jamInput = log.created_at
        ? new Date(log.created_at).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          }) + ' WIB'
        : '-';
      return [
        index + 1,
        `"${log.tipe}"`,
        `"${(log.asal || '-').replace(/"/g, '""')}"`,
        `"${(log.sn || '-').replace(/"/g, '""')}"`,
        `"${(log.nama || '-').replace(/"/g, '""')}"`,
        log.qty || 0,
        `"${log.tanggal || '-'}"`,
        `"${jamInput}"`,
        `"${(log.ket || '-').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);

    const fileName = `Laporan_${activeTab === 'masuk' ? 'Barang_Masuk' : 'Barang_Keluar'}_${
      new Date().toISOString().split('T')[0]
    }.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    recordAudit(
      'EXPORT',
      `Mengunduh laporan Excel (${fileName}) berisi ${filteredLogs.length} baris data.`
    );
  };

  const searchedItemName = useMemo(() => {
    const keyword = search.trim();
    if (!keyword || filteredLogs.length === 0) return null;

    const firstMatchedName = filteredLogs[0].nama;
    const isConsistent = filteredLogs.every(
      (item) =>
        item.nama?.trim().toLowerCase() === firstMatchedName?.trim().toLowerCase()
    );

    return isConsistent ? firstMatchedName : null;
  }, [search, filteredLogs]);

  const currentSearchedStock = useMemo(() => {
    if (!searchedItemName) return 0;
    const targetName = searchedItemName.trim().toLowerCase();

    const totalMasuk = allLogs
      .filter(
        (item) =>
          item.tipe === 'Barang Masuk' &&
          item.nama?.trim().toLowerCase() === targetName
      )
      .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

    const totalKeluar = allLogs
      .filter(
        (item) =>
          item.tipe === 'Barang Keluar' &&
          item.nama?.trim().toLowerCase() === targetName
      )
      .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);

    return totalMasuk - totalKeluar;
  }, [searchedItemName, allLogs]);

  const groupedLogs = useMemo(() => {
    const groups = {};
    filteredLogs.forEach((log) => {
      if (!log.tanggal) return;
      const dateObj = new Date(log.tanggal);
      const monthYear = dateObj.toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
      });

      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(log);
    });
    return groups;
  }, [filteredLogs]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const totalMasukBulanIni = useMemo(() => {
    return allLogs
      .filter(
        (item) =>
          item.tipe === 'Barang Masuk' &&
          new Date(item.tanggal).getMonth() === currentMonth &&
          new Date(item.tanggal).getFullYear() === currentYear
      )
      .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }, [allLogs, currentMonth, currentYear]);

  const totalKeluarBulanIni = useMemo(() => {
    return allLogs
      .filter(
        (item) =>
          item.tipe === 'Barang Keluar' &&
          new Date(item.tanggal).getMonth() === currentMonth &&
          new Date(item.tanggal).getFullYear() === currentYear
      )
      .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }, [allLogs, currentMonth, currentYear]);

  const totalJenisBarang = useMemo(() => {
    const uniqueNames = new Set(
      allLogs.map((item) => item.nama?.trim().toLowerCase()).filter(Boolean)
    );
    return uniqueNames.size;
  }, [allLogs]);

  const sisaSedangDipinjam = useMemo(() => {
    return allLogs
      .filter(
        (item) => item.tipe === 'Barang Keluar' && item.ket?.includes('[DIPINJAM]')
      )
      .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }, [allLogs]);

  const handleResetDateRange = () => {
    setStartDate('');
    setEndDate('');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400">
        Memeriksa sesi login...
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={(newSession) => setSession(newSession)} />;
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header & Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <img
              src="./logoedan.png"
              alt="Logo EDAN"
              className="h-12 w-auto object-contain rounded-lg"
            />
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Stock Barang <span className="text-emerald-400">EDAN</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-400 text-xs">Mode:</span>
                {activeTab === 'masuk' && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                    Barang Masuk
                  </span>
                )}
                {activeTab === 'keluar' && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/20">
                    Barang Keluar
                  </span>
                )}
                {activeTab === 'audit' && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20">
                    Audit Log
                  </span>
                )}
                {activeTab === 'maqna' && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/20">
                    📦 Stock Barang Maqna
                  </span>
                )}
                {userRole === 'viewer' && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
                    👁️ View Only
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-wrap bg-slate-900 p-1.5 rounded-2xl border border-slate-800 gap-1">
              {(userRole === 'admin' || userRole === 'viewer' || userRole === 'masuk') && (
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
              )}

              {(userRole === 'admin' || userRole === 'viewer' || userRole === 'keluar') && (
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
              )}

              {(userRole === 'admin' || userRole === 'viewer') && (
                <button
                  onClick={() => navigate('/audit')}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
                    activeTab === 'audit'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📜 Audit Log
                </button>
              )}

              <button
                onClick={() => navigate('/maqna')}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'maqna'
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Stock Barang Maqna
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 rounded-xl text-xs font-semibold transition-all"
            >
              Logout
            </button>
          </div>
        </div>

        {/* TAMPILAN KHUSUS TAB STOCK BARANG MAQNA & AUDIT LOG */}
        {activeTab === 'maqna' ? (
          <StockMaqna
            transaksi={allLogs}
            onRefresh={fetchAllLogsForStock}
            onRecordAudit={recordAudit}
            isReadOnly={userRole === 'viewer'}
          />
        ) : activeTab === 'audit' ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <span>📜</span> Riwayat Audit Aktivitas Sistem
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Catatan otomatis setiap penambahan, perubahan, pengembalian, dan penghapusan data
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Dari:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-slate-200 focus:outline-none text-xs"
                  />
                  <span className="text-slate-400 font-medium">S/D:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
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

                <input
                  type="text"
                  placeholder="Cari aktivitas / user..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full sm:w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-xs border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Waktu Aktivitas</th>
                    <th className="py-3.5 px-4">User / Akun</th>
                    <th className="py-3.5 px-4">Aksi</th>
                    <th className="py-3.5 px-4">Keterangan Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-slate-500">
                        Memuat riwayat audit...
                      </td>
                    </tr>
                  ) : filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-slate-500">
                        Belum ada catatan aktivitas sistem.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((audit) => {
                      const actionBadge =
                        audit.action === 'TAMBAH'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : audit.action === 'EDIT'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : audit.action === 'HAPUS'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : audit.action === 'KEMBALIKAN'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-slate-800 text-slate-300 border-slate-700';

                      return (
                        <tr
                          key={audit.id}
                          className="hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                            {new Date(audit.created_at).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}{' '}
                            WIB
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-200">
                            {audit.user_email}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${actionBadge}`}
                            >
                              {audit.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{audit.detail}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TAMPILAN NORMAL UNTUK BARANG MASUK & KELUAR */
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl flex items-center gap-4">
                <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Total Jenis Barang
                  </p>
                  <h3 className="text-2xl font-black text-white mt-0.5">
                    {totalJenisBarang}{' '}
                    <span className="text-xs font-normal text-slate-500">Items</span>
                  </h3>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl flex items-center gap-4">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Masuk (Bulan Ini)
                  </p>
                  <h3 className="text-2xl font-black text-emerald-400 mt-0.5">
                    +{totalMasukBulanIni}{' '}
                    <span className="text-xs font-normal text-slate-500">Unit</span>
                  </h3>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl flex items-center gap-4">
                <div className="p-3.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Keluar (Bulan Ini)
                  </p>
                  <h3 className="text-2xl font-black text-rose-400 mt-0.5">
                    -{totalKeluarBulanIni}{' '}
                    <span className="text-xs font-normal text-slate-500">Unit</span>
                  </h3>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-amber-500/30 rounded-2xl p-5 backdrop-blur-xl flex items-center gap-4">
                <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Sedang Dipinjam
                  </p>
                  <h3 className="text-2xl font-black text-amber-400 mt-0.5">
                    {sisaSedangDipinjam}{' '}
                    <span className="text-xs font-normal text-slate-500">Unit</span>
                  </h3>
                </div>
              </div>
            </div>

            {/* Form Card (Disembunyikan jika akun viewer) */}
            {userRole !== 'viewer' && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
                <h2 className="text-xl font-semibold mb-6 text-slate-200 flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      activeTab === 'masuk' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  ></span>
                  Input khusus {activeTab === 'masuk' ? 'Barang Masuk' : 'Barang Keluar'}
                </h2>

                <form
                  onSubmit={handleSubmit}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Surat Jalan / Asal
                    </label>
                    <input
                      type="text"
                      value={formData.asal}
                      onChange={(e) => setFormData({ ...formData, asal: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, sn: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
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
                        onChange={(e) =>
                          setFormData({ ...formData, status_keluar: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-4 py-2.5 text-amber-300 focus:outline-none focus:border-amber-500 transition-all text-sm font-semibold"
                      >
                        <option value="Keluar Permanen">
                          🔴 Keluar Permanen (Dijual/Pakai)
                        </option>
                        <option value="Pinjam">🟡 Pinjam (Sementara)</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      {activeTab === 'masuk'
                        ? 'Quantity Masuk'
                        : 'Quantity Keluar / Pinjam'}
                    </label>
                    <input
                      type="number"
                      value={formData.qty}
                      onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
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
                      onChange={(e) =>
                        setFormData({ ...formData, tanggal: e.target.value })
                      }
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
                      onChange={(e) => handleFileUpload(e, false)}
                      className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                    />

                    {uploading && (
                      <p className="text-xs text-indigo-400 mt-1">
                        Mengompres &amp; Uploading foto...
                      </p>
                    )}

                    {fileSizeInfo.original && !uploading && (
                      <div className="mt-2 text-xs flex items-center gap-2 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-400">
                          Awal:{' '}
                          <strong className="text-rose-400">
                            {fileSizeInfo.original}
                          </strong>
                        </span>
                        {fileSizeInfo.compressed && (
                          <>
                            <span className="text-slate-600">➔</span>
                            <span className="text-slate-400">
                              Hasil:{' '}
                              <strong className="text-emerald-400">
                                {fileSizeInfo.compressed}
                              </strong>
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
                      onChange={(e) => setFormData({ ...formData, ket: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                      placeholder={
                        activeTab === 'keluar' && formData.status_keluar === 'Pinjam'
                          ? 'Peminjam, tujuan, estimasi balik, dll'
                          : 'Catatan atau keterangan tambahan'
                      }
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
                      Simpan{' '}
                      {activeTab === 'masuk'
                        ? 'Barang Masuk'
                        : formData.status_keluar === 'Pinjam'
                        ? 'Pinjaman Barang'
                        : 'Barang Keluar'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tabel Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-200">
                  Riwayat{' '}
                  {activeTab === 'masuk'
                    ? 'Barang Masuk'
                    : 'Barang Keluar & Pinjaman'}
                </h2>

                <div className="flex flex-wrap items-center gap-3">
                  {activeTab === 'keluar' && (
                    <button
                      onClick={() => setOnlyPinjam(!onlyPinjam)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                        onlyPinjam
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-lg shadow-amber-950/50'
                          : 'bg-slate-950 text-amber-400 border-amber-500/30 hover:border-amber-500'
                      }`}
                    >
                      <span>🟡</span>
                      <span>
                        {onlyPinjam ? 'Tampilkan Semua' : 'Hanya Dipinjam'}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={handleExportExcel}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Export Excel
                  </button>

                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 gap-2 text-xs">
                    <span className="text-slate-400 font-medium">Dari:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent text-slate-200 focus:outline-none text-xs"
                    />
                    <span className="text-slate-400 font-medium">S/D:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
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
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {monthsList.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Cari Nama / SN / SJ..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full sm:w-52"
                  />
                </div>
              </div>

              {searchedItemName && (
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                      Info Total Stok Real-Time
                    </p>
                    <h4 className="text-lg font-bold text-white mt-0.5">
                      Barang: "{searchedItemName}"
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-400">
                      {currentSearchedStock}
                    </span>
                    <span className="text-xs text-slate-400 block">
                      Unit Tersedia di Gudang
                    </span>
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
                      <th className="py-3.5 px-4 text-emerald-400">
                        {activeTab === 'masuk' ? 'QTY Masuk' : 'QTY Keluar'}
                      </th>
                      <th className="py-3.5 px-4">Tanggal</th>
                      <th className="py-3.5 px-4">Keterangan</th>
                      <th className="py-3.5 px-4">Foto</th>
                      <th className="py-3.5 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading ? (
                      <tr>
                        <td colSpan="9" className="text-center py-8 text-slate-500">
                          Memuat data...
                        </td>
                      </tr>
                    ) : Object.keys(groupedLogs).length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-8 text-slate-500">
                          Belum ada riwayat data
                        </td>
                      </tr>
                    ) : (
                      Object.entries(groupedLogs).map(([monthName, items]) => (
                        <React.Fragment key={monthName}>
                          <tr className="bg-slate-950/80">
                            <td
                              colSpan="9"
                              className="py-2.5 px-4 font-bold text-xs uppercase tracking-wider text-emerald-400 border-y border-slate-800/80"
                            >
                              📅 Bulan: {monthName} ({items.length} Transaksi)
                            </td>
                          </tr>

                          {items.map((log) => {
                            const isPinjam = log.ket?.includes('[DIPINJAM]');

                            return (
                              <tr
                                key={log.id}
                                className="hover:bg-slate-800/40 transition-colors"
                              >
                                <td className="py-3 px-4">
                                  {log.tipe === 'Barang Masuk' ? (
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
                                <td className="py-3 px-4 font-mono text-slate-400">
                                  {log.sn || '-'}
                                </td>
                                <td className="py-3 px-4 font-semibold text-white">
                                  {log.nama || '-'}
                                </td>
                                <td className="py-3 px-4 font-bold text-emerald-400">
                                  {log.qty || 0} Unit
                                </td>

                                <td className="py-3 px-4">
                                  <div className="text-slate-300 font-medium">
                                    {log.tanggal}
                                  </div>
                                  {log.created_at && (
                                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                      <span>🕒</span>
                                      <span>
                                        {new Date(log.created_at).toLocaleTimeString(
                                          'id-ID',
                                          { hour: '2-digit', minute: '2-digit' }
                                        )}{' '}
                                        WIB
                                      </span>
                                    </div>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-slate-400">
                                  {log.ket || '-'}
                                </td>
                                <td className="py-3 px-4">
                                  {log.foto_url ? (
                                    <a
                                      href={log.foto_url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <img
                                        src={log.foto_url}
                                        alt="Foto"
                                        className="w-10 h-10 object-cover rounded-lg border border-slate-700 hover:scale-110 transition-transform"
                                      />
                                    </a>
                                  ) : (
                                    <span className="text-xs text-slate-600">
                                      Tidak ada
                                    </span>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-center flex items-center justify-center gap-1.5">
                                  {userRole !== 'viewer' && isPinjam && (
                                    <button
                                      onClick={() => openReturnModal(log)}
                                      className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white rounded-lg text-xs font-medium border border-amber-500/20 transition-all"
                                      title="Kembalikan Stok Barang Pinjaman"
                                    >
                                      ↩ Balik
                                    </button>
                                  )}

                                  {userRole !== 'viewer' && (
                                    <button
                                      onClick={() => openEditModal(log)}
                                      className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg text-xs font-medium border border-indigo-500/20 transition-all"
                                      title="Edit Transaksi Ini"
                                    >
                                      ✏️ Edit
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handlePrintPDF(log)}
                                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700 transition-all"
                                    title="Cetak Bukti PDF"
                                  >
                                    🖨️ PDF
                                  </button>

                                  {userRole !== 'viewer' && (
                                    <button
                                      onClick={() => handleDelete(log)}
                                      className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg text-xs font-medium border border-rose-500/20 transition-all"
                                    >
                                      Hapus
                                    </button>
                                  )}
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
          </>
        )}
      </div>

      {/* MODAL EDIT DATA TRANSAKSI */}
      {editModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 transition-all overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">✏️</span>
                <h3 className="text-lg font-bold text-white">
                  Edit Transaksi #{editModal.id}
                </h3>
              </div>
              <button
                onClick={() => setEditModal({ ...editModal, isOpen: false })}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Surat Jalan / Asal
                </label>
                <input
                  type="text"
                  value={editModal.asal}
                  onChange={(e) =>
                    setEditModal({ ...editModal, asal: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Serial Number (SN)
                </label>
                <input
                  type="text"
                  value={editModal.sn}
                  onChange={(e) =>
                    setEditModal({ ...editModal, sn: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Nama Barang
                </label>
                <input
                  type="text"
                  value={editModal.nama}
                  onChange={(e) =>
                    setEditModal({ ...editModal, nama: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={editModal.qty}
                  onChange={(e) =>
                    setEditModal({ ...editModal, qty: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={editModal.tanggal}
                  onChange={(e) =>
                    setEditModal({ ...editModal, tanggal: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Ganti Foto (Opsional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, true)}
                  className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Keterangan
                </label>
                <input
                  type="text"
                  value={editModal.ket}
                  onChange={(e) =>
                    setEditModal({ ...editModal, ket: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditModal({ ...editModal, isOpen: false })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-950/50 transition-all"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PENGEMBALIAN BARANG */}
      {returnModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-all">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Pengembalian Barang Pinjaman
                </h3>
                <p className="text-xs text-slate-400">
                  Konfirmasi barang masuk kembali ke gudang
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
              <p>
                <strong className="text-slate-400">Nama Barang:</strong>{' '}
                <span className="text-white font-bold">{returnModal.log?.nama}</span>
              </p>
              <p>
                <strong className="text-slate-400">Jumlah Dipinjam:</strong>{' '}
                <span className="text-emerald-400 font-bold">
                  {returnModal.log?.qty} Unit
                </span>
              </p>
              <p>
                <strong className="text-slate-400">Tanggal Pinjam:</strong>{' '}
                <span className="text-amber-300 font-bold">
                  {returnModal.log?.tanggal}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Pilih Tanggal Dikembalikan:
              </label>
              <input
                type="date"
                value={returnModal.returnDate}
                onChange={(e) =>
                  setReturnModal({ ...returnModal, returnDate: e.target.value })
                }
                className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() =>
                  setReturnModal({
                    isOpen: false,
                    log: null,
                    returnDate: new Date().toISOString().split('T')[0],
                  })
                }
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
              <div
                className={`p-3 rounded-xl ${
                  modal.type === 'danger'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {modal.type === 'danger' ? (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
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