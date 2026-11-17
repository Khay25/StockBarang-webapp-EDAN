import React, { useState, useMemo } from 'react';
import { supabase } from './supabaseClient';

export default function StockMaqna({
  transaksi = [],
  kategoriList = [],
  onRefresh,
  onRefreshKategori,
  onRecordAudit,
  isReadOnly = false,
}) {
  const [formData, setFormData] = useState({
    kategori: '',
    sub_kategori: '',
    nama: '',
    sn: '',
    qty: '',
    ket: '',
  });

  const [submitting, setSubmitting] = useState(false);

  // State kelola Kategori & Tipe Barang
  const [showManageKatPanel, setShowManageKatPanel] = useState(false);
  const [newKatData, setNewKatData] = useState({ kategori: '', sub_kategori: '' });
  const [editingKatId, setEditingKatId] = useState(null);
  const [editKatDraft, setEditKatDraft] = useState({ kategori: '', sub_kategori: '' });
  const [savingKat, setSavingKat] = useState(false);

  // State Filter Tabel
  const [search, setSearch] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'ready' | 'empty'

  // State Modal Alert / Konfirmasi Hapus
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
  });

  // State Modal Edit Item Stock Maqna
  const [editItemModal, setEditItemModal] = useState({
    isOpen: false,
    item: null,
    kategori: '',
    sub_kategori: '',
    nama: '',
    sn: '',
    qty: 0,
    ket: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

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

  // Daftar Kategori & Tipe Barang unik
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

  // --- KELOLA KATEGORI & TIPE BARANG ---
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
      setFormData((prev) => ({ ...prev, kategori: kat, sub_kategori: tipe }));
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
      if (onRecordAudit) {
        await onRecordAudit('TAMBAH', `Menambah Kategori & Tipe: ${kat} > ${tipe}`);
      }
      if (onRefreshKategori) await onRefreshKategori();
      setFormData((prev) => ({ ...prev, kategori: kat, sub_kategori: tipe }));
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
      if (onRecordAudit) {
        await onRecordAudit('EDIT', `Mengedit Kategori #${id} menjadi: ${kat} > ${tipe}`);
      }
      setEditingKatId(null);
      if (onRefreshKategori) await onRefreshKategori();
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
          if (onRecordAudit) {
            await onRecordAudit(
              'HAPUS',
              `Menghapus Kategori: ${item.kategori} > ${item.sub_kategori}`
            );
          }
          if (onRefreshKategori) await onRefreshKategori();
          showAlert('Terhapus', 'Kategori & Tipe Barang berhasil dihapus.', 'success');
        }
      }
    );
  };

  // --- SUBMIT INPUT MANUAL STOCK MAQNA ---
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    const namaTrim = formData.nama.trim();
    const qtyNum = parseInt(formData.qty, 10) || 0;

    if (!namaTrim || qtyNum <= 0) {
      showAlert('Data Belum Lengkap', 'Nama Barang dan Quantity (> 0) wajib diisi!', 'danger');
      return;
    }

    setSubmitting(true);
    const today = new Date().toISOString().split('T')[0];

    const newEntry = {
      tipe: 'Barang Masuk',
      asal: 'Input Manual Stock Maqna',
      perusahaan: '-',
      alamat: '-',
      kategori: formData.kategori || '-',
      sub_kategori: formData.sub_kategori || '-',
      nama: namaTrim,
      sn: formData.sn.trim(),
      qty: qtyNum,
      tanggal: today,
      ket: formData.ket.trim() || 'Input awal Stock Barang Maqna',
      foto_url: '',
    };

    const { error } = await supabase.from('stok_barang').insert([newEntry]);

    if (error) {
      showAlert('Gagal Menyimpan', error.message, 'danger');
    } else {
      if (onRecordAudit) {
        await onRecordAudit(
          'TAMBAH',
          `Menambah Stock Maqna: "${namaTrim}" (${qtyNum} Unit${
            newEntry.sn ? `, SN: ${newEntry.sn}` : ''
          })`
        );
      }

      setFormData({
        kategori: '',
        sub_kategori: '',
        nama: '',
        sn: '',
        qty: '',
        ket: '',
      });

      if (onRefresh) await onRefresh();
      showAlert('Berhasil Disimpan', `"${namaTrim}" (${qtyNum} Unit) ditambahkan ke Stock Maqna!`, 'success');
    }

    setSubmitting(false);
  };

  // --- REKAP STOK REAL-TIME (GABUNGAN INPUT MANUAL + BARANG MASUK - BARANG KELUAR) ---
  const stockSummaryList = useMemo(() => {
    const map = new Map();

    transaksi.forEach((log) => {
      const namaRaw = (log.nama || '').trim();
      if (!namaRaw) return;

      const snRaw = (log.sn || '').trim();
      const key = `${namaRaw.toLowerCase()}__${snRaw.toLowerCase()}`;
      const qty = Number(log.qty) || 0;
      const isMasuk = log.tipe === 'Barang Masuk';

      if (!map.has(key)) {
        map.set(key, {
          key,
          kategori: log.kategori && log.kategori !== '-' ? log.kategori : '-',
          sub_kategori:
            log.sub_kategori && log.sub_kategori !== '-' ? log.sub_kategori : '-',
          nama: namaRaw,
          sn: snRaw || '-',
          qty: 0,
          ket: log.ket || '-',
          lastUpdated: log.tanggal || '',
          relatedIds: [],
        });
      }

      const item = map.get(key);
      if (log.id) item.relatedIds.push(log.id);
      item.qty += isMasuk ? qty : -qty;

      if (log.kategori && log.kategori !== '-') item.kategori = log.kategori;
      if (log.sub_kategori && log.sub_kategori !== '-') {
        item.sub_kategori = log.sub_kategori;
      }
      if (log.ket && log.ket !== '-') {
        item.ket = log.ket;
      }
      if (log.tanggal && log.tanggal >= item.lastUpdated) {
        item.lastUpdated = log.tanggal;
      }
    });

    return Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [transaksi]);

  // --- EDIT BARIS STOCK MAQNA ---
  const openEditItemModal = (item) => {
    setEditItemModal({
      isOpen: true,
      item,
      kategori: item.kategori && item.kategori !== '-' ? item.kategori : '',
      sub_kategori:
        item.sub_kategori && item.sub_kategori !== '-' ? item.sub_kategori : '',
      nama: item.nama || '',
      sn: item.sn && item.sn !== '-' ? item.sn : '',
      qty: item.qty ?? 0,
      ket: item.ket && item.ket !== '-' ? item.ket : '',
    });
  };

  const handleSaveEditItem = async () => {
    const oldItem = editItemModal.item;
    if (!oldItem) return;

    const newNama = editItemModal.nama.trim();
    const newSn = editItemModal.sn.trim();
    const newKat = editItemModal.kategori || '-';
    const newSubKat = editItemModal.sub_kategori || '-';
    const newQty = parseInt(editItemModal.qty, 10);
    const newKet = editItemModal.ket.trim() || '-';

    if (!newNama || isNaN(newQty) || newQty < 0) {
      showAlert('Data Tidak Valid', 'Nama Barang wajib diisi dan Qty minimal 0!', 'danger');
      return;
    }

    setSavingEdit(true);

    try {
      // 1. Update metadata (kategori, tipe, nama, sn, ket) pada seluruh log transaksi item ini
      if (oldItem.relatedIds && oldItem.relatedIds.length > 0) {
        const { error: updateMetaError } = await supabase
          .from('stok_barang')
          .update({
            kategori: newKat,
            sub_kategori: newSubKat,
            nama: newNama,
            sn: newSn,
            ket: newKet,
          })
          .in('id', oldItem.relatedIds);

        if (updateMetaError) {
          throw updateMetaError;
        }
      }

      // 2. Jika Qty berubah, tambahkan transaksi penyesuaian otomatis agar saldo akhir sesuai
      const diffQty = newQty - (Number(oldItem.qty) || 0);
      if (diffQty !== 0) {
        const today = new Date().toISOString().split('T')[0];
        const adjustmentEntry = {
          tipe: diffQty > 0 ? 'Barang Masuk' : 'Barang Keluar',
          asal: 'Penyesuaian Stock Maqna',
          perusahaan: '-',
          alamat: '-',
          kategori: newKat,
          sub_kategori: newSubKat,
          nama: newNama,
          sn: newSn,
          qty: Math.abs(diffQty),
          tanggal: today,
          ket: newKet !== '-' ? newKet : `Penyesuaian stok menjadi ${newQty} Unit`,
          foto_url: '',
        };

        const { error: adjError } = await supabase
          .from('stok_barang')
          .insert([adjustmentEntry]);

        if (adjError) {
          throw adjError;
        }
      }

      if (onRecordAudit) {
        await onRecordAudit(
          'EDIT',
          `Mengedit Stock Maqna: "${oldItem.nama}" -> "${newNama}" (Qty: ${oldItem.qty} -> ${newQty} Unit, SN: ${newSn || '-'})`
        );
      }

      setEditItemModal({
        isOpen: false,
        item: null,
        kategori: '',
        sub_kategori: '',
        nama: '',
        sn: '',
        qty: 0,
        ket: '',
      });

      if (onRefresh) await onRefresh();
      showAlert('Berhasil Diedit', `Data "${newNama}" berhasil diperbarui!`, 'success');
    } catch (err) {
      showAlert('Gagal Edit Data', err.message, 'danger');
    }

    setSavingEdit(false);
  };

  // --- HAPUS BARIS STOCK MAQNA ---
  const handleDeleteItem = (item) => {
    showConfirm(
      'Hapus Barang dari Stock Maqna?',
      `Yakin ingin menghapus "${item.nama}" (SN: ${item.sn || '-'}) beserta seluruh catatan stoknya?`,
      async () => {
        if (!item.relatedIds || item.relatedIds.length === 0) return;

        const { error } = await supabase
          .from('stok_barang')
          .delete()
          .in('id', item.relatedIds);

        if (error) {
          showAlert('Gagal Menghapus', error.message, 'danger');
        } else {
          if (onRecordAudit) {
            await onRecordAudit(
              'HAPUS',
              `Menghapus Stock Maqna: "${item.nama}" (${item.qty} Unit, SN: ${item.sn || '-'})`
            );
          }

          if (onRefresh) await onRefresh();
          showAlert('Terhapus', `"${item.nama}" berhasil dihapus dari Stock Maqna.`, 'success');
        }
      }
    );
  };

  // Filter Tabel
  const filteredStock = useMemo(() => {
    return stockSummaryList.filter((item) => {
      const keyword = search.toLowerCase();
      const matchSearch =
        item.nama.toLowerCase().includes(keyword) ||
        item.kategori.toLowerCase().includes(keyword) ||
        item.sub_kategori.toLowerCase().includes(keyword) ||
        item.sn.toLowerCase().includes(keyword) ||
        item.ket.toLowerCase().includes(keyword);

      const matchKategori =
        selectedKategori === 'all' || item.kategori === selectedKategori;

      let matchStock = true;
      if (stockFilter === 'ready') matchStock = item.qty > 0;
      if (stockFilter === 'empty') matchStock = item.qty <= 0;

      return matchSearch && matchKategori && matchStock;
    });
  }, [stockSummaryList, search, selectedKategori, stockFilter]);

  const totalUnitTersedia = useMemo(() => {
    return filteredStock.reduce((sum, item) => sum + (item.qty > 0 ? item.qty : 0), 0);
  }, [filteredStock]);

  // Export CSV / Excel
  const handleExportCSV = () => {
    if (filteredStock.length === 0) {
      showAlert('Data Kosong', 'Tidak ada data stok untuk diexport.', 'danger');
      return;
    }

    const headers = [
      'No',
      'Kategori',
      'Tipe Barang',
      'Nama Barang',
      'Serial Number (SN)',
      'Qty Tersedia',
      'Keterangan',
    ];

    const rows = filteredStock.map((item, idx) => [
      idx + 1,
      `"${(item.kategori || '-').replace(/"/g, '""')}"`,
      `"${(item.sub_kategori || '-').replace(/"/g, '""')}"`,
      `"${(item.nama || '-').replace(/"/g, '""')}"`,
      `"${(item.sn || '-').replace(/"/g, '""')}"`,
      item.qty,
      `"${(item.ket || '-').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute(
      'download',
      `Stock_Barang_Maqna_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formTipeList = getTipeBarangFor(formData.kategori);
  const editTipeList = getTipeBarangFor(editItemModal.kategori);

  return (
    <div className="space-y-8">
      {/* FORM INPUT MANUAL STOCK BARANG MAQNA */}
      {!isReadOnly && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
                Input Manual Stock Barang Maqna
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Tambahkan stok awal atau barang baru. Stok akan otomatis bertambah/berkurang saat ada transaksi di tab Barang Masuk &amp; Barang Keluar.
              </p>
            </div>

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

          {/* Panel Kelola Kategori & Tipe Barang */}
          {showManageKatPanel && (
            <div className="p-4 rounded-xl bg-slate-950/90 border border-indigo-500/30 space-y-4">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                Tambah / Edit / Hapus Kategori &amp; Tipe Barang
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  list="existing-kat-maqna"
                  value={newKatData.kategori}
                  onChange={(e) =>
                    setNewKatData({ ...newKatData, kategori: e.target.value })
                  }
                  placeholder="Nama Kategori (misal: Alat Medis)"
                  className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <datalist id="existing-kat-maqna">
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

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Kategori
                </label>
                <select
                  value={formData.kategori}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      kategori: e.target.value,
                      sub_kategori: '',
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 text-sm"
                >
                  <option value="">-- Pilih Kategori --</option>
                  {uniqueCategories.map((kat) => (
                    <option key={kat} value={kat}>
                      {kat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Tipe Barang
                </label>
                <select
                  value={formData.sub_kategori}
                  disabled={!formData.kategori}
                  onChange={(e) =>
                    setFormData({ ...formData, sub_kategori: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 disabled:opacity-50 focus:outline-none focus:border-cyan-500 text-sm"
                >
                  <option value="">-- Pilih Tipe Barang --</option>
                  {formTipeList.map((tipe) => (
                    <option key={tipe} value={tipe}>
                      {tipe}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Barang *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                  placeholder="Contoh: USG Acclarix LX8"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Serial Number (SN)
                </label>
                <input
                  type="text"
                  value={formData.sn}
                  onChange={(e) =>
                    setFormData({ ...formData, sn: e.target.value })
                  }
                  placeholder="Contoh: SN12345678"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Quantity (Qty) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.qty}
                  onChange={(e) =>
                    setFormData({ ...formData, qty: e.target.value })
                  }
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Keterangan
                </label>
                <input
                  type="text"
                  value={formData.ket}
                  onChange={(e) =>
                    setFormData({ ...formData, ket: e.target.value })
                  }
                  placeholder="Catatan atau keterangan tambahan"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-950/50 transition-all"
            >
              {submitting ? 'Menyimpan...' : '+ Tambah Stock Maqna'}
            </button>
          </form>
        </div>
      )}

      {/* TABEL DAFTAR STOCK BARANG MAQNA */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-white">
                📦 Stock Barang Maqna
              </h2>
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold">
                {filteredStock.length} Jenis • {totalUnitTersedia} Unit Tersedia
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Otomatis sinkron dari input manual maupun transaksi Barang Masuk &amp; Barang Keluar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all"
            >
              Export Excel
            </button>

            <select
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Semua Kategori</option>
              {uniqueCategories.map((kat) => (
                <option key={kat} value={kat}>
                  {kat}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Semua Stok</option>
              <option value="ready">Tersedia (&gt; 0)</option>
              <option value="empty">Habis (0)</option>
            </select>

            <input
              type="text"
              placeholder="Cari Nama / Kategori / Tipe / SN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-full sm:w-60"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-xs border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Tipe Barang</th>
                <th className="py-3.5 px-4">Nama Barang</th>
                <th className="py-3.5 px-4">SN</th>
                <th className="py-3.5 px-4">Qty</th>
                <th className="py-3.5 px-4">Keterangan</th>
                {!isReadOnly && (
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStock.length === 0 ? (
                <tr>
                  <td
                    colSpan={isReadOnly ? 6 : 7}
                    className="text-center py-10 text-slate-500 text-sm"
                  >
                    Belum ada data stok barang. Silakan input manual atau tambahkan di tab Barang Masuk.
                  </td>
                </tr>
              ) : (
                filteredStock.map((item) => (
                  <tr
                    key={item.key}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      {item.kategori !== '-' ? (
                        <span className="px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold">
                          {item.kategori}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {item.sub_kategori !== '-' ? (
                        <span className="px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200">
                          {item.sub_kategori}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-semibold text-white">
                      {item.nama}
                    </td>

                    <td className="py-3 px-4 font-mono text-xs text-cyan-400">
                      {item.sn}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          item.qty > 0
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {item.qty} Unit
                      </span>
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-400">
                      {item.ket}
                    </td>

                    {!isReadOnly && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditItemModal(item)}
                            className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg text-xs font-medium border border-indigo-500/20 transition-all"
                            title="Edit Barang Ini"
                          >
                            ✏️ Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg text-xs font-medium border border-rose-500/20 transition-all"
                            title="Hapus Barang Ini"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT ITEM STOCK MAQNA */}
      {editItemModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 transition-all">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">✏️</span>
                <h3 className="text-lg font-bold text-white">
                  Edit Stock Barang Maqna
                </h3>
              </div>
              <button
                onClick={() =>
                  setEditItemModal({ ...editItemModal, isOpen: false })
                }
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Kategori
                </label>
                <select
                  value={editItemModal.kategori}
                  onChange={(e) =>
                    setEditItemModal({
                      ...editItemModal,
                      kategori: e.target.value,
                      sub_kategori: '',
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-sm"
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
                  value={editItemModal.sub_kategori}
                  disabled={!editItemModal.kategori}
                  onChange={(e) =>
                    setEditItemModal({
                      ...editItemModal,
                      sub_kategori: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 disabled:opacity-50 focus:outline-none focus:border-cyan-500 text-sm"
                >
                  <option value="">-- Pilih Tipe Barang --</option>
                  {editTipeList.map((tipe) => (
                    <option key={tipe} value={tipe}>
                      {tipe}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Nama Barang *
                </label>
                <input
                  type="text"
                  value={editItemModal.nama}
                  onChange={(e) =>
                    setEditItemModal({ ...editItemModal, nama: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Serial Number (SN)
                </label>
                <input
                  type="text"
                  value={editItemModal.sn}
                  onChange={(e) =>
                    setEditItemModal({ ...editItemModal, sn: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Quantity (Stok Akhir) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={editItemModal.qty}
                  onChange={(e) =>
                    setEditItemModal({ ...editItemModal, qty: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Keterangan
                </label>
                <input
                  type="text"
                  value={editItemModal.ket}
                  onChange={(e) =>
                    setEditItemModal({ ...editItemModal, ket: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() =>
                  setEditItemModal({ ...editItemModal, isOpen: false })
                }
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSaveEditItem}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-950/50 transition-all"
              >
                {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alert / Confirm */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">{modal.title}</h3>
            <p className="text-sm text-slate-300">{modal.message}</p>
            <div className="flex gap-3 justify-end pt-2">
              {modal.onConfirm ? (
                <>
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    onClick={modal.onConfirm}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
                  >
                    Ya, Lanjutkan
                  </button>
                </>
              ) : (
                <button
                  onClick={closeModal}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold"
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