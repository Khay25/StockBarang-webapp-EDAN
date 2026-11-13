import React, { useState, useMemo } from 'react';
import {
  Package,
  Download,
  Upload,
  RefreshCw,
  ScrollText,
  LogOut,
  FileSpreadsheet,
  Search,
  Calendar,
  Pencil,
  FileText,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Printer,
  Image as ImageIcon,
  ArrowRight,
} from 'lucide-react';

// ============================================================================
// INITIAL DATA (Pre-populated realistic data matching EDAN & Maqna workflow)
// ============================================================================
const INITIAL_STOCK_MAQNA = [
  {
    id: 'maqna-1',
    namaBarang: 'LX8',
    tipeBarang: 'Ultrasound',
    sn: '3223214',
    qty: 4,
    keterangan: 'LX8 Masuk - Ready Gudang Maqna',
  },
  {
    id: 'maqna-2',
    namaBarang: 'IVD',
    tipeBarang: 'Hematology Analyzer',
    sn: '35234242',
    qty: 8,
    keterangan: 'Supply Batch Q4 EDAN',
  },
  {
    id: 'maqna-3',
    namaBarang: 'iM70',
    tipeBarang: 'Patient Monitor',
    sn: '9981201',
    qty: 3,
    keterangan: 'Dipinjam: RSUD Jakarta (Demo Unit)',
  },
  {
    id: 'maqna-4',
    namaBarang: 'SE-1200 Express',
    tipeBarang: 'ECG Machine',
    sn: '8841209',
    qty: 6,
    keterangan: 'Stok Gudang Utama Maqna',
  },
  {
    id: 'maqna-5',
    namaBarang: 'Acclarix AX3',
    tipeBarang: 'Portable Ultrasound',
    sn: '7710293',
    qty: 0,
    keterangan: 'Stok Habis - Menunggu Restock',
  },
];

const INITIAL_MASUK_LIST = [
  {
    id: 'msk-1',
    tipeTransaksi: 'Barang Masuk',
    asalSj: 'SJ-EDAN/XI/089',
    sn: '35234242',
    namaBarang: 'IVD',
    tipeBarang: 'Hematology Analyzer',
    qty: 8,
    tanggal: '2026-11-13',
    keterangan: 'Supply Batch Q4 EDAN',
    fotoUrl: null,
    fotoName: 'ivd_unit.jpg',
  },
  {
    id: 'msk-2',
    tipeTransaksi: 'Barang Masuk',
    asalSj: 'SJ-EDAN/XI/074',
    sn: '8841209',
    namaBarang: 'SE-1200 Express',
    tipeBarang: 'ECG Machine',
    qty: 6,
    tanggal: '2026-11-05',
    keterangan: 'Stok Gudang Utama Maqna',
    fotoUrl: null,
    fotoName: 'ecg_se1200.jpg',
  },
  {
    id: 'msk-3',
    tipeTransaksi: 'Barang Masuk',
    asalSj: '88HG',
    sn: '3223214',
    namaBarang: 'LX8',
    tipeBarang: 'Ultrasound',
    qty: 4,
    tanggal: '2026-01-01',
    keterangan: 'LX8 Masuk - Ready Gudang Maqna',
    fotoUrl: null,
    fotoName: 'lx8_box.jpg',
  },
];

const INITIAL_KELUAR_LIST = [
  {
    id: 'klr-1',
    tipeTransaksi: 'Barang Keluar',
    tujuan: 'RSUD Jakarta',
    sn: '9981201',
    namaBarang: 'iM70',
    tipeBarang: 'Patient Monitor',
    qty: 3,
    tanggal: '2026-11-10',
    status: 'Dipinjam',
    keterangan: 'Demo Unit Ruang ICU',
  },
  {
    id: 'klr-2',
    tipeTransaksi: 'Barang Keluar',
    tujuan: 'RS Mitra Keluarga',
    sn: '7710293',
    namaBarang: 'Acclarix AX3',
    tipeBarang: 'Portable Ultrasound',
    qty: 2,
    tanggal: '2026-11-02',
    status: 'Keluar / Terjual',
    keterangan: 'Pengiriman PO #4412',
  },
];

const INITIAL_AUDIT_LOGS = [
  {
    id: 'log-1',
    waktu: '2026-11-13 14:20',
    user: 'admin@edan.com',
    aksi: 'BARANG MASUK',
    detail: 'IVD (Hematology Analyzer) +8 Unit -> Sync Stock Maqna',
    sn: '35234242',
  },
  {
    id: 'log-2',
    waktu: '2026-11-10 10:15',
    user: 'staf.gudang@edan.com',
    aksi: 'DIPINJAM',
    detail: 'iM70 (Patient Monitor) -3 Unit ke RSUD Jakarta -> Sync Stock Maqna',
    sn: '9981201',
  },
  {
    id: 'log-3',
    waktu: '2026-11-05 16:05',
    user: 'admin@edan.com',
    aksi: 'BARANG MASUK',
    detail: 'SE-1200 Express (ECG Machine) +6 Unit -> Sync Stock Maqna',
    sn: '8841209',
  },
  {
    id: 'log-4',
    waktu: '2026-01-01 09:30',
    user: 'admin@edan.com',
    aksi: 'BARANG MASUK',
    detail: 'LX8 (Ultrasound) +4 Unit -> Sync Stock Maqna',
    sn: '3223214',
  },
];

// ============================================================================
// HELPER UTILITIES
// ============================================================================
const INDONESIAN_MONTHS = [
  'JANUARI',
  'FEBRUARI',
  'MARET',
  'APRIL',
  'MEI',
  'JUNI',
  'JULI',
  'AGUSTUS',
  'SEPTEMBER',
  'OKTOBER',
  'NOVEMBER',
  'DESEMBER',
];

function getMonthHeaderLabel(yyyyMm) {
  if (!yyyyMm || !yyyyMm.includes('-')) return 'LAINNYA';
  const [year, monthStr] = yyyyMm.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = INDONESIAN_MONTHS[monthIdx] || monthStr;
  return `${monthName} ${year}`;
}

function getMonthNameOnly(yyyyMm) {
  if (!yyyyMm || !yyyyMm.includes('-')) return 'LAINNYA';
  const [, monthStr] = yyyyMm.split('-');
  const monthIdx = parseInt(monthStr, 10) - 1;
  return INDONESIAN_MONTHS[monthIdx] || monthStr;
}

function getNowFormatted() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function getTodayDateISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Kompresi gambar otomatis menggunakan HTML5 Canvas
function compressImageToDataUrl(file, maxWidth = 320, quality = 0.72) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(null);
      img.src = event.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// Export CSV untuk tombol "Export Excel"
