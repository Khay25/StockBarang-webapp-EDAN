import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './login';
import StockMaqna from './StockMaqna';
import logoEdan from './logoedan.png';

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedKategoriFilter, setSelectedKategoriFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [onlyPinjam, setOnlyPinjam] = useState(false);

  const [fileSizeInfo, setFileSizeInfo] = useState({ original: '', compressed: '' });

  // State panel Kelola Kategori & Tipe Barang (Tambah / Edit / Hapus)
  const [showManageKatPanel, setShowManageKatPanel] = useState(false);
  const [newKatData, setNewKatData] = useState({ kategori: '', sub_kategori: '' });
  const [editingKatId, setEditingKatId] = useState(null);
  const [editKatDraft, setEditKatDraft] = useState({ kategori: '', sub_kategori: '' });
  const [savingKat, setSavingKat] = useState(false);

  // Header Surat Jalan (1 SJ untuk banyak barang)
  const [sjHeader, setSjHeader] = useState({
    asal: '',
    perusahaan: '',
    alamat: '',
    tanggal: new Date().toISOString().split('T')[0],
    ket: '',
    foto_url: '',
    status_masuk: 'Stock',
    status_keluar: 'Penjualan',
    pinjam_mulai: new Date().toISOString().split('T')[0],
    pinjam_selesai: '',
  });

  // Daftar Barang & SN di dalam 1 Surat Jalan
  const [itemsList, setItemsList] = useState([
    {
      id: Date.now(),
      kategori: '',
      sub_kategori: '', // dipakai untuk Tipe Barang
      nama: '',
      sn: '',
      qty: '',
    },
  ]);

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
    perusahaan: '',
    alamat: '',
    kategori: '',
    sub_kategori: '', // dipakai untuk Tipe Barang
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

  // Helper parse status dari kolom ket
  const parseStatusFromKet = (log) => {
    const ket = log.ket || '';
    const isMasuk = log.tipe === 'Barang Masuk';

    if (ket.includes('[DIPINJAM') || ket.includes('[PINJAM (DEMO)')) {
      const dateMatch = ket.match(/\(([^)]+)\)/);
      return {
        code: 'pinjam',
        label: '🟡 Pinjam (Demo)',
        period: dateMatch ? dateMatch[1] : '',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      };
    }

    if (ket.includes('[SERVICE]')) {
      return {
        code: 'service',
        label: '🔧 Service',
        period: '',
        badgeClass: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
      };
    }

    if (ket.includes('[DIKEMBALIKAN')) {
      return {
        code: 'dikembalikan',
        label: '✅ Dikembalikan',
        period: '',
        badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      };
    }

    if (isMasuk) {
      return {
        code: 'stock',
        label: '🟢 Stock',
        period: '',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      };
    }

    return {
      code: 'penjualan',
      label: '🔴 Penjualan',
      period: '',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    };
  };

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

  const fetchKategori = async () => {
    const { data, error } = await supabase
      .from('kategori_barang')
      .select('*')
      .order('kategori', { ascending: true })
      .order('sub_kategori', { ascending: true });

    if (!error) {
      setKategoriList(data || []);
    }
  };

  useEffect(() => {
    if (session) {
      fetchKategori();
      fetchAllLogsForStock();
      if (activeTab === 'audit') {
        fetchAuditLogs();
      } else if (activeTab === 'masuk' || activeTab === 'keluar') {
        fetchLogs();
      }
      setSearch('');
      setSelectedMonth('all');
      setSelectedKategoriFilter('all');
      setStartDate('');
      setEndDate('');
      setOnlyPinjam(false);
      setFileSizeInfo({ original: '', compressed: '' });
      const today = new Date().toISOString().split('T')[0];
      setSjHeader({
        asal: '',
        perusahaan: '',
        alamat: '',
        tanggal: today,
        ket: '',
        foto_url: '',
        status_masuk: 'Stock',
        status_keluar: 'Penjualan',
        pinjam_mulai: today,
        pinjam_selesai: '',
      });
      setItemsList([
        {
          id: Date.now(),
          kategori: '',
          sub_kategori: '',
          nama: '',
          sn: '',
          qty: '',
        },
      ]);
    }
  }, [activeTab, session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchAllLogsForStock = async () => {
    const { data, error } = await supabase
      .from('stok_barang')
      .select('*')
      .order('tanggal', { ascending: true });

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
      .order('tanggal', { ascending: true })
      .order('created_at', { ascending: true });

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

  // --- KATEGORI & TIPE BARANG HELPERS ---
  const uniqueCategories = useMemo(() => {
    const setKat = new Set(
      kategoriList.map((item) => item.kategori?.trim()).filter(Boolean)
    );
    return Array.from(setKat);
  }, [kategoriList]);

  const getTipeBarangFor = (kategoriName) => {
    if (!kategoriName) return [];
    return kategoriList
      .filter(
        (item) =>
          item.kategori?.trim().toLowerCase() === kategoriName.trim().toLowerCase()
      )
      .map((item) => item.sub_kategori?.trim())
      .filter(Boolean);
  };

  // --- DATA BARANG & SN UNTUK AUTOCOMPLETE / DROPDOWN TAB BARANG KELUAR ---
  const availableStockSummary = useMemo(() => {
    const itemMap = new Map();
    const snBalanceMap = new Map();

    allLogs.forEach((log) => {
      const nama = (log.nama || '').trim();
      if (!nama) return;
      const namaKey = nama.toLowerCase();
      const qty = Number(log.qty) || 0;
      const isMasuk = log.tipe === 'Barang Masuk';

      if (!itemMap.has(namaKey)) {
        itemMap.set(namaKey, {
          nama,
          kategori: log.kategori && log.kategori !== '-' ? log.kategori : '',
          sub_kategori:
            log.sub_kategori && log.sub_kategori !== '-' ? log.sub_kategori : '',
          totalQty: 0,
        });
      }

      const info = itemMap.get(namaKey);
      info.totalQty += isMasuk ? qty : -qty;
      if (!info.kategori && log.kategori && log.kategori !== '-') {
        info.kategori = log.kategori;
      }
      if (!info.sub_kategori && log.sub_kategori && log.sub_kategori !== '-') {
        info.sub_kategori = log.sub_kategori;
      }

      const sn = (log.sn || '').trim();
      if (sn && sn !== '-') {
        const snKey = `${namaKey}__${sn.toLowerCase()}`;
        const prev = snBalanceMap.get(snKey) || {
          nama,
          namaKey,
          sn,
          kategori: info.kategori,
          sub_kategori: info.sub_kategori,
          qty: 0,
        };
        prev.qty += isMasuk ? qty : -qty;
        if (log.kategori && log.kategori !== '-') prev.kategori = log.kategori;
        if (log.sub_kategori && log.sub_kategori !== '-') {
          prev.sub_kategori = log.sub_kategori;
        }
        snBalanceMap.set(snKey, prev);
      }
    });

    const availableItems = Array.from(itemMap.values());
    const availableSNs = Array.from(snBalanceMap.values());

    return { availableItems, availableSNs, snBalanceMap, itemMap };
  }, [allLogs]);

  // Daftar Surat Jalan Barang Masuk untuk Autocomplete & Auto-Fill di Tab Keluar
  const incomingSJMap = useMemo(() => {
    const map = new Map();
    allLogs
      .filter((log) => log.tipe === 'Barang Masuk' && log.asal && log.asal !== '-')
      .forEach((log) => {
        const sjKey = log.asal.trim().toLowerCase();
        if (!map.has(sjKey)) {
          map.set(sjKey, {
            sj: log.asal.trim(),
            perusahaan: log.perusahaan && log.perusahaan !== '-' ? log.perusahaan : '',
            alamat: log.alamat && log.alamat !== '-' ? log.alamat : '',
            items: [],
          });
        }
        const entry = map.get(sjKey);
        if (!entry.perusahaan && log.perusahaan && log.perusahaan !== '-') {
          entry.perusahaan = log.perusahaan;
        }
        if (!entry.alamat && log.alamat && log.alamat !== '-') {
          entry.alamat = log.alamat;
        }
        entry.items.push(log);
      });
    return map;
  }, [allLogs]);

  // Handler saat No. Surat Jalan diketik / dipilih di Tab Barang Keluar
  const handleSJNumberChange = (val) => {
    setSjHeader((prev) => ({ ...prev, asal: val }));

    if (activeTab !== 'keluar') return;

    const matchedSJ = incomingSJMap.get(val.trim().toLowerCase());
    if (matchedSJ) {
      const autoRows = matchedSJ.items.map((srcItem) => ({
        id: Date.now() + Math.random(),
        kategori:
          srcItem.kategori && srcItem.kategori !== '-' ? srcItem.kategori : '',
        sub_kategori:
          srcItem.sub_kategori && srcItem.sub_kategori !== '-'
            ? srcItem.sub_kategori
            : '',
        nama: (srcItem.nama || '').trim(),
        sn: srcItem.sn && srcItem.sn !== '-' ? srcItem.sn.trim() : '',
        qty: String(srcItem.qty || 1),
      }));

      setSjHeader((prev) => ({
        ...prev,
        asal: val,
        perusahaan: matchedSJ.perusahaan || prev.perusahaan,
        alamat: matchedSJ.alamat || prev.alamat,
      }));

      if (autoRows.length > 0) {
        setItemsList(autoRows);
      }
    }
  };

  const handleSaveNewKategori = async () => {
    const kat = newKatData.kategori.trim();
    const tipe = newKatData.sub_kategori.trim();
    if (!kat || !tipe) {
      showAlert('Data Belum Lengkap', 'Nama Kategori dan Tipe Barang wajib diisi!', 'danger');
      return;
    }

    const exists = kategoriList.some(
      (item) =>
        item.kategori?.trim().toLowerCase() === kat.toLowerCase() &&
        item.sub_kategori?.trim().toLowerCase() === tipe.toLowerCase()
    );

    if (exists) {
      setItemsList((prev) =>
        prev.map((row, idx) =>
          idx === prev.length - 1 ? { ...row, kategori: kat, sub_kategori: tipe } : row
        )
      );
      setNewKatData({ kategori: '', sub_kategori: '' });
      return;
    }

    setSavingKat(true);
    const { error } = await supabase
      .from('kategori_barang')
      .insert([{ kategori: kat, sub_kategori: tipe }]);

    if (error) {
      showAlert('Gagal Menyimpan Kategori', error.message, 'danger');
    } else {
      await recordAudit('TAMBAH', `Menambah Kategori & Tipe: ${kat} > ${tipe}`);
      await fetchKategori();
      setItemsList((prev) =>
        prev.map((row, idx) =>
          idx === prev.length - 1 ? { ...row, kategori: kat, sub_kategori: tipe } : row
        )
      );
      setNewKatData({ kategori: '', sub_kategori: '' });
      showAlert('Kategori Ditambahkan', `Kategori "${kat} > ${tipe}" berhasil dibuat.`, 'success');
    }
    setSavingKat(false);
  };

  const handleStartEditKat = (item) => {
    setEditingKatId(item.id);
    setEditKatDraft({
      kategori: item.kategori || '',
      sub_kategori: item.sub_kategori || '',
    });
  };

  const handleUpdateKat = async (id) => {
    const kat = editKatDraft.kategori.trim();
    const tipe = editKatDraft.sub_kategori.trim();
    if (!kat || !tipe) {
      showAlert('Gagal', 'Kategori dan Tipe Barang tidak boleh kosong!', 'danger');
      return;
    }

    setSavingKat(true);
    const { error } = await supabase
      .from('kategori_barang')
      .update({ kategori: kat, sub_kategori: tipe })
      .eq('id', id);

    if (error) {
      showAlert('Gagal Edit Kategori', error.message, 'danger');
    } else {
      await recordAudit('EDIT', `Mengedit Kategori #${id} menjadi: ${kat} > ${tipe}`);
      setEditingKatId(null);
      await fetchKategori();
    }
    setSavingKat(false);
  };

  const handleDeleteKat = (item) => {
    showConfirm(
      'Hapus Kategori & Tipe?',
      `Yakin ingin menghapus "${item.kategori} > ${item.sub_kategori}" dari daftar pilihan?`,
      async () => {
        const { error } = await supabase
          .from('kategori_barang')
          .delete()
          .eq('id', item.id);

        if (error) {
          showAlert('Gagal Menghapus', error.message, 'danger');
        } else {
          await recordAudit(
            'HAPUS',
            `Menghapus Kategori: ${item.kategori} > ${item.sub_kategori}`
          );
          await fetchKategori();
          showAlert('Terhapus', 'Kategori & Tipe Barang berhasil dihapus.', 'success');
        }
      }
    );
  };

  // --- MANIPULASI BARIS BARANG & SN DALAM 1 SURAT JALAN ---
  const handleAddItemRow = () => {
    setItemsList((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        kategori: prev[prev.length - 1]?.kategori || '',
        sub_kategori: prev[prev.length - 1]?.sub_kategori || '',
        nama: prev[prev.length - 1]?.nama || '',
        sn: '',
        qty: '1',
      },
    ]);
  };

  const handleRemoveItemRow = (rowId) => {
    if (itemsList.length <= 1) return;
    setItemsList((prev) => prev.filter((item) => item.id !== rowId));
  };

  const handleItemRowChange = (rowId, field, value) => {
    setItemsList((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        if (field === 'kategori') {
          return {
            ...row,
            kategori: value,
            sub_kategori: '',
            ...(activeTab === 'keluar' ? { nama: '', sn: '', qty: '' } : {}),
          };
        }

        if (field === 'sub_kategori') {
          return {
            ...row,
            sub_kategori: value,
            ...(activeTab === 'keluar' ? { nama: '', sn: '', qty: '' } : {}),
          };
        }

        if (field === 'nama' && activeTab === 'keluar') {
          const stockInfo = availableStockSummary.itemMap.get(
            value.trim().toLowerCase()
          );
          return {
            ...row,
            nama: value,
            kategori: stockInfo?.kategori || row.kategori,
            sub_kategori: stockInfo?.sub_kategori || row.sub_kategori,
            sn: '',
            qty: '1',
          };
        }

        if (field === 'sn' && activeTab === 'keluar') {
          const snInfo = availableStockSummary.snBalanceMap.get(
            `${row.nama.trim().toLowerCase()}__${value.trim().toLowerCase()}`
          );
          return {
            ...row,
            sn: value,
            kategori: snInfo?.kategori || row.kategori,
            sub_kategori: snInfo?.sub_kategori || row.sub_kategori,
            qty: row.qty || '1',
          };
        }

        return { ...row, [field]: value };
      })
    );
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
        setSjHeader((prev) => ({ ...prev, foto_url: publicUrlData.publicUrl }));
      }
    } catch (err) {
      showAlert('Terjadi Kesalahan', err.message, 'danger');
    }

    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole === 'viewer') return;

    for (let i = 0; i < itemsList.length; i++) {
      const row = itemsList[i];
      if (!row.nama.trim() || !row.qty || Number(row.qty) <= 0) {
        showAlert(
          'Data Belum Lengkap',
          `Baris barang ke-${i + 1}: Nama Barang dan Quantity (> 0) wajib diisi!`,
          'danger'
        );
        return;
      }
    }

    const activeStatus =
      activeTab === 'masuk' ? sjHeader.status_masuk : sjHeader.status_keluar;

    if (
      activeTab === 'keluar' &&
      activeStatus === 'Pinjam (Demo)' &&
      !sjHeader.pinjam_mulai
    ) {
      showAlert(
        'Tanggal Pinjam Belum Diisi',
        'Silakan isi tanggal Mulai Pinjam (Demo)!',
        'danger'
      );
      return;
    }

    let finalKet = sjHeader.ket.trim();

    if (activeTab === 'masuk') {
      if (activeStatus === 'Pinjam (Demo)') {
        finalKet = `[PINJAM (DEMO)] ${finalKet}`.trim();
      } else if (activeStatus === 'Service') {
        finalKet = `[SERVICE] ${finalKet}`.trim();
      } else {
        finalKet = `[STOCK] ${finalKet}`.trim();
      }
    } else {
      const periodePinjam =
        sjHeader.pinjam_mulai || sjHeader.pinjam_selesai
          ? ` (${sjHeader.pinjam_mulai || '?'} s/d ${sjHeader.pinjam_selesai || '?'})`
          : '';

      if (activeStatus === 'Pinjam (Demo)') {
        finalKet = `[DIPINJAM] [PINJAM (DEMO)${periodePinjam}] ${finalKet}`.trim();
      } else if (activeStatus === 'Service') {
        finalKet = `[SERVICE] ${finalKet}`.trim();
      } else {
        finalKet = `[PENJUALAN] ${finalKet}`.trim();
      }
    }

    const tipeTransaksi = activeTab === 'masuk' ? 'Barang Masuk' : 'Barang Keluar';
    const sjValue = sjHeader.asal.trim() || `SJ-${Date.now()}`;

    const entriesToInsert = itemsList.map((row) => ({
      tipe: tipeTransaksi,
      asal: sjValue,
      perusahaan: sjHeader.perusahaan.trim() || '-',
      alamat: sjHeader.alamat.trim() || '-',
      kategori: row.kategori || '-',
      sub_kategori: row.sub_kategori || '-',
      sn: row.sn.trim(),
      nama: row.nama.trim(),
      qty: parseInt(row.qty, 10) || 0,
      tanggal: sjHeader.tanggal,
      ket: finalKet,
      foto_url: sjHeader.foto_url,
    }));

    const { error } = await supabase.from('stok_barang').insert(entriesToInsert);

    if (error) {
      showAlert('Gagal Menyimpan', error.message, 'danger');
    } else {
      const ringkasanBarang = entriesToInsert
        .map((it) => `${it.nama} (${it.qty} Unit${it.sn ? `, SN: ${it.sn}` : ''})`)
        .join('; ');

      await recordAudit(
        'TAMBAH',
        `Menambah ${tipeTransaksi} [${activeStatus}] [SJ: ${sjValue} | PT: ${
          sjHeader.perusahaan || '-'
        }]: ${ringkasanBarang}`
      );

      const today = new Date().toISOString().split('T')[0];
      setSjHeader({
        asal: '',
        perusahaan: '',
        alamat: '',
        tanggal: today,
        ket: '',
        foto_url: '',
        status_masuk: 'Stock',
        status_keluar: 'Penjualan',
        pinjam_mulai: today,
        pinjam_selesai: '',
      });
      setItemsList([
        {
          id: Date.now(),
          kategori: '',
          sub_kategori: '',
          nama: '',
          sn: '',
          qty: '',
        },
      ]);
      setFileSizeInfo({ original: '', compressed: '' });
      fetchLogs();
      fetchAllLogsForStock();
      showAlert(
        'Berhasil Disimpan',
        `${entriesToInsert.length} item barang pada Surat Jalan "${sjValue}" berhasil disimpan!`,
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
      perusahaan: log.perusahaan && log.perusahaan !== '-' ? log.perusahaan : '',
      alamat: log.alamat && log.alamat !== '-' ? log.alamat : '',
      kategori: log.kategori && log.kategori !== '-' ? log.kategori : '',
      sub_kategori: log.sub_kategori && log.sub_kategori !== '-' ? log.sub_kategori : '',
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
      perusahaan: editModal.perusahaan.trim() || '-',
      alamat: editModal.alamat.trim() || '-',
      kategori: editModal.kategori || '-',
      sub_kategori: editModal.sub_kategori || '-',
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

    const cleanKet = (log.ket || '')
      .replace('[DIPINJAM]', '')
      .replace(/\[PINJAM \(DEMO\)[^\]]*\]/g, '')
      .trim();
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
      perusahaan: log.perusahaan || '-',
      alamat: log.alamat || '-',
      kategori: log.kategori || '-',
      sub_kategori: log.sub_kategori || '-',
      sn: log.sn,
      nama: log.nama,
      qty: parseInt(log.qty, 10) || 0,
      tanggal: tglKembali,
      ket: `[STOCK] Pengembalian barang dipinjam tgl ${log.tanggal}`,
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
      'Hapus Item Riwayat?',
      `Yakin ingin menghapus "${log.nama}" (SN: ${log.sn || '-'}) dari Surat Jalan "${log.asal || '-'}"?`,
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

  // Cetak PDF gabungan seluruh barang dalam 1 Surat Jalan
  const handlePrintSJGroupPDF = (sjGroup) => {
    const printWindow = window.open('', '_blank');
    const firstItem = sjGroup.items[0];
    const statusInfo = parseStatusFromKet(firstItem);
    const badgeText =
      firstItem.tipe === 'Barang Masuk'
        ? `BUKTI BARANG MASUK (${statusInfo.code.toUpperCase()})`
        : statusInfo.code === 'pinjam'
        ? 'SURAT PINJAM (DEMO) BARANG'
        : statusInfo.code === 'service'
        ? 'SURAT JALAN SERVICE BARANG'
        : 'BUKTI PENJUALAN / BARANG KELUAR';
    const badgeColor =
      statusInfo.code === 'pinjam'
        ? '#d97706'
        : statusInfo.code === 'service'
        ? '#7c3aed'
        : firstItem.tipe === 'Barang Masuk'
        ? '#059669'
        : '#e11d48';

    const itemsRowsHtml = sjGroup.items
      .map(
        (it, idx) => `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>${it.kategori && it.kategori !== '-' ? it.kategori : '-'}</td>
          <td>${it.sub_kategori && it.sub_kategori !== '-' ? it.sub_kategori : '-'}</td>
          <td><strong>${it.nama}</strong></td>
          <td style="font-family: monospace;">${it.sn || '-'}</td>
          <td style="text-align:center;"><strong>${it.qty} Unit</strong></td>
        </tr>
      `
      )
      .join('');

    const totalQtyGroup = sjGroup.items.reduce(
      (sum, it) => sum + (Number(it.qty) || 0),
      0
    );

    printWindow.document.write(`
      <html>
        <head>
          <title>${badgeText} - ${sjGroup.sj}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 20px; margin-bottom: 24px; }
            .logo { font-size: 24px; font-weight: bold; color: #0f172a; }
            .badge { background-color: ${badgeColor}; color: white; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 13px; letter-spacing: 1px; }
            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .meta-table td { padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 13px; }
            .meta-label { font-weight: bold; background-color: #f8fafc; width: 25%; color: #475569; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .items-table th { background-color: #0f172a; color: white; padding: 10px; font-size: 12px; text-transform: uppercase; border: 1px solid #0f172a; }
            .items-table td { padding: 10px; border: 1px solid #cbd5e1; font-size: 13px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 50px; text-align: center; }
            .sig-box { width: 200px; }
            .sig-line { border-bottom: 1px solid #1e293b; height: 70px; margin-bottom: 8px; }
            .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
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

          <table class="meta-table">
            <tr>
              <td class="meta-label">No. Surat Jalan</td>
              <td><strong>${sjGroup.sj}</strong></td>
              <td class="meta-label">Tanggal</td>
              <td>${sjGroup.tanggal}</td>
            </tr>
            <tr>
              <td class="meta-label">PT / Perusahaan</td>
              <td colspan="3"><strong>${sjGroup.perusahaan || '-'}</strong></td>
            </tr>
            <tr>
              <td class="meta-label">Alamat</td>
              <td colspan="3">${sjGroup.alamat || '-'}</td>
            </tr>
            <tr>
              <td class="meta-label">Keterangan</td>
              <td colspan="3">${sjGroup.ket || '-'}</td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40px;">No</th>
                <th>Kategori</th>
                <th>Tipe Barang</th>
                <th>Nama Barang</th>
                <th>Serial Number (SN)</th>
                <th style="width: 90px;">Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
              <tr>
                <td colspan="5" style="text-align:right; font-weight:bold; background:#f8fafc;">TOTAL QUANTITY</td>
                <td style="text-align:center; font-weight:bold; background:#f8fafc;">${totalQtyGroup} Unit</td>
              </tr>
            </tbody>
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
      const keyword = search.toLowerCase();
      const matchSearch =
        log.nama?.toLowerCase().includes(keyword) ||
        log.sn?.toLowerCase().includes(keyword) ||
        log.asal?.toLowerCase().includes(keyword) ||
        log.perusahaan?.toLowerCase().includes(keyword) ||
        log.alamat?.toLowerCase().includes(keyword) ||
        log.kategori?.toLowerCase().includes(keyword) ||
        log.sub_kategori?.toLowerCase().includes(keyword) ||
        log.ket?.toLowerCase().includes(keyword);

      let matchMonth = true;
      if (selectedMonth !== 'all' && log.tanggal) {
        const logMonth = new Date(log.tanggal).getMonth().toString();
        matchMonth = logMonth === selectedMonth;
      }

      let matchKategori = true;
      if (selectedKategoriFilter !== 'all') {
        matchKategori = log.kategori === selectedKategoriFilter;
      }

      let matchDateRange = true;
      if (startDate && log.tanggal) {
        matchDateRange = matchDateRange && log.tanggal >= startDate;
      }
      if (endDate && log.tanggal) {
        matchDateRange = matchDateRange && log.tanggal <= endDate;
      }

      let matchPinjam = true;
      if (onlyPinjam) {
        matchPinjam =
          log.ket?.includes('[DIPINJAM]') || log.ket?.includes('[PINJAM (DEMO)');
      }

      return matchSearch && matchMonth && matchKategori && matchDateRange && matchPinjam;
    });
  }, [logs, search, selectedMonth, selectedKategoriFilter, startDate, endDate, onlyPinjam]);

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
      'No. Surat Jalan',
      'PT / Perusahaan',
      'Alamat',
      'Kategori',
      'Tipe Barang',
      'Nama Barang',
      'Serial Number (SN)',
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
        `"${(log.perusahaan || '-').replace(/"/g, '""')}"`,
        `"${(log.alamat || '-').replace(/"/g, '""')}"`,
        `"${(log.kategori || '-').replace(/"/g, '""')}"`,
        `"${(log.sub_kategori || '-').replace(/"/g, '""')}"`,
        `"${(log.nama || '-').replace(/"/g, '""')}"`,
        `"${(log.sn || '-').replace(/"/g, '""')}"`,
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

  // Pengelompokan 2 Level: Bulan -> Surat Jalan (1 SJ bisa banyak barang + SN)
  const groupedByMonthAndSJ = useMemo(() => {
    const monthsMap = {};

    filteredLogs.forEach((log) => {
      if (!log.tanggal) return;
      const dateObj = new Date(log.tanggal);
      const monthYear = dateObj.toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
      });

      if (!monthsMap[monthYear]) {
        monthsMap[monthYear] = {
          totalItemsCount: 0,
          sjMap: new Map(),
        };
      }

      monthsMap[monthYear].totalItemsCount += 1;

      const sjNumber = (log.asal || 'Tanpa Surat Jalan').trim();
      const sjKey = `${sjNumber.toLowerCase()}__${log.tanggal}`;

      if (!monthsMap[monthYear].sjMap.has(sjKey)) {
        monthsMap[monthYear].sjMap.set(sjKey, {
          key: sjKey,
          sj: sjNumber,
          perusahaan: log.perusahaan || '-',
          alamat: log.alamat || '-',
          tanggal: log.tanggal,
          created_at: log.created_at,
          ket: log.ket || '-',
          foto_url: log.foto_url || '',
          items: [],
        });
      }

      const group = monthsMap[monthYear].sjMap.get(sjKey);
      group.items.push(log);
      if ((!group.perusahaan || group.perusahaan === '-') && log.perusahaan && log.perusahaan !== '-') {
        group.perusahaan = log.perusahaan;
      }
      if ((!group.alamat || group.alamat === '-') && log.alamat && log.alamat !== '-') {
        group.alamat = log.alamat;
      }
      if (!group.foto_url && log.foto_url) {
        group.foto_url = log.foto_url;
      }
    });

    return Object.entries(monthsMap).map(([monthName, val]) => ({
      monthName,
      totalItemsCount: val.totalItemsCount,
      sjGroups: Array.from(val.sjMap.values()),
    }));
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
        (item) =>
          item.tipe === 'Barang Keluar' &&
          (item.ket?.includes('[DIPINJAM]') || item.ket?.includes('[PINJAM (DEMO)'))
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

  const currentActiveStatus =
    activeTab === 'masuk' ? sjHeader.status_masuk : sjHeader.status_keluar;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header & Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <img
              src={logoEdan}
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
            kategoriList={kategoriList}
            onRefresh={fetchAllLogsForStock}
            onRefreshKategori={fetchKategori}
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
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        activeTab === 'masuk' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    ></span>
                    Input khusus {activeTab === 'masuk' ? 'Barang Masuk' : 'Barang Keluar'}
                  </h2>

                  <button
                    type="button"
                    onClick={() => setShowManageKatPanel(!showManageKatPanel)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 text-xs font-semibold transition-all"
                  >
                    {showManageKatPanel
                      ? '✕ Tutup Kelola Kategori'
                      : '⚙️ Kelola Kategori & Tipe'}
                  </button>
                </div>

                {/* Panel Kelola Kategori & Tipe Barang (Tambah / Edit / Hapus) */}
                {showManageKatPanel && (
                  <div className="p-4 rounded-xl bg-slate-950/90 border border-indigo-500/30 space-y-4">
                    <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                      Tambah / Edit / Hapus Kategori &amp; Tipe Barang
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        list="existing-kat-app"
                        value={newKatData.kategori}
                        onChange={(e) =>
                          setNewKatData({ ...newKatData, kategori: e.target.value })
                        }
                        placeholder="Nama Kategori (misal: Alat Medis)"
                        className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                      <datalist id="existing-kat-app">
                        {uniqueCategories.map((k) => (
                          <option key={k} value={k} />
                        ))}
                      </datalist>

                      <input
                        type="text"
                        value={newKatData.sub_kategori}
                        onChange={(e) =>
                          setNewKatData({ ...newKatData, sub_kategori: e.target.value })
                        }
                        placeholder="Tipe Barang (misal: Acclarix LX8)"
                        className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      />

                      <button
                        type="button"
                        disabled={savingKat}
                        onClick={handleSaveNewKategori}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-950/50 transition-all"
                      >
                        {savingKat ? 'Menyimpan...' : '+ Tambah Kategori & Tipe'}
                      </button>
                    </div>

                    {kategoriList.length > 0 && (
                      <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800/70">
                        {kategoriList.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-slate-900/70 flex flex-wrap items-center justify-between gap-2 text-xs"
                          >
                            {editingKatId === item.id ? (
                              <div className="flex flex-wrap items-center gap-2 flex-1">
                                <input
                                  type="text"
                                  value={editKatDraft.kategori}
                                  onChange={(e) =>
                                    setEditKatDraft({
                                      ...editKatDraft,
                                      kategori: e.target.value,
                                    })
                                  }
                                  placeholder="Kategori"
                                  className="bg-slate-950 border border-indigo-500 rounded-lg px-3 py-1.5 text-slate-200 text-xs"
                                />
                                <input
                                  type="text"
                                  value={editKatDraft.sub_kategori}
                                  onChange={(e) =>
                                    setEditKatDraft({
                                      ...editKatDraft,
                                      sub_kategori: e.target.value,
                                    })
                                  }
                                  placeholder="Tipe Barang"
                                  className="bg-slate-950 border border-indigo-500 rounded-lg px-3 py-1.5 text-slate-200 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateKat(item.id)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold"
                                >
                                  Simpan
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingKatId(null)}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                                    {item.kategori}
                                  </span>
                                  <span className="text-slate-500">›</span>
                                  <span className="text-slate-200 font-medium">
                                    {item.sub_kategori}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditKat(item)}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg font-medium transition-all"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteKat(item)}
                                    className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg font-medium transition-all"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* SECTION 1: INFO SURAT JALAN (1 SJ UNTUK SEMUA BARANG DI BAWAH) */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        1. Informasi Surat Jalan &amp; Tujuan / Asal
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {activeTab === 'keluar'
                          ? '💡 Ketik/pilih No. SJ Barang Masuk untuk isi otomatis daftar barang & SN'
                          : '1 Surat Jalan berlaku untuk seluruh barang di bawah'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          No. Surat Jalan *
                        </label>
                        <input
                          type="text"
                          required
                          list={activeTab === 'keluar' ? 'incoming-sj-list' : undefined}
                          value={sjHeader.asal}
                          onChange={(e) => handleSJNumberChange(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                          placeholder={
                            activeTab === 'keluar'
                              ? 'Ketik/pilih No. SJ (auto-isi jika ada di Masuk)'
                              : 'Contoh: 736.SJKB.2026.29.10-1'
                          }
                        />
                        {activeTab === 'keluar' && (
                          <datalist id="incoming-sj-list">
                            {Array.from(incomingSJMap.values()).map((sjObj) => (
                              <option
                                key={sjObj.sj}
                                value={sjObj.sj}
                              >{`${sjObj.sj}${sjObj.perusahaan ? ` - ${sjObj.perusahaan}` : ''}`}</option>
                            ))}
                          </datalist>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          PT / Nama Perusahaan
                        </label>
                        <input
                          type="text"
                          value={sjHeader.perusahaan}
                          onChange={(e) =>
                            setSjHeader({ ...sjHeader, perusahaan: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                          placeholder="Contoh: PT. Nusa Medika Indonesia"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Tanggal
                        </label>
                        <input
                          type="date"
                          value={sjHeader.tanggal}
                          onChange={(e) =>
                            setSjHeader({ ...sjHeader, tanggal: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Alamat Perusahaan / Pengiriman
                        </label>
                        <input
                          type="text"
                          value={sjHeader.alamat}
                          onChange={(e) =>
                            setSjHeader({ ...sjHeader, alamat: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                          placeholder="Contoh: Jl. Sudirman No. 45, Jakarta Selatan"
                        />
                      </div>

                      {/* STATUS TRANSAKSI (MASUK MAUPUN KELUAR) */}
                      <div>
                        <label
                          className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                            activeTab === 'masuk' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {activeTab === 'masuk'
                            ? 'Status Transaksi Masuk'
                            : 'Status Transaksi Keluar'}
                        </label>
                        {activeTab === 'masuk' ? (
                          <select
                            value={sjHeader.status_masuk}
                            onChange={(e) =>
                              setSjHeader({
                                ...sjHeader,
                                status_masuk: e.target.value,
                              })
                            }
                            className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-emerald-300 focus:outline-none focus:border-emerald-500 transition-all text-sm font-semibold"
                          >
                            <option value="Stock">🟢 Stock</option>
                            <option value="Pinjam (Demo)">🟡 Pinjam (Demo)</option>
                            <option value="Service">🔧 Service</option>
                          </select>
                        ) : (
                          <select
                            value={sjHeader.status_keluar}
                            onChange={(e) =>
                              setSjHeader({
                                ...sjHeader,
                                status_keluar: e.target.value,
                              })
                            }
                            className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-4 py-2.5 text-amber-300 focus:outline-none focus:border-amber-500 transition-all text-sm font-semibold"
                          >
                            <option value="Penjualan">🔴 Penjualan</option>
                            <option value="Pinjam (Demo)">🟡 Pinjam (Demo)</option>
                            <option value="Service">🔧 Service</option>
                          </select>
                        )}
                      </div>

                      {/* BOX TANGGAL MULAI & SELESAI PINJAM (DEMO) - HANYA DI BARANG KELUAR */}
                      {activeTab === 'keluar' &&
                        sjHeader.status_keluar === 'Pinjam (Demo)' && (
                          <div className="md:col-span-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/30 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">
                                Mulai Pinjam (Demo) *
                              </label>
                              <input
                                type="date"
                                required
                                value={sjHeader.pinjam_mulai}
                                onChange={(e) =>
                                  setSjHeader({
                                    ...sjHeader,
                                    pinjam_mulai: e.target.value,
                                  })
                                }
                                className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-amber-400 text-sm"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">
                                Selesai Pinjam (Demo)
                              </label>
                              <input
                                type="date"
                                value={sjHeader.pinjam_selesai}
                                onChange={(e) =>
                                  setSjHeader({
                                    ...sjHeader,
                                    pinjam_selesai: e.target.value,
                                  })
                                }
                                className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-4 py-2 text-slate-200 focus:outline-none focus:border-amber-400 text-sm"
                              />
                            </div>
                          </div>
                        )}

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Foto Surat Jalan / Barang
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, false)}
                          className="w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                          Keterangan Surat Jalan
                        </label>
                        <input
                          type="text"
                          value={sjHeader.ket}
                          onChange={(e) =>
                            setSjHeader({ ...sjHeader, ket: e.target.value })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                          placeholder={
                            currentActiveStatus === 'Pinjam (Demo)'
                              ? 'Nama peminjam / RS / tujuan demo, dll'
                              : currentActiveStatus === 'Service'
                              ? 'Keluhan unit / teknisi / keterangan service'
                              : 'Catatan atau keterangan tambahan untuk Surat Jalan ini'
                          }
                        />
                      </div>
                    </div>

                    {uploading && (
                      <p className="text-xs text-indigo-400">
                        Mengompres &amp; Uploading foto...
                      </p>
                    )}

                    {fileSizeInfo.original && !uploading && (
                      <div className="text-xs flex items-center gap-2 bg-slate-900/90 p-2 rounded-lg border border-slate-800 w-fit">
                        <span className="text-slate-400">
                          Foto Awal:{' '}
                          <strong className="text-rose-400">
                            {fileSizeInfo.original}
                          </strong>
                        </span>
                        {fileSizeInfo.compressed && (
                          <>
                            <span className="text-slate-600">➔</span>
                            <span className="text-slate-400">
                              Hasil Kompres:{' '}
                              <strong className="text-emerald-400">
                                {fileSizeInfo.compressed}
                              </strong>
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: DAFTAR BARANG & SN (BISA TAMBAH BANYAK BARIS DALAM 1 SJ) */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                        2. Daftar Barang &amp; Serial Number ({itemsList.length} Item)
                      </span>
                      <button
                        type="button"
                        onClick={handleAddItemRow}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-950/40 transition-all flex items-center gap-1.5"
                      >
                        <span>+ Tambah Barang / SN</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {itemsList.map((row, index) => {
                        const rowTipeList = getTipeBarangFor(row.kategori);

                        const filteredAvailableItems =
                          activeTab === 'keluar'
                            ? availableStockSummary.availableItems.filter((it) => {
                                if (
                                  row.kategori &&
                                  it.kategori &&
                                  it.kategori.toLowerCase() !==
                                    row.kategori.toLowerCase()
                                ) {
                                  return false;
                                }
                                if (
                                  row.sub_kategori &&
                                  it.sub_kategori &&
                                  it.sub_kategori.toLowerCase() !==
                                    row.sub_kategori.toLowerCase()
                                ) {
                                  return false;
                                }
                                return true;
                              })
                            : [];

                        const availableSNsForRow =
                          activeTab === 'keluar' && row.nama
                            ? availableStockSummary.availableSNs.filter(
                                (s) =>
                                  s.namaKey === row.nama.trim().toLowerCase()
                              )
                            : [];

                        return (
                          <div
                            key={row.id}
                            className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                          >
                            <div className="md:col-span-2">
                              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                                Kategori #{index + 1}
                              </label>
                              <select
                                value={row.kategori}
                                onChange={(e) =>
                                  handleItemRowChange(row.id, 'kategori', e.target.value)
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                              >
                                <option value="">
                                  {activeTab === 'keluar'
                                    ? '-- Semua Kategori --'
                                    : '-- Kategori --'}
                                </option>
                                {uniqueCategories.map((kat) => (
                                  <option key={kat} value={kat}>
                                    {kat}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                                Tipe Barang
                              </label>
                              <select
                                value={row.sub_kategori}
                                disabled={!row.kategori}
                                onChange={(e) =>
                                  handleItemRowChange(
                                    row.id,
                                    'sub_kategori',
                                    e.target.value
                                  )
                                }
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 disabled:opacity-50 focus:outline-none focus:border-indigo-500"
                              >
                                <option value="">-- Tipe Barang --</option>
                                {rowTipeList.map((tipe) => (
                                  <option key={tipe} value={tipe}>
                                    {tipe}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="md:col-span-3">
                              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                                Nama Barang *
                              </label>
                              {activeTab === 'keluar' ? (
                                <select
                                  required
                                  value={row.nama}
                                  onChange={(e) =>
                                    handleItemRowChange(row.id, 'nama', e.target.value)
                                  }
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                >
                                  <option value="">-- Pilih Nama Barang --</option>
                                  {filteredAvailableItems.map((it) => (
                                    <option key={it.nama} value={it.nama}>
                                      {it.nama}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  required
                                  value={row.nama}
                                  onChange={(e) =>
                                    handleItemRowChange(row.id, 'nama', e.target.value)
                                  }
                                  placeholder="Nama barang"
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                />
                              )}
                            </div>

                            <div className="md:col-span-3">
                              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                                Serial Number (SN)
                              </label>
                              {activeTab === 'keluar' ? (
                                availableSNsForRow.length > 0 ? (
                                  <select
                                    value={row.sn}
                                    onChange={(e) =>
                                      handleItemRowChange(row.id, 'sn', e.target.value)
                                    }
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-indigo-500"
                                  >
                                    <option value="">-- Pilih Serial Number --</option>
                                    {availableSNsForRow.map((snObj) => (
                                      <option key={snObj.sn} value={snObj.sn}>
                                        {snObj.sn}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={row.sn}
                                    onChange={(e) =>
                                      handleItemRowChange(row.id, 'sn', e.target.value)
                                    }
                                    placeholder="Serial Number (opsional)"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-indigo-500"
                                  />
                                )
                              ) : (
                                <input
                                  type="text"
                                  value={row.sn}
                                  onChange={(e) =>
                                    handleItemRowChange(row.id, 'sn', e.target.value)
                                  }
                                  placeholder="SN unik barang ini"
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-indigo-500"
                                />
                              )}
                            </div>

                            <div className="md:col-span-1">
                              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                                Qty *
                              </label>
                              <input
                                type="number"
                                required
                                min="1"
                                value={row.qty}
                                onChange={(e) =>
                                  handleItemRowChange(row.id, 'qty', e.target.value)
                                }
                                placeholder="0"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="md:col-span-1 flex justify-end">
                              <button
                                type="button"
                                disabled={itemsList.length <= 1}
                                onClick={() => handleRemoveItemRow(row.id)}
                                title="Hapus baris barang ini"
                                className="w-full py-2 px-2 rounded-lg bg-rose-500/10 hover:bg-rose-600 disabled:opacity-30 disabled:hover:bg-rose-500/10 text-rose-400 hover:text-white border border-rose-500/20 text-xs font-bold transition-all"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-3.5 px-6 rounded-xl font-semibold text-white shadow-lg transition-all ${
                      currentActiveStatus === 'Pinjam (Demo)'
                        ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/50'
                        : currentActiveStatus === 'Service'
                        ? 'bg-violet-600 hover:bg-violet-500 shadow-violet-950/50'
                        : activeTab === 'masuk'
                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
                        : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                    }`}
                  >
                    Simpan Surat Jalan ({itemsList.length} Barang) — {currentActiveStatus}
                  </button>
                </form>
              </div>
            )}

            {/* Tabel Card (Dikelompokkan per Bulan -> per Surat Jalan) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-200">
                  Riwayat{' '}
                  {activeTab === 'masuk'
                    ? 'Barang Masuk'
                    : 'Barang Keluar & Pinjam (Demo)'}
                </h2>

                <div className="flex flex-wrap items-center gap-3">
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
                      {onlyPinjam ? 'Tampilkan Semua' : 'Hanya Pinjam (Demo)'}
                    </span>
                  </button>

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

                  <select
                    value={selectedKategoriFilter}
                    onChange={(e) => setSelectedKategoriFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">Semua Kategori</option>
                    {uniqueCategories.map((kat) => (
                      <option key={kat} value={kat}>
                        {kat}
                      </option>
                    ))}
                  </select>

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
                    placeholder="Cari SJ / PT / Barang / SN..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 w-full sm:w-56"
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

              {/* LIST RIWAYAT PER BULAN -> PER SURAT JALAN (1 SJ = BANYAK BARANG & SN) */}
              {loading ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  Memuat data...
                </div>
              ) : groupedByMonthAndSJ.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm border border-slate-800 rounded-xl">
                  Belum ada riwayat data
                </div>
              ) : (
                <div className="space-y-8">
                  {groupedByMonthAndSJ.map((monthGroup) => (
                    <div key={monthGroup.monthName} className="space-y-4">
                      <div className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 font-bold text-xs uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                        <span>
                          📅 Bulan: {monthGroup.monthName} ({monthGroup.sjGroups.length}{' '}
                          Surat Jalan • {monthGroup.totalItemsCount} Item)
                        </span>
                      </div>

                      <div className="space-y-4">
                        {monthGroup.sjGroups.map((sjGroup) => {
                          const totalQtySJ = sjGroup.items.reduce(
                            (acc, item) => acc + (Number(item.qty) || 0),
                            0
                          );

                          return (
                            <div
                              key={sjGroup.key}
                              className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden shadow-lg"
                            >
                              <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <span className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono text-xs font-bold">
                                      📄 SJ: {sjGroup.sj}
                                    </span>

                                    {sjGroup.perusahaan && sjGroup.perusahaan !== '-' && (
                                      <span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-bold">
                                        🏢 {sjGroup.perusahaan}
                                      </span>
                                    )}

                                    <span className="text-xs text-slate-400 font-medium">
                                      🗓️ {sjGroup.tanggal}
                                    </span>

                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                                      {sjGroup.items.length} Barang • Total {totalQtySJ}{' '}
                                      Unit
                                    </span>
                                  </div>

                                  {sjGroup.alamat && sjGroup.alamat !== '-' && (
                                    <p className="text-xs text-slate-400">
                                      📍 <span className="text-slate-300">{sjGroup.alamat}</span>
                                    </p>
                                  )}

                                  {sjGroup.ket && sjGroup.ket !== '-' && (
                                    <p className="text-xs text-slate-400">
                                      📝 <span className="text-slate-300">{sjGroup.ket}</span>
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2.5 self-start lg:self-center">
                                  {sjGroup.foto_url && (
                                    <a
                                      href={sjGroup.foto_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-all"
                                      title="Lihat Foto Surat Jalan / Barang"
                                    >
                                      <img
                                        src={sjGroup.foto_url}
                                        alt="Foto SJ"
                                        className="w-6 h-6 object-cover rounded"
                                      />
                                      <span>Lihat Foto</span>
                                    </a>
                                  )}

                                  <button
                                    onClick={() => handlePrintSJGroupPDF(sjGroup)}
                                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5"
                                    title="Cetak Bukti PDF untuk seluruh barang dalam Surat Jalan ini"
                                  >
                                    🖨️ Cetak PDF SJ
                                  </button>
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-300">
                                  <thead className="bg-slate-950/70 text-slate-400 font-semibold uppercase text-[11px] border-b border-slate-800/80">
                                    <tr>
                                      <th className="py-2.5 px-4">Status</th>
                                      <th className="py-2.5 px-4">Kategori</th>
                                      <th className="py-2.5 px-4">Tipe Barang</th>
                                      <th className="py-2.5 px-4">Nama Barang</th>
                                      <th className="py-2.5 px-4">Serial Number (SN)</th>
                                      <th className="py-2.5 px-4 text-emerald-400">
                                        {activeTab === 'masuk' ? 'QTY Masuk' : 'QTY Keluar'}
                                      </th>
                                      {userRole !== 'viewer' && (
                                        <th className="py-2.5 px-4 text-center">Aksi</th>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/50">
                                    {sjGroup.items.map((log) => {
                                      const statusObj = parseStatusFromKet(log);
                                      const isPinjamKeluar =
                                        log.tipe === 'Barang Keluar' &&
                                        statusObj.code === 'pinjam';

                                      return (
                                        <tr
                                          key={log.id}
                                          className="hover:bg-slate-800/30 transition-colors"
                                        >
                                          <td className="py-2.5 px-4">
                                            <div className="flex flex-col items-start gap-1">
                                              <span
                                                className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap border ${statusObj.badgeClass}`}
                                              >
                                                {statusObj.label}
                                              </span>
                                              {statusObj.period && (
                                                <span className="text-[10px] text-amber-300/90 font-mono">
                                                  {statusObj.period}
                                                </span>
                                              )}
                                            </div>
                                          </td>

                                          <td className="py-2.5 px-4">
                                            {log.kategori && log.kategori !== '-' ? (
                                              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold">
                                                {log.kategori}
                                              </span>
                                            ) : (
                                              <span className="text-xs text-slate-600">-</span>
                                            )}
                                          </td>

                                          <td className="py-2.5 px-4">
                                            {log.sub_kategori && log.sub_kategori !== '-' ? (
                                              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200">
                                                {log.sub_kategori}
                                              </span>
                                            ) : (
                                              <span className="text-xs text-slate-600">-</span>
                                            )}
                                          </td>

                                          <td className="py-2.5 px-4 font-semibold text-white">
                                            {log.nama || '-'}
                                          </td>

                                          <td className="py-2.5 px-4 font-mono text-xs text-cyan-400">
                                            {log.sn || '-'}
                                          </td>

                                          <td className="py-2.5 px-4 font-bold text-emerald-400">
                                            {log.qty || 0} Unit
                                          </td>

                                          {userRole !== 'viewer' && (
                                            <td className="py-2.5 px-4 text-center flex items-center justify-center gap-1.5">
                                              {isPinjamKeluar && (
                                                <button
                                                  onClick={() => openReturnModal(log)}
                                                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white rounded-lg text-xs font-medium border border-amber-500/20 transition-all"
                                                  title="Kembalikan Stok Barang Pinjaman"
                                                >
                                                  ↩ Balik
                                                </button>
                                              )}

                                              <button
                                                onClick={() => openEditModal(log)}
                                                className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg text-xs font-medium border border-indigo-500/20 transition-all"
                                                title="Edit Item Ini"
                                              >
                                                ✏️ Edit
                                              </button>

                                              <button
                                                onClick={() => handleDelete(log)}
                                                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg text-xs font-medium border border-rose-500/20 transition-all"
                                              >
                                                Hapus
                                              </button>
                                            </td>
                                          )}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  Edit Item #{editModal.id}
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
                  No. Surat Jalan
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
                  PT / Perusahaan
                </label>
                <input
                  type="text"
                  value={editModal.perusahaan}
                  onChange={(e) =>
                    setEditModal({ ...editModal, perusahaan: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Alamat
                </label>
                <input
                  type="text"
                  value={editModal.alamat}
                  onChange={(e) =>
                    setEditModal({ ...editModal, alamat: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Kategori
                </label>
                <select
                  value={editModal.kategori}
                  onChange={(e) =>
                    setEditModal({
                      ...editModal,
                      kategori: e.target.value,
                      sub_kategori: '',
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                >
                  <option value="">-- Tanpa Kategori --</option>
                  {uniqueCategories.map((kat) => (
                    <option key={kat} value={kat}>
                      {kat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Tipe Barang
                </label>
                <select
                  value={editModal.sub_kategori}
                  disabled={!editModal.kategori}
                  onChange={(e) =>
                    setEditModal({ ...editModal, sub_kategori: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 disabled:opacity-50 focus:outline-none focus:border-indigo-500 text-sm"
                >
                  <option value="">-- Pilih Tipe Barang --</option>
                  {getTipeBarangFor(editModal.kategori).map((tipe) => (
                    <option key={tipe} value={tipe}>
                      {tipe}
                    </option>
                  ))}
                </select>
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

              <div className="md:col-span-2">
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
                <strong className="text-slate-400">Serial Number:</strong>{' '}
                <span className="text-cyan-400 font-mono">
                  {returnModal.log?.sn || '-'}
                </span>
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