function downloadCSV(filename, headers, rows) {
  const escapeCell = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join(
      '\n'
    );
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  // Default active tab: 'masuk' (matching screenshot)
  const [activeTab, setActiveTab] = useState('masuk');
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  // Core Data States
  const [stockMaqna, setStockMaqna] = useState(INITIAL_STOCK_MAQNA);
  const [masukList, setMasukList] = useState(INITIAL_MASUK_LIST);
  const [keluarList, setKeluarList] = useState(INITIAL_KELUAR_LIST);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [recentlySyncedSn, setRecentlySyncedSn] = useState(null);

  // Toast Notification
  const [toast, setToast] = useState(null);
  const triggerToast = (message, type = 'success', jumpToMaqna = false) => {
    setToast({ message, type, jumpToMaqna });
  };

  // --------------------------------------------------------------------------
  // TAB 1 STATE: BARANG MASUK
  // --------------------------------------------------------------------------
  const [masukForm, setMasukForm] = useState({
    asalSj: '',
    sn: '',
    namaBarang: '',
    tipeBarang: '',
    qty: 1,
    tanggal: getTodayDateISO(),
    keterangan: '',
    fotoUrl: null,
    fotoName: '',
  });
  const [masukFilterFrom, setMasukFilterFrom] = useState('');
  const [masukFilterTo, setMasukFilterTo] = useState('');
  const [masukFilterMonth, setMasukFilterMonth] = useState('ALL');
  const [masukSearch, setMasukSearch] = useState('');

  // --------------------------------------------------------------------------
  // TAB 2 STATE: BARANG KELUAR
  // --------------------------------------------------------------------------
  const [keluarForm, setKeluarForm] = useState({
    tujuan: '',
    sn: '',
    namaBarang: '',
    tipeBarang: '',
    qty: 1,
    tanggal: getTodayDateISO(),
    status: 'Keluar / Terjual',
    keterangan: '',
  });
  const [keluarFilterFrom, setKeluarFilterFrom] = useState('');
  const [keluarFilterTo, setKeluarFilterTo] = useState('');
  const [keluarFilterMonth, setKeluarFilterMonth] = useState('ALL');
  const [keluarSearch, setKeluarSearch] = useState('');

  // --------------------------------------------------------------------------
  // TAB 3 STATE: STOCK BARANG MAQNA
  // --------------------------------------------------------------------------
  const [maqnaStockFilter, setMaqnaStockFilter] = useState('ALL'); // 'ALL' | 'AVAILABLE' | 'EMPTY'
  const [maqnaSearch, setMaqnaSearch] = useState('');

  // --------------------------------------------------------------------------
  // TAB 4 STATE: AUDIT LOG
  // --------------------------------------------------------------------------
  const [auditSearch, setAuditSearch] = useState('');

  // --------------------------------------------------------------------------
  // MODALS STATE (Edit, Delete Confirmation, PDF Slip)
  // --------------------------------------------------------------------------
  const [editModal, setEditModal] = useState(null); // { type: 'masuk' | 'keluar', item }
  const [deleteModal, setDeleteModal] = useState(null); // { type: 'masuk' | 'keluar', item }
  const [pdfModal, setPdfModal] = useState(null); // { type: 'masuk' | 'keluar', item }

  // --------------------------------------------------------------------------
  // SUMMARY METRICS (4 KPI Cards directly below Header)
  // --------------------------------------------------------------------------
  const summaryStats = useMemo(() => {
    const totalUniqueItems = stockMaqna.length;
    const currentMonthPrefix = getTodayDateISO().slice(0, 7); // e.g. '2026-11'

    const totalInQty = masukList
      .filter((m) => m.tanggal && m.tanggal.startsWith(currentMonthPrefix))
      .reduce((sum, m) => sum + Number(m.qty || 0), 0);

    const totalOutQty = keluarList
      .filter((k) => k.tanggal && k.tanggal.startsWith(currentMonthPrefix))
      .reduce((sum, k) => sum + Number(k.qty || 0), 0);

    const loanedQty = keluarList
      .filter((k) => k.status === 'Dipinjam')
      .reduce((sum, k) => sum + Number(k.qty || 0), 0);

    return { totalUniqueItems, totalInQty, totalOutQty, loanedQty };
  }, [stockMaqna, masukList, keluarList]);

  // --------------------------------------------------------------------------
  // REAL-TIME SYNC HELPERS FOR STOCK BARANG MAQNA
  // --------------------------------------------------------------------------
  const syncMaqnaAddition = ({ namaBarang, tipeBarang, sn, qtyDelta, keterangan }) => {
    const cleanSn = sn.trim();
    const cleanNama = namaBarang.trim();
    const cleanTipe = (tipeBarang || 'Medical Device').trim();

    setStockMaqna((prev) => {
      const idx = prev.findIndex(
        (item) =>
          item.sn.toLowerCase() === cleanSn.toLowerCase() ||
          (item.namaBarang.toLowerCase() === cleanNama.toLowerCase() &&
            item.tipeBarang.toLowerCase() === cleanTipe.toLowerCase())
      );

      if (idx !== -1) {
        const updated = [...prev];
        const target = updated[idx];
        const nextQty = Math.max(0, Number(target.qty) + Number(qtyDelta));
        updated[idx] = {
          ...target,
          namaBarang: cleanNama || target.namaBarang,
          tipeBarang: cleanTipe || target.tipeBarang,
          sn: cleanSn || target.sn,
          qty: nextQty,
          keterangan: keterangan ? keterangan : target.keterangan,
        };
        return updated;
      }

      return [
        {
          id: `maqna-${Date.now()}`,
          namaBarang: cleanNama,
          tipeBarang: cleanTipe,
          sn: cleanSn,
          qty: Math.max(0, Number(qtyDelta)),
          keterangan: keterangan || 'Stok Masuk Gudang Maqna',
        },
        ...prev,
      ];
    });

    setRecentlySyncedSn(cleanSn);
  };

  const addAuditLog = (aksi, detail, sn) => {
    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        waktu: getNowFormatted(),
        user: 'admin@edan.com',
        aksi,
        detail,
        sn,
      },
      ...prev,
    ]);
  };

  // --------------------------------------------------------------------------
  // HANDLERS: BARANG MASUK
  // --------------------------------------------------------------------------
  const handleMasukPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressedUrl = await compressImageToDataUrl(file);
    setMasukForm((prev) => ({
      ...prev,
      fotoUrl: compressedUrl,
      fotoName: file.name,
    }));
  };

  const handleSaveMasuk = (e) => {
    e.preventDefault();
    const asalSj = masukForm.asalSj.trim() || '-';
    const sn = masukForm.sn.trim();
    const namaBarang = masukForm.namaBarang.trim();
    const tipeBarang = masukForm.tipeBarang.trim() || 'Umum / Medical';
    const qty = parseInt(masukForm.qty, 10);
    const tanggal = masukForm.tanggal || getTodayDateISO();
    const keterangan = masukForm.keterangan.trim() || `${namaBarang} Masuk`;

    if (!sn || !namaBarang) {
      triggerToast('Serial Number (SN) dan Nama Barang wajib diisi!', 'error', false);
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      triggerToast('Quantity Masuk harus lebih dari 0!', 'error', false);
      return;
    }

    const newRecord = {
      id: `msk-${Date.now()}`,
      tipeTransaksi: 'Barang Masuk',
      asalSj,
      sn,
      namaBarang,
      tipeBarang,
      qty,
      tanggal,
      keterangan,
      fotoUrl: masukForm.fotoUrl,
      fotoName: masukForm.fotoName || 'unit.jpg',
    };

    setMasukList((prev) => [newRecord, ...prev]);
    syncMaqnaAddition({
      namaBarang,
      tipeBarang,
      sn,
      qtyDelta: qty,
      keterangan,
    });
    addAuditLog(
      'BARANG MASUK',
      `${namaBarang} (${tipeBarang}) +${qty} Unit (SJ: ${asalSj}) -> Sync Stock Maqna`,
      sn
    );

    setMasukForm({
      asalSj: '',
      sn: '',
      namaBarang: '',
      tipeBarang: '',
      qty: 1,
      tanggal: getTodayDateISO(),
      keterangan: '',
      fotoUrl: null,
      fotoName: '',
    });

    triggerToast(
      `Barang Masuk "${namaBarang}" (+${qty} Unit) tersimpan & otomatis menambah Stock Barang Maqna!`,
      'success',
      true
    );
  };

  // --------------------------------------------------------------------------
  // HANDLERS: BARANG KELUAR
  // --------------------------------------------------------------------------
  const handleSelectSnForKeluar = (snValue) => {
    const matched = stockMaqna.find(
      (item) => item.sn.toLowerCase() === snValue.trim().toLowerCase()
    );
    if (matched) {
      setKeluarForm((prev) => ({
        ...prev,
        sn: matched.sn,
        namaBarang: matched.namaBarang,
        tipeBarang: matched.tipeBarang,
      }));
    } else {
      setKeluarForm((prev) => ({
        ...prev,
        sn: snValue,
      }));
    }
  };

  const matchedStockForKeluar = useMemo(() => {
    if (!keluarForm.sn.trim()) return null;
    return (
      stockMaqna.find(
        (item) => item.sn.toLowerCase() === keluarForm.sn.trim().toLowerCase()
      ) || null
    );
  }, [stockMaqna, keluarForm.sn]);

  const handleSaveKeluar = (e) => {
    e.preventDefault();
    const tujuan = keluarForm.tujuan.trim() || '-';
    const sn = keluarForm.sn.trim();
    const namaBarang = keluarForm.namaBarang.trim();
    const tipeBarang = keluarForm.tipeBarang.trim() || 'Umum / Medical';
    const qty = parseInt(keluarForm.qty, 10);
    const tanggal = keluarForm.tanggal || getTodayDateISO();
    const status = keluarForm.status;
    const keterangan =
      keluarForm.keterangan.trim() || `${status} ke ${tujuan}`;

    if (!sn || !namaBarang) {
      triggerToast('Serial Number (SN) dan Nama Barang wajib diisi!', 'error', false);
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      triggerToast('Quantity Keluar harus lebih dari 0!', 'error', false);
      return;
    }

    const existingItem = stockMaqna.find(
      (item) =>
        item.sn.toLowerCase() === sn.toLowerCase() ||
        (item.namaBarang.toLowerCase() === namaBarang.toLowerCase() &&
          item.tipeBarang.toLowerCase() === tipeBarang.toLowerCase())
    );

    if (!existingItem) {
      triggerToast(
        `Barang dengan SN "${sn}" belum terdaftar di Stock Barang Maqna!`,
        'error',
        false
      );
      return;
    }

    if (qty > existingItem.qty) {
      triggerToast(
        `Stok tidak cukup! Sisa stok "${existingItem.namaBarang}" di Maqna hanya ${existingItem.qty} Unit.`,
        'error',
        false
      );
      return;
    }

    const newKeluarRecord = {
      id: `klr-${Date.now()}`,
      tipeTransaksi: 'Barang Keluar',
      tujuan,
      sn,
      namaBarang,
      tipeBarang,
      qty,
      tanggal,
      status,
      keterangan,
    };

    const sisaSetelahKeluar = existingItem.qty - qty;
    const syncedNote =
      sisaSetelahKeluar === 0
        ? `Stok Habis - Terakhir ${status} (${tujuan})`
        : `${status}: ${tujuan} (${keterangan})`;

    setKeluarList((prev) => [newKeluarRecord, ...prev]);
    syncMaqnaAddition({
      namaBarang,
      tipeBarang,
      sn,
      qtyDelta: -qty,
      keterangan: syncedNote,
    });
    addAuditLog(
      status === 'Dipinjam' ? 'DIPINJAM' : 'BARANG KELUAR',
      `${namaBarang} (${tipeBarang}) -${qty} Unit ke ${tujuan} -> Sync Stock Maqna`,
      sn
    );

    setKeluarForm({
      tujuan: '',
      sn: '',
      namaBarang: '',
      tipeBarang: '',
      qty: 1,
      tanggal: getTodayDateISO(),
      status: 'Keluar / Terjual',
      keterangan: '',
    });

    triggerToast(
      `Barang Keluar "${namaBarang}" (-${qty} Unit) tercatat & Stock Barang Maqna otomatis berkurang!`,
      'warning',
      true
    );
  };

  // --------------------------------------------------------------------------
  // HANDLERS: EDIT & DELETE (WITH AUTOMATIC MAQNA STOCK RE-SYNC)
  // --------------------------------------------------------------------------
  const handleConfirmEdit = (e) => {
    e.preventDefault();
    if (!editModal) return;
    const { type, item } = editModal;

    if (type === 'masuk') {
      const oldRecord = masukList.find((m) => m.id === item.id);
      if (!oldRecord) return;
      const newQty = Math.max(1, parseInt(item.qty, 10) || 1);
      const diff = newQty - oldRecord.qty;

      setMasukList((prev) =>
        prev.map((m) => (m.id === item.id ? { ...item, qty: newQty } : m))
      );
      syncMaqnaAddition({
        namaBarang: item.namaBarang,
        tipeBarang: item.tipeBarang,
        sn: item.sn,
        qtyDelta: diff,
        keterangan: item.keterangan,
      });
      addAuditLog(
        'EDIT MASUK',
        `Edit ${item.namaBarang} (Qty: ${oldRecord.qty} -> ${newQty} Unit) -> Sync Stock Maqna`,
        item.sn
      );
      triggerToast('Data Barang Masuk diperbarui & Stock Maqna disesuaikan!', 'success', true);
    } else if (type === 'keluar') {
      const oldRecord = keluarList.find((k) => k.id === item.id);
      if (!oldRecord) return;
      const newQty = Math.max(1, parseInt(item.qty, 10) || 1);
      const diff = newQty - oldRecord.qty; // jika newQty > oldQty, stok maqna berkurang lagi (-diff)

      setKeluarList((prev) =>
        prev.map((k) => (k.id === item.id ? { ...item, qty: newQty } : k))
      );
      syncMaqnaAddition({
        namaBarang: item.namaBarang,
        tipeBarang: item.tipeBarang,
        sn: item.sn,
        qtyDelta: -diff,
        keterangan: `${item.status}: ${item.tujuan} (${item.keterangan})`,
      });
      addAuditLog(
        'EDIT KELUAR',
        `Edit Keluar ${item.namaBarang} (Qty: ${oldRecord.qty} -> ${newQty} Unit) -> Sync Stock Maqna`,
        item.sn
      );
      triggerToast('Data Barang Keluar diperbarui & Stock Maqna disesuaikan!', 'warning', true);
    }

    setEditModal(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteModal) return;
    const { type, item } = deleteModal;

    if (type === 'masuk') {
      setMasukList((prev) => prev.filter((m) => m.id !== item.id));
      syncMaqnaAddition({
        namaBarang: item.namaBarang,
        tipeBarang: item.tipeBarang,
        sn: item.sn,
        qtyDelta: -item.qty,
        keterangan: `Revisi hapus transaksi masuk (${item.asalSj})`,
      });
      addAuditLog(
        'HAPUS MASUK',
        `Hapus riwayat masuk ${item.namaBarang} (-${item.qty} Unit dari Maqna)`,
        item.sn
      );
      triggerToast(
        `Transaksi dihapus & stok ${item.namaBarang} di Maqna dikurangi ${item.qty} Unit.`,
        'warning',
        true
      );
    } else if (type === 'keluar') {
      setKeluarList((prev) => prev.filter((k) => k.id !== item.id));
      syncMaqnaAddition({
        namaBarang: item.namaBarang,
        tipeBarang: item.tipeBarang,
        sn: item.sn,
        qtyDelta: +item.qty,
        keterangan: `Stok dikembalikan (hapus keluar ${item.tujuan})`,
      });
      addAuditLog(
        'HAPUS KELUAR',
        `Hapus riwayat keluar ${item.namaBarang} (+${item.qty} Unit kembali ke Maqna)`,
        item.sn
      );
      triggerToast(
        `Transaksi dihapus & stok ${item.namaBarang} dikembalikan +${item.qty} Unit ke Maqna.`,
        'success',
        true
      );
    }

    setDeleteModal(null);
  };

  // --------------------------------------------------------------------------
  // FILTERED & GROUPED DATA
  // --------------------------------------------------------------------------
  const availableMasukMonths = useMemo(() => {
    const set = new Set(masukList.map((m) => m.tanggal.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [masukList]);

  const filteredMasukGrouped = useMemo(() => {
    const filtered = masukList.filter((m) => {
      if (masukFilterFrom && m.tanggal < masukFilterFrom) return false;
      if (masukFilterTo && m.tanggal > masukFilterTo) return false;
      if (masukFilterMonth !== 'ALL' && !m.tanggal.startsWith(masukFilterMonth)) return false;
      if (masukSearch.trim()) {
        const q = masukSearch.toLowerCase();
        const match =
          m.namaBarang.toLowerCase().includes(q) ||
          m.sn.toLowerCase().includes(q) ||
          m.asalSj.toLowerCase().includes(q) ||
          m.keterangan.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    const groups = {};
    filtered.forEach((item) => {
      const ym = item.tanggal.slice(0, 7);
      if (!groups[ym]) groups[ym] = [];
      groups[ym].push(item);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [masukList, masukFilterFrom, masukFilterTo, masukFilterMonth, masukSearch]);

  const availableKeluarMonths = useMemo(() => {
    const set = new Set(keluarList.map((k) => k.tanggal.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [keluarList]);

  const filteredKeluarGrouped = useMemo(() => {
    const filtered = keluarList.filter((k) => {
      if (keluarFilterFrom && k.tanggal < keluarFilterFrom) return false;
      if (keluarFilterTo && k.tanggal > keluarFilterTo) return false;
      if (keluarFilterMonth !== 'ALL' && !k.tanggal.startsWith(keluarFilterMonth)) return false;
      if (keluarSearch.trim()) {
        const q = keluarSearch.toLowerCase();
        const match =
          k.namaBarang.toLowerCase().includes(q) ||
          k.sn.toLowerCase().includes(q) ||
          k.tujuan.toLowerCase().includes(q) ||
          k.keterangan.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    const groups = {};
    filtered.forEach((item) => {
      const ym = item.tanggal.slice(0, 7);
      if (!groups[ym]) groups[ym] = [];
      groups[ym].push(item);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [keluarList, keluarFilterFrom, keluarFilterTo, keluarFilterMonth, keluarSearch]);

  const filteredStockMaqna = useMemo(() => {
    return stockMaqna.filter((item) => {
      if (maqnaStockFilter === 'AVAILABLE' && item.qty <= 0) return false;
      if (maqnaStockFilter === 'EMPTY' && item.qty > 0) return false;
      if (maqnaSearch.trim()) {
        const q = maqnaSearch.toLowerCase();
        return (
          item.namaBarang.toLowerCase().includes(q) ||
          item.tipeBarang.toLowerCase().includes(q) ||
          item.sn.toLowerCase().includes(q) ||
          item.keterangan.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [stockMaqna, maqnaStockFilter, maqnaSearch]);

  const filteredAuditLogs = useMemo(() => {
    if (!auditSearch.trim()) return auditLogs;
    const q = auditSearch.toLowerCase();
    return auditLogs.filter(
      (log) =>
        log.user.toLowerCase().includes(q) ||
        log.aksi.toLowerCase().includes(q) ||
        log.detail.toLowerCase().includes(q) ||
        log.sn.toLowerCase().includes(q)
    );
  }, [auditLogs, auditSearch]);

  // Helper untuk badge Mode aktif di bawah judul
  const activeModeMeta = {
    masuk: {
      label: 'Barang Masuk',
      badgeClass: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30',
    },
    keluar: {
      label: 'Barang Keluar',
      badgeClass: 'bg-rose-950/80 text-rose-400 border-rose-500/30',
    },
    maqna: {
      label: 'Stock Barang Maqna',
      badgeClass: 'bg-sky-950/80 text-sky-400 border-sky-500/30',
    },
    audit: {
      label: 'Audit Log',
      badgeClass: 'bg-slate-800/90 text-slate-300 border-slate-600/40',
    },
  }[activeTab];

  // ==========================================================================
  // LOGGED OUT SCREEN
  // ==========================================================================
  if (isLoggedOut) {
    return (
      <div className="min-h-screen bg-[#080d17] text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0f172a] border border-[#1e293b] rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="flex flex-col items-center">
            <svg className="w-12 h-12 text-[#10b981]" viewBox="0 0 48 48" fill="none">
              <path
                d="M6 26H14L19 14L25 34L30 22H42"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[10px] font-extrabold tracking-[0.25em] text-slate-300 mt-1">
              EDAN
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              Stock Barang <span className="text-[#10b981]">EDAN</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Sesi Anda telah berakhir. Silakan login kembali untuk mengakses inventaris Maqna.
            </p>
          </div>
          <button
            onClick={() => setIsLoggedOut(false)}
            className="w-full py-3 px-4 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-sm transition-colors"
          >
            Login Kembali (admin@edan.com)
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================
  return (
    <div className="min-h-screen bg-[#080d17] text-slate-100 font-sans pb-16">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* =================================================================== */}
        {/* 1. TOP HEADER & PILL NAVIGATION                                     */}
        {/* =================================================================== */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left Brand Block */}
          <div className="flex items-center gap-3.5">
            {/* Custom EDAN Medical Pulse Icon */}
            <div className="flex flex-col items-center justify-center select-none">
              <svg className="w-9 h-7 text-[#10b981]" viewBox="0 0 48 34" fill="none">
                <path
                  d="M4 19H12L17 7L23 27L28 15H36L40 19H44"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[9px] font-extrabold tracking-[0.22em] text-slate-200 -mt-0.5">
                EDAN
              </span>
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
                Stock Barang <span className="text-[#10b981]">EDAN</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400">Mode:</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${activeModeMeta.badgeClass}`}
                >
                  {activeModeMeta.label}
                </span>
              </div>
            </div>
          </div>

          {/* Right Pill Navigation + Standalone Logout */}
          <div className="flex flex-wrap items-center gap-2.5">
            <nav
              aria-label="Navigasi Utama"
              className="bg-[#0f172a] border border-slate-800 rounded-2xl sm:rounded-full p-1.5 flex flex-wrap items-center gap-1 shadow-lg"
            >
              {/* Tab 1: Barang Masuk */}
              <button
                onClick={() => setActiveTab('masuk')}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm transition-all ${
                  activeTab === 'masuk'
                    ? 'bg-[#10b981] text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeTab === 'masuk' ? 'bg-white' : 'bg-[#10b981]'
                  }`}
                />
                <span>Barang Masuk</span>
              </button>

              {/* Tab 2: Barang Keluar */}
              <button
                onClick={() => setActiveTab('keluar')}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm transition-all ${
                  activeTab === 'keluar'
                    ? 'bg-[#f43f5e] text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeTab === 'keluar' ? 'bg-white' : 'bg-[#fb7185]'
                  }`}
                />
                <span>Barang Keluar</span>
              </button>

              {/* Tab 3: Stock Barang Maqna */}
              <button
                onClick={() => setActiveTab('maqna')}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm transition-all ${
                  activeTab === 'maqna'
                    ? 'bg-[#0284c7] text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeTab === 'maqna' ? 'bg-white' : 'bg-[#38bdf8]'
                  }`}
                />
                <span>Stock Barang Maqna</span>
              </button>

              {/* Tab 4: Audit Log */}
              <button
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm transition-all ${
                  activeTab === 'audit'
                    ? 'bg-slate-700 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium'
                }`}
              >
                <ScrollText className="w-3.5 h-3.5 text-amber-400" />
                <span>Audit Log</span>
              </button>
            </nav>

            {/* Standalone Logout Pill Button */}
            <button
              onClick={() => setIsLoggedOut(true)}
              className="rounded-full bg-[#0f172a] border border-slate-800 text-rose-400 hover:bg-rose-950/40 px-4 py-2 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* =================================================================== */}
        {/* TOAST NOTIFICATION (With quick jump to Stock Barang Maqna)          */}
        {/* =================================================================== */}
        {toast && (
          <div
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs sm:text-sm ${
              toast.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                : toast.type === 'warning'
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {toast.jumpToMaqna && activeTab !== 'maqna' && (
                <button
                  onClick={() => {
                    setActiveTab('maqna');
                    setToast(null);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#0284c7] hover:bg-sky-500 text-white text-xs font-semibold transition-colors"
                >
                  <span>Lihat Stock Maqna</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => setToast(null)}
                aria-label="Tutup"
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 2. 4 SUMMARY METRIC CARDS                                           */}
        {/* =================================================================== */}
        <section
          aria-label="Ringkasan Stok"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Card 1: TOTAL JENIS BARANG */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                TOTAL JENIS BARANG
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold text-white">
                  {summaryStats.totalUniqueItems}
                </span>
                <span className="text-xs text-slate-400">Items</span>
              </div>
            </div>
          </div>

          {/* Card 2: MASUK (BULAN INI) */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                MASUK (BULAN INI)
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold text-emerald-400">
                  +{summaryStats.totalInQty}
                </span>
                <span className="text-xs text-slate-400">Unit</span>
              </div>
            </div>
          </div>

          {/* Card 3: KELUAR (BULAN INI) */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                KELUAR (BULAN INI)
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold text-rose-400">
                  -{summaryStats.totalOutQty}
                </span>
                <span className="text-xs text-slate-400">Unit</span>
              </div>
            </div>
          </div>

          {/* Card 4: SEDANG DIPINJAM */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                SEDANG DIPINJAM
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold text-amber-400">
                  {summaryStats.loanedQty}
                </span>
                <span className="text-xs text-slate-400">Unit</span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* TAB 1: BARANG MASUK                                                 */}
        {/* =================================================================== */}
        {activeTab === 'masuk' && (
          <div className="space-y-6">
            {/* Form Card: Input khusus Barang Masuk */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2.5 mb-5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span>Input khusus Barang Masuk</span>
              </h2>

              <form onSubmit={handleSaveMasuk} className="space-y-4">
                {/* Row 1: SURAT JALAN / ASAL | SERIAL NUMBER (SN) | NAMA BARANG */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      SURAT JALAN / ASAL
                    </label>
                    <input
                      type="text"
                      value={masukForm.asalSj}
                      onChange={(e) => setMasukForm({ ...masukForm, asalSj: e.target.value })}
                      placeholder="Contoh: SJ-EDAN/XI/099"
                      className="w-full px-3.5 py-2.5 bg-[#080d17] border border-slate-800 focus:border-[#10b981] rounded-lg text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      SERIAL NUMBER (SN)
                    </label>
                    <input
                      type="text"
                      value={masukForm.sn}
                      onChange={(e) => setMasukForm({ ...masukForm, sn: e.target.value })}
                      placeholder="Contoh: 35234242"
                      className="w-full px-3.5 py-2.5 bg-[#080d17] border border-slate-800 focus:border-[#10b981] rounded-lg text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      NAMA BARANG
                    </label>
                    <input
                      type="text"
                      value={masukForm.namaBarang}
                      onChange={(e) =>
                        setMasukForm({ ...masukForm, namaBarang: e.target.value })
                      }
                      placeholder="Contoh: IVD / LX8"
                      className="w-full px-3.5 py-2.5 bg-[#080d17] border border-slate-800 focus:border-[#10b981] rounded-lg text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Row 2: TIPE BARANG | QUANTITY MASUK | TANGGAL | FOTO BARANG (AUTO KOMPRES) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      TIPE BARANG
                    </label>
                    <input
                      type="text"
                      value={masukForm.tipeBarang}
                      onChange={(e) =>
                        setMasukForm({ ...masukForm, tipeBarang: e.target.value })
                      }
                      placeholder="Ultrasound / IVD / Monitor"
                      className="w-full px-3.5 py-2.5 bg-[#080d17] border border-slate-800 focus:border-[#10b981] rounded-lg text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      QUANTITY MASUK
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={masukForm.qty}
                      onChange={(e) => setMasukForm({ ...masukForm, qty: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#080d17] border border-slate-800 focus:border-[#10b981] rounded-lg text-sm text-slate-200 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      TANGGAL
                    </label>
                    <input
                      type="date"
                      value={masukForm.tanggal}
                      onChange={(e) => setMasukForm({ ...masukForm, tanggal: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#080d17] border border-slate-800 focus:border-[#10b981] rounded-lg text-sm text-slate-200 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      FOTO BARANG (AUTO KOMPRES)
                    </label>
                    <label className="flex items-center gap-2.5 w-full px-3 py-2 bg-[#080d17] border border-slate-800 hover:border-slate-700 rounded-lg cursor-pointer transition-colors">
                      <span className="px-2.5 py-1 rounded bg-slate-800 text-xs font-medium text-slate-200 shrink-0">
                        Choose File
                      </span>
                      <span className="text-xs text-slate-400 truncate">
                        {masukForm.fotoName || 'No file chosen'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMasukPhotoChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Row 3: KETERANGAN */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    KETERANGAN
                  </label>
                  <input
                    type="text"
                    value={masukForm.keterangan}
                    onChange={(e) =>
                      setMasukForm({ ...masukForm, keterangan: e.target.value })
                    }
                    placeholder="Catatan kondisi atau keterangan barang masuk..."
                    className="w-full px-3.5 py-2.5 bg-[#080d17] border border-slate-800 focus:border-[#10b981] rounded-lg text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-1">
                  <button
                    type="submit"
                    className="bg-[#10b981] hover:bg-[#059669] text-white font-semibold py-3 rounded-lg w-full text-sm transition-colors shadow-lg shadow-[#10b981]/20"
                  >
                    Simpan Barang Masuk
                  </button>
                </div>
              </form>
            </div>

            {/* History Card: Riwayat Barang Masuk */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 space-y-5">
              {/* Filter Bar */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <h2 className="text-base font-bold text-white">Riwayat Barang Masuk</h2>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() =>
                      downloadCSV(
                        `Riwayat_Barang_Masuk_${getTodayDateISO()}.csv`,
                        [
                          'Tipe',
                          'Asal / SJ',
                          'SN',
                          'Nama Barang',
                          'Tipe Barang',
                          'Qty Masuk',
                          'Tanggal',
                          'Keterangan',
                        ],
                        masukList.map((m) => [
                          m.tipeTransaksi,
                          m.asalSj,
                          m.sn,
                          m.namaBarang,
                          m.tipeBarang,
                          m.qty,
                          m.tanggal,
                          m.keterangan,
                        ])
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export Excel</span>
                  </button>

                  <div className="flex items-center gap-1.5 bg-[#080d17] border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-400">
                    <span>Dari:</span>
                    <input
                      type="date"
                      value={masukFilterFrom}
                      onChange={(e) => setMasukFilterFrom(e.target.value)}
                      className="bg-transparent text-slate-200 outline-none text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#080d17] border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-400">
                    <span>S/D:</span>
                    <input
                      type="date"
                      value={masukFilterTo}
                      onChange={(e) => setMasukFilterTo(e.target.value)}
                      className="bg-transparent text-slate-200 outline-none text-xs"
                    />
                  </div>

                  <select
                    value={masukFilterMonth}
                    onChange={(e) => setMasukFilterMonth(e.target.value)}
                    className="px-3 py-1.5 bg-[#080d17] border border-slate-800 rounded-lg text-xs text-slate-200 outline-none"
                  >
                    <option value="ALL">Semua Bulan</option>
                    {availableMasukMonths.map((ym) => (
                      <option key={ym} value={ym}>
                        {getHeaderMonthOption(ym)}
                      </option>
                    ))}
                  </select>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={masukSearch}
                      onChange={(e) => setMasukSearch(e.target.value)}
                      placeholder="Cari Nama / SN / SJ..."
                      className="pl-8 pr-3 py-1.5 bg-[#080d17] border border-slate-800 focus:border-slate-600 rounded-lg text-xs text-slate-200 placeholder-slate-500 outline-none w-44 sm:w-48"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-3">TIPE</th>
                      <th className="py-3 px-3">ASAL / SJ</th>
                      <th className="py-3 px-3">SN</th>
                      <th className="py-3 px-3">NAMA BARANG</th>
                      <th className="py-3 px-3">QTY MASUK</th>
                      <th className="py-3 px-3">TANGGAL</th>
                      <th className="py-3 px-3">KETERANGAN</th>
                      <th className="py-3 px-3">FOTO</th>
                      <th className="py-3 px-3 text-right">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs sm:text-sm">
                    {filteredMasukGrouped.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-500 text-xs">
                          Tidak ada data riwayat barang masuk yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      filteredMasukGrouped.map(([ym, items]) => (
                        <React.Fragment key={ym}>
                          {/* Month Header Group Row */}
                          <tr className="bg-[#080d17]/60">
                            <td colSpan={9} className="py-2.5 px-3">
                              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#38bdf8]">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>
                                  BULAN: {getMonthNameOnly(ym)} ({items.length} TRANSAKSI)
                                </span>
                              </div>
                            </td>
                          </tr>

                          {/* Items in Month */}
                          {items.map((row) => (
                            <tr
                              key={row.id}
                              className="hover:bg-slate-800/30 transition-colors"
                            >
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  Barang Masuk
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-slate-300 font-medium whitespace-nowrap">
                                {row.asalSj}
                              </td>
                              <td className="py-3.5 px-3 font-mono text-xs text-slate-300 whitespace-nowrap">
                                {row.sn}
                              </td>
                              <td className="py-3.5 px-3">
                                <div className="font-bold text-white">{row.namaBarang}</div>
                                <div className="text-[11px] text-slate-400">{row.tipeBarang}</div>
                              </td>
                              <td className="py-3.5 px-3 font-bold text-emerald-400 whitespace-nowrap">
                                {row.qty} Unit
                              </td>
                              <td className="py-3.5 px-3 text-slate-300 text-xs whitespace-nowrap">
                                {row.tanggal}
                              </td>
                              <td className="py-3.5 px-3 text-slate-300 max-w-[200px] truncate">
                                {row.keterangan}
                              </td>
                              <td className="py-3.5 px-3">
                                {row.fotoUrl ? (
                                  <img
                                    src={row.fotoUrl}
                                    alt={row.namaBarang}
                                    className="w-10 h-10 rounded-lg object-cover border border-slate-700"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-[#080d17] border border-slate-800 flex flex-col items-center justify-center text-slate-500">
                                    <ImageIcon className="w-4 h-4 text-sky-400/70" />
                                    <span className="text-[8px] mt-0.5">IMG</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    onClick={() =>
                                      setEditModal({ type: 'masuk', item: { ...row } })
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => setPdfModal({ type: 'masuk', item: row })}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-semibold transition-colors"
                                  >
                                    <FileText className="w-3 h-3" />
                                    <span>PDF</span>
                                  </button>
                                  <button
                                    onClick={() => setDeleteModal({ type: 'masuk', item: row })}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-900/60 hover:bg-rose-800/80 text-rose-300 text-[11px] font-semibold transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Hapus</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: BARANG KELUAR                                                */}
        {/* =================================================================== */}
        {activeTab === 'keluar' && (
          <div className="space-y-6">
            {/* Form Card: Input khusus Barang Keluar */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2.5 mb-5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#fb7185]" />
                <span>Input khusus Barang Keluar</span>
              </h2>

              <form onSubmit={handleSaveKeluar} className="space-y-4">
                {/* Row 1: TUJUAN / CUSTOMER | SERIAL NUMBER (SN) | NAMA BARANG */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      TUJUAN / CUSTOMER
                    </label>
                    <input
                      type="text"
                      value={keluarForm.tujuan}
                      onChange={(e) =>
                        setKeluarForm({ ...keluarForm, tujuan: e.target.value })
                      }
                      placeholder="Contoh: RSUD Jakarta / Teknisi"
                      className="w-full px-3.5 py-2.5 bg-[#080d17] border border-slate-800 focus:border-[#f43f5e] rounded-lg text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      SERIAL NUMBER (SN) — PILIH / KETIK
                    </label>
                    <input
                      type="text"
                      list="maqna-sn-options"
                      value={keluarForm.sn}
                      onChange={(e) => handleSelectSnForKeluar(e.target.value)}
                      placeholder="Pilih SN dari Stock Maqna..."
                      className="w-full px-3.5 py-2.5 bg-[#080d17] border border-slate-800 focus:border-[#f43f5e] rounded-lg text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                    />
                    <datalist id="maqna-sn-options">
                      {stockMaqna.map((item) => (
                        <option key={item.id} value={item.sn}>
                          {item.namaBarang} ({item.tipeBarang}) - Stok: {item.qty} Unit
                        </option>
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      NAMA BARANG
                    </label>
                    <input
                      type="text"
                      value={keluarForm.namaBarang}
                      onChange={(e) =>
                        setKeluarForm({ ...keluarForm, namaBarang: e.target.value })
                      }
                      placeholder="Otomatis terisi saat SN dipilih"
                      className="w-full px-3.5 py-2.5 bg-[#080d17] border border-slate-800 focus:border-[#f43f5e] rounded-lg text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Row 2: TIPE BARANG | QUANTITY KELUAR | TANGGAL | STATUS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      TIPE BARANG
                    </label>
                    <input
                      type="text"
                      value={keluarForm.tipeBarang}
                      onChange={(e) =>
                        setKeluarForm({ ...keluarForm, tipeBarang: e.target.value })
                      }
                      placeholder="Ultrasound / IVD / Monitor"
                      className="w-full px-3.5 py-2.5 bg-[#080d17] border border-slate-800 focus:border-[#f43f5e] rounded-lg text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      QUANTITY KELUAR{' '}
                      {matchedStockForKeluar && (
                        <span className="text-emerald-400">
                          (Stok: {matchedStockForKeluar.qty})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={matchedStockForKeluar ? matchedStockForKeluar.qty : undefined}
                      value={keluarForm.qty}
                      onChange={(e) => setKeluarForm({ ...keluarForm, qty: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#080d17] border border-slate-800 focus:border-[#f43f5e] rounded-lg text-sm text-slate-200 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      TANGGAL
                    </label>
                    <input
                      type="date"
                      value={keluarForm.tanggal}
                      onChange={(e) =>
                        setKeluarForm({ ...keluarForm, tanggal: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-[#080d17] border border-slate-800 focus:border-[#f43f5e] rounded-lg text-sm text-slate-200 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      STATUS
                    </label>
                    <select
                      value={keluarForm.status}
                      onChange={(e) =>
                        setKeluarForm({ ...keluarForm, status: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-[#080d17] border border-slate-800 focus:border-[#f43f5e] rounded-lg text-sm text-slate-200 outline-none transition-colors"
                    >
                      <option value="Keluar / Terjual">Keluar / Terjual</option>
                      <option value="Dipinjam">Dipinjam</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: KETERANGAN */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    KETERANGAN
                  </label>
                  <input
                    type="text"
                    value={keluarForm.keterangan}
                    onChange={(e) =>
                      setKeluarForm({ ...keluarForm, keterangan: e.target.value })
                    }
                    placeholder="Nomor PO, keterangan demo, atau catatan pengiriman..."
                    className="w-full px-3.5 py-2.5 bg-[#080d17] border border-slate-800 focus:border-[#f43f5e] rounded-lg text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-1">
                  <button
                    type="submit"
                    className="bg-[#f43f5e] hover:bg-rose-600 text-white font-semibold py-3 rounded-lg w-full text-sm transition-colors shadow-lg shadow-[#f43f5e]/20"
                  >
                    Simpan Barang Keluar
                  </button>
                </div>
              </form>
            </div>

            {/* History Card: Riwayat Barang Keluar */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 space-y-5">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <h2 className="text-base font-bold text-white">Riwayat Barang Keluar</h2>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() =>
                      downloadCSV(
                        `Riwayat_Barang_Keluar_${getTodayDateISO()}.csv`,
                        [
                          'Tipe',
                          'Tujuan / Customer',
                          'SN',
                          'Nama Barang',
                          'Tipe Barang',
                          'Qty Keluar',
                          'Status',
                          'Tanggal',
                          'Keterangan',
                        ],
                        keluarList.map((k) => [
                          k.tipeTransaksi,
                          k.tujuan,
                          k.sn,
                          k.namaBarang,
                          k.tipeBarang,
                          k.qty,
                          k.status,
                          k.tanggal,
                          k.keterangan,
                        ])
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export Excel</span>
                  </button>

                  <div className="flex items-center gap-1.5 bg-[#080d17] border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-400">
                    <span>Dari:</span>
                    <input
                      type="date"
                      value={keluarFilterFrom}
                      onChange={(e) => setKeluarFilterFrom(e.target.value)}
                      className="bg-transparent text-slate-200 outline-none text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#080d17] border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-400">
                    <span>S/D:</span>
                    <input
                      type="date"
                      value={keluarFilterTo}
                      onChange={(e) => setKeluarFilterTo(e.target.value)}
                      className="bg-transparent text-slate-200 outline-none text-xs"
                    />
                  </div>

                  <select
                    value={keluarFilterMonth}
                    onChange={(e) => setKeluarFilterMonth(e.target.value)}
                    className="px-3 py-1.5 bg-[#080d17] border border-slate-800 rounded-lg text-xs text-slate-200 outline-none"
                  >
                    <option value="ALL">Semua Bulan</option>
                    {availableKeluarMonths.map((ym) => (
                      <option key={ym} value={ym}>
                        {getHeaderMonthOption(ym)}
                      </option>
                    ))}
                  </select>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={keluarSearch}
                      onChange={(e) => setKeluarSearch(e.target.value)}
                      placeholder="Cari Nama / SN / Tujuan..."
                      className="pl-8 pr-3 py-1.5 bg-[#080d17] border border-slate-800 focus:border-slate-600 rounded-lg text-xs text-slate-200 placeholder-slate-500 outline-none w-44 sm:w-48"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-3">TIPE</th>
                      <th className="py-3 px-3">TUJUAN</th>
                      <th className="py-3 px-3">SN</th>
                      <th className="py-3 px-3">NAMA BARANG</th>
                      <th className="py-3 px-3">QTY KELUAR</th>
                      <th className="py-3 px-3">STATUS</th>
                      <th className="py-3 px-3">TANGGAL</th>
                      <th className="py-3 px-3">KETERANGAN</th>
                      <th className="py-3 px-3 text-right">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs sm:text-sm">
                    {filteredKeluarGrouped.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-500 text-xs">
                          Tidak ada data riwayat barang keluar yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      filteredKeluarGrouped.map(([ym, items]) => (
                        <React.Fragment key={ym}>
                          <tr className="bg-[#080d17]/60">
                            <td colSpan={9} className="py-2.5 px-3">
                              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#38bdf8]">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>
                                  BULAN: {getMonthNameOnly(ym)} ({items.length} TRANSAKSI)
                                </span>
                              </div>
                            </td>
                          </tr>

                          {items.map((row) => (
                            <tr
                              key={row.id}
                              className="hover:bg-slate-800/30 transition-colors"
                            >
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                  Barang Keluar
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-slate-300 font-medium whitespace-nowrap">
                                {row.tujuan}
                              </td>
                              <td className="py-3.5 px-3 font-mono text-xs text-slate-300 whitespace-nowrap">
                                {row.sn}
                              </td>
                              <td className="py-3.5 px-3">
                                <div className="font-bold text-white">{row.namaBarang}</div>
                                <div className="text-[11px] text-slate-400">{row.tipeBarang}</div>
                              </td>
                              <td className="py-3.5 px-3 font-bold text-rose-400 whitespace-nowrap">
                                -{row.qty} Unit
                              </td>
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                {row.status === 'Dipinjam' ? (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                    Dipinjam
                                  </span>
                                ) : (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                    Keluar / Terjual
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-slate-300 text-xs whitespace-nowrap">
                                {row.tanggal}
                              </td>
                              <td className="py-3.5 px-3 text-slate-300 max-w-[200px] truncate">
                                {row.keterangan}
                              </td>
                              <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    onClick={() =>
                                      setEditModal({ type: 'keluar', item: { ...row } })
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => setPdfModal({ type: 'keluar', item: row })}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-semibold transition-colors"
                                  >
                                    <FileText className="w-3 h-3" />
                                    <span>PDF</span>
                                  </button>
                                  <button
                                    onClick={() => setDeleteModal({ type: 'keluar', item: row })}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-900/60 hover:bg-rose-800/80 text-rose-300 text-[11px] font-semibold transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Hapus</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: STOCK BARANG MAQNA (5 COLUMNS REAL-TIME SYNCED TABLE)        */}
        {/* =================================================================== */}
        {activeTab === 'maqna' && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 space-y-5">
            {/* Header Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                <h2 className="text-base font-bold text-white">Stock Barang Maqna</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-[#38bdf8] border border-sky-500/30">
                  Auto-Sync Real-Time
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() =>
                    downloadCSV(
                      `Stock_Barang_Maqna_${getTodayDateISO()}.csv`,
                      ['Nama Barang', 'Tipe Barang', 'SN', 'Qty', 'Keterangan'],
                      stockMaqna.map((s) => [
                        s.namaBarang,
                        s.tipeBarang,
                        s.sn,
                        `${s.qty} Unit`,
                        s.keterangan,
                      ])
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>

                <select
                  value={maqnaStockFilter}
                  onChange={(e) => setMaqnaStockFilter(e.target.value)}
                  className="px-3 py-1.5 bg-[#080d17] border border-slate-800 rounded-lg text-xs text-slate-200 outline-none"
                >
                  <option value="ALL">Semua Stok ({stockMaqna.length})</option>
                  <option value="AVAILABLE">Tersedia (&gt;0)</option>
                  <option value="EMPTY">Stok Habis (0)</option>
                </select>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={maqnaSearch}
                    onChange={(e) => setMaqnaSearch(e.target.value)}
                    placeholder="Cari Nama / Tipe / SN..."
                    className="pl-8 pr-3 py-1.5 bg-[#080d17] border border-slate-800 focus:border-slate-600 rounded-lg text-xs text-slate-200 placeholder-slate-500 outline-none w-48 sm:w-56"
                  />
                </div>
              </div>
            </div>

            {/* 5-Column Stock Barang Maqna Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4">NAMA BARANG</th>
                    <th className="py-3.5 px-4">TIPE BARANG</th>
                    <th className="py-3.5 px-4">SN</th>
                    <th className="py-3.5 px-4">QTY</th>
                    <th className="py-3.5 px-4">KETERANGAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs sm:text-sm">
                  {filteredStockMaqna.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500 text-xs">
                        Tidak ada item di Stock Barang Maqna yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStockMaqna.map((item) => {
                      const isJustSynced =
                        recentlySyncedSn &&
                        item.sn.toLowerCase() === recentlySyncedSn.toLowerCase();
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isJustSynced
                              ? 'bg-sky-500/10 hover:bg-sky-500/15'
                              : 'hover:bg-slate-800/30'
                          }`}
                        >
                          {/* 1. NAMA BARANG */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{item.namaBarang}</span>
                              {isJustSynced && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-[#38bdf8] border border-sky-400/30">
                                  Updated
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 2. TIPE BARANG */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-500/10 text-[#38bdf8] border border-sky-500/25">
                              {item.tipeBarang}
                            </span>
                          </td>

                          {/* 3. SN */}
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-200 whitespace-nowrap">
                            {item.sn}
                          </td>

                          {/* 4. QTY */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {item.qty > 0 ? (
                              <span className="font-bold text-emerald-400">
                                {item.qty} Unit
                              </span>
                            ) : (
                              <span className="font-bold text-rose-400">0 Unit</span>
                            )}
                          </td>

                          {/* 5. KETERANGAN */}
                          <td className="py-3.5 px-4 text-slate-300">{item.keterangan}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: AUDIT LOG                                                    */}
        {/* =================================================================== */}
        {activeTab === 'audit' && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <ScrollText className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-bold text-white">
                  Audit Log Aktivitas & Sinkronisasi Maqna
                </h2>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Cari user, aksi, atau SN..."
                  className="pl-8 pr-3 py-1.5 bg-[#080d17] border border-slate-800 focus:border-slate-600 rounded-lg text-xs text-slate-200 placeholder-slate-500 outline-none w-56"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4">WAKTU</th>
                    <th className="py-3.5 px-4">USER</th>
                    <th className="py-3.5 px-4">AKSI</th>
                    <th className="py-3.5 px-4">DETAIL TRANSAKSI</th>
                    <th className="py-3.5 px-4">SN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs sm:text-sm">
                  {filteredAuditLogs.map((log) => {
                    const isPositive =
                      log.aksi.includes('MASUK') && !log.aksi.includes('HAPUS');
                    const isLoan = log.aksi.includes('DIPINJAM');
                    return (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                          {log.waktu}
                        </td>
                        <td className="py-3.5 px-4 text-slate-200 font-medium whitespace-nowrap">
                          {log.user}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              isPositive
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : isLoan
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {log.aksi}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">{log.detail}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                          {log.sn}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: EDIT TRANSAKSI (AUTO RE-SYNC TO STOCK MAQNA)                 */}
      {/* ===================================================================== */}
      {editModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Edit {editModal.type === 'masuk' ? 'Barang Masuk' : 'Barang Keluar'}
              </h3>
              <button
                onClick={() => setEditModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    {editModal.type === 'masuk' ? 'ASAL / SURAT JALAN' : 'TUJUAN / CUSTOMER'}
                  </label>
                  <input
                    type="text"
                    value={
                      editModal.type === 'masuk'
                        ? editModal.item.asalSj
                        : editModal.item.tujuan
                    }
                    onChange={(e) =>
                      setEditModal({
                        ...editModal,
                        item:
                          editModal.type === 'masuk'
                            ? { ...editModal.item, asalSj: e.target.value }
                            : { ...editModal.item, tujuan: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-[#080d17] border border-slate-800 rounded-lg text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    SERIAL NUMBER (SN)
                  </label>
                  <input
                    type="text"
                    value={editModal.item.sn}
                    onChange={(e) =>
                      setEditModal({
                        ...editModal,
                        item: { ...editModal.item, sn: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-[#080d17] border border-slate-800 rounded-lg text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    NAMA BARANG
                  </label>
                  <input
                    type="text"
                    value={editModal.item.namaBarang}
                    onChange={(e) =>
                      setEditModal({
                        ...editModal,
                        item: { ...editModal.item, namaBarang: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-[#080d17] border border-slate-800 rounded-lg text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    QUANTITY (UNIT)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editModal.item.qty}
                    onChange={(e) =>
                      setEditModal({
                        ...editModal,
                        item: { ...editModal.item, qty: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-[#080d17] border border-slate-800 rounded-lg text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  KETERANGAN
                </label>
                <input
                  type="text"
                  value={editModal.item.keterangan}
                  onChange={(e) =>
                    setEditModal({
                      ...editModal,
                      item: { ...editModal.item, keterangan: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-[#080d17] border border-slate-800 rounded-lg text-sm text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#10b981] hover:bg-[#059669] text-xs font-semibold text-white"
                >
                  Simpan Perubahan & Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: KONFIRMASI HAPUS (CUSTOM MODAL — NO window.confirm)          */}
      {/* ===================================================================== */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Hapus Riwayat Transaksi?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Anda akan menghapus transaksi{' '}
              <span className="font-bold text-white">{deleteModal.item.namaBarang}</span> (SN:{' '}
              <span className="font-mono text-sky-400">{deleteModal.item.sn}</span>,{' '}
              {deleteModal.item.qty} Unit). Jumlah stok di{' '}
              <span className="text-[#38bdf8] font-semibold">Stock Barang Maqna</span> akan
              otomatis disesuaikan kembali.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-[#f43f5e] hover:bg-rose-600 text-xs font-semibold text-white"
              >
                Ya, Hapus & Sync Maqna
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: PREVIEW BUKTI PDF / SURAT JALAN                              */}
      {/* ===================================================================== */}
      {pdfModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#10b981]" />
                <h3 className="text-sm font-bold text-white">
                  Bukti Transaksi Inventaris EDAN
                </h3>
              </div>
              <button
                onClick={() => setPdfModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#080d17] border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Perusahaan:</span>
                <span className="font-bold text-white">PT Nusantara Medcare Indonesia</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jenis Transaksi:</span>
                <span className="font-semibold text-emerald-400">
                  {pdfModal.item.tipeTransaksi}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">
                  {pdfModal.type === 'masuk' ? 'Asal / SJ:' : 'Tujuan:'}
                </span>
                <span className="text-slate-200">
                  {pdfModal.type === 'masuk' ? pdfModal.item.asalSj : pdfModal.item.tujuan}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nama & Tipe Barang:</span>
                <span className="font-bold text-white">
                  {pdfModal.item.namaBarang} ({pdfModal.item.tipeBarang})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Serial Number (SN):</span>
                <span className="font-mono text-sky-400">{pdfModal.item.sn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Quantity:</span>
                <span className="font-bold text-white">{pdfModal.item.qty} Unit</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tanggal:</span>
                <span className="text-slate-200">{pdfModal.item.tanggal}</span>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 block mb-1">Keterangan:</span>
                <span className="text-slate-200">{pdfModal.item.keterangan}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setPdfModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#10b981] hover:bg-[#059669] text-xs font-semibold text-white"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / Save PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}