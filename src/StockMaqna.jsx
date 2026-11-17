import React, { useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

export default function StockMaqna({
  transaksi = [],
  barangMasuk = [],
  barangKeluar = [],
  kategoriList = [],
  onRefresh,
  onRefreshKategori,
  onRecordAudit,
  isReadOnly = false,
}) {
  const [search, setSearch] = useState('');
  const [filterStok, setFilterStok] = useState('semua');
  const [filterKategori, setFilterKategori] = useState('all');
  const [saving, setSaving] = useState(false);

  const [manualForm, setManualForm] = useState({
    kategori: '',
    tipe_barang: '',
    nama: '',
    sn: '',
    qty: '',
    ket: '',
  });

  // State untuk Kelola Kategori & Tipe Barang (Tambah / Edit / Hapus)
  const [showManageKat, setShowManageKat] = useState(false);
  const [newKat, setNewKat] = useState({ kategori: '', sub_kategori: '' });
  const [editingKatId, setEditingKatId] = useState(null);
  const [editKatDraft, setEditKatDraft] = useState({ kategori: '', sub_kategori: '' });
  const [savingKat, setSavingKat] = useState(false);

  const uniqueCategories = useMemo(() => {
    const setKat = new Set(
      kategoriList.map((item) => item.kategori?.trim()).filter(Boolean)
    );
    return Array.from(setKat);
  }, [kategoriList]);

  const availableTipeBarang = useMemo(() => {
    if (!manualForm.kategori) return [];
    return kategoriList
      .filter(
        (item) =>
          item.kategori?.trim().toLowerCase() ===
          manualForm.kategori.trim().toLowerCase()
      )
      .map((item) => item.sub_kategori?.trim())
      .filter(Boolean);
  }, [kategoriList, manualForm.kategori]);

  const handleSaveNewKategori = async () => {
    const kat = newKat.kategori.trim();
    const tipe = newKat.sub_kategori.trim();
    if (!kat || !tipe) {
      alert('Nama Kategori dan Tipe Barang wajib diisi!');
      return;
    }

    const exists = kategoriList.some(
      (item) =>
        item.kategori?.trim().toLowerCase() === kat.toLowerCase() &&
        item.sub_kategori?.trim().toLowerCase() === tipe.toLowerCase()
    );

    if (exists) {
      setManualForm((prev) => ({ ...prev, kategori: kat, tipe_barang: tipe }));
      setNewKat({ kategori: '', sub_kategori: '' });
      return;
    }

    setSavingKat(true);
    const { error } = await supabase
      .from('kategori_barang')
      .insert([{ kategori: kat, sub_kategori: tipe }]);

    if (error) {
      alert('Gagal menambah kategori: ' + error.message);
    } else {
      if (onRecordAudit) {
        await onRecordAudit('TAMBAH', `Menambah Kategori & Tipe: ${kat} > ${tipe}`);
      }
      if (onRefreshKategori) await onRefreshKategori();
      setManualForm((prev) => ({ ...prev, kategori: kat, tipe_barang: tipe }));
      setNewKat({ kategori: '', sub_kategori: '' });
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
      alert('Kategori dan Tipe Barang tidak boleh kosong!');
      return;
    }

    setSavingKat(true);
    const { error } = await supabase
      .from('kategori_barang')
      .update({ kategori: kat, sub_kategori: tipe })
      .eq('id', id);

    if (error) {
      alert('Gagal mengedit kategori: ' + error.message);
    } else {
      if (onRecordAudit) {
        await onRecordAudit('EDIT', `Mengedit Kategori #${id} menjadi: ${kat} > ${tipe}`);
      }
      setEditingKatId(null);
      if (onRefreshKategori) await onRefreshKategori();
    }
    setSavingKat(false);
  };

  const handleDeleteKat = async (item) => {
    if (!window.confirm(`Hapus kategori "${item.kategori} > ${item.sub_kategori}"?`)) {
      return;
    }
    const { error } = await supabase
      .from('kategori_barang')
      .delete()
      .eq('id', item.id);

    if (error) {
      alert('Gagal menghapus kategori: ' + error.message);
    } else {
      if (onRecordAudit) {
        await onRecordAudit(
          'HAPUS',
          `Menghapus Kategori: ${item.kategori} > ${item.sub_kategori}`
        );
      }
      if (onRefreshKategori) await onRefreshKategori();
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!manualForm.nama.trim() || !manualForm.qty) {
      alert('Nama Barang dan Qty wajib diisi!');
      return;
    }

    setSaving(true);
    const inputQty = parseInt(manualForm.qty, 10) || 0;

    const payload = {
      tipe: 'Barang Masuk',
      asal: 'Input Manual Stock Maqna',
      kategori: manualForm.kategori || '-',
      sub_kategori: manualForm.tipe_barang || '-',
      sn: manualForm.sn.trim(),
      nama: manualForm.nama.trim(),
      qty: inputQty,
      tanggal: new Date().toISOString().split('T')[0],
      ket: manualForm.ket.trim(),
      foto_url: '',
    };

    const { error } = await supabase.from('stok_barang').insert([payload]);

    if (error) {
      alert('Gagal menyimpan data: ' + error.message);
    } else {
      if (onRecordAudit) {
        await onRecordAudit(
          'TAMBAH',
          `Input Manual Stock Maqna: "${manualForm.nama.trim()}" (${inputQty} Unit)`
        );
      }
      setManualForm({
        kategori: '',
        tipe_barang: '',
        nama: '',
        sn: '',
        qty: '',
        ket: '',
      });
      if (onRefresh) await onRefresh();
    }
    setSaving(false);
  };

  const stokMaqna = useMemo(() => {
    const mapBarang = new Map();

    const semuaTransaksi = [
      ...transaksi.map((item) => ({
        ...item,
        _arah: String(item.tipe || item.jenis || item.type || item.status || '')
          .toLowerCase()
          .includes('keluar')
          ? 'keluar'
          : 'masuk',
      })),
      ...barangMasuk.map((item) => ({ ...item, _arah: 'masuk' })),
      ...barangKeluar.map((item) => ({ ...item, _arah: 'keluar' })),
    ].sort((a, b) => new Date(a.tanggal || 0) - new Date(b.tanggal || 0));

    semuaTransaksi.forEach((item) => {
      const nama = (item.nama || item.nama_barang || item.item_name || '-').trim();
      const rawKet = (item.ket || item.keterangan || item.catatan || item.notes || '').trim();

      const tipeMatch = rawKet.match(/^\[TIPE:\s*(.+?)\]\s*(.*)$/i);
      const extractedTipe = tipeMatch ? tipeMatch[1].trim() : '';
      const cleanKet = tipeMatch ? tipeMatch[2].trim() : rawKet;

      const kategori = (item.kategori || '-').trim();
      const tipeBarang = (
        (item.sub_kategori && item.sub_kategori !== '-' ? item.sub_kategori : '') ||
        item.tipe_barang ||
        extractedTipe ||
        item.merk ||
        '-'
      ).trim();

      const sn = (item.sn || item.serial_number || '-').trim();
      const qty = Number(item.qty ?? item.jumlah ?? item.quantity ?? 0) || 0;

      const key =
        sn && sn !== '-'
          ? `SN-${sn.toLowerCase()}`
          : `ITEM-${nama.toLowerCase()}-${tipeBarang.toLowerCase()}`;

      if (!mapBarang.has(key)) {
        mapBarang.set(key, {
          id: key,
          kategori: kategori,
          tipe_barang: tipeBarang,
          nama_barang: nama,
          sn: sn || '-',
          qty: 0,
          keterangan: cleanKet || '-',
        });
      }

      const existing = mapBarang.get(key);

      if (item._arah === 'masuk') {
        existing.qty += qty;
      } else {
        existing.qty -= qty;
      }

      if (kategori && kategori !== '-') existing.kategori = kategori;
      if (tipeBarang && tipeBarang !== '-') existing.tipe_barang = tipeBarang;
      if (cleanKet) existing.keterangan = cleanKet;
    });

    return Array.from(mapBarang.values());
  }, [transaksi, barangMasuk, barangKeluar]);

  const filteredData = useMemo(() => {
    return stokMaqna.filter((row) => {
      const keyword = search.toLowerCase();
      const matchSearch =
        row.nama_barang.toLowerCase().includes(keyword) ||
        row.tipe_barang.toLowerCase().includes(keyword) ||
        row.sn.toLowerCase().includes(keyword) ||
        row.kategori.toLowerCase().includes(keyword) ||
        row.keterangan.toLowerCase().includes(keyword);

      if (!matchSearch) return false;
      if (filterKategori !== 'all' && row.kategori !== filterKategori) return false;
      if (filterStok === 'tersedia') return row.qty > 0;
      if (filterStok === 'habis') return row.qty <= 0;
      return true;
    });
  }, [stokMaqna, search, filterStok, filterKategori]);

  const totalUnit = useMemo(
    () => stokMaqna.reduce((acc, item) => acc + (item.qty > 0 ? item.qty : 0), 0),
    [stokMaqna]
  );

  const handleExportCSV = () => {
    const headers = [
      'Kategori',
      'Tipe Barang',
      'Nama Barang',
      'SN',
      'Qty',
      'Keterangan',
    ];
    const rows = filteredData.map((r) => [
      `"${r.kategori.replace(/"/g, '""')}"`,
      `"${r.tipe_barang.replace(/"/g, '""')}"`,
      `"${r.nama_barang.replace(/"/g, '""')}"`,
      `"${r.sn.replace(/"/g, '""')}"`,
      r.qty,
      `"${r.keterangan.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute(
      'download',
      `Stock_Barang_Maqna_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {!isReadOnly && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
              Input Manual Stock Barang Maqna
            </h2>
            <button
              type="button"
              onClick={() => setShowManageKat(!showManageKat)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 text-xs font-semibold transition-all"
            >
              {showManageKat ? '✕ Tutup Kelola Kategori' : '⚙️ Kelola Kategori & Tipe'}
            </button>
          </div>

          {showManageKat && (
            <div className="mb-5 p-4 rounded-xl bg-slate-950/90 border border-indigo-500/30 space-y-4">
              <p className="text-xs font-semibold text-indigo-400 uppercase">
                Tambah / Edit / Hapus Kategori &amp; Tipe Barang
              </p>

              {/* Form Tambah Baru */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  list="existing-kat-maqna"
                  value={newKat.kategori}
                  onChange={(e) => setNewKat({ ...newKat, kategori: e.target.value })}
                  placeholder="Kategori (misal: Alat Medis)"
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <datalist id="existing-kat-maqna">
                  {uniqueCategories.map((k) => (
                    <option key={k} value={k} />
                  ))}
                </datalist>

                <input
                  type="text"
                  value={newKat.sub_kategori}
                  onChange={(e) =>
                    setNewKat({ ...newKat, sub_kategori: e.target.value })
                  }
                  placeholder="Tipe Barang (misal: Acclarix LX8)"
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />

                <button
                  type="button"
                  disabled={savingKat}
                  onClick={handleSaveNewKategori}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all"
                >
                  {savingKat ? 'Menyimpan...' : '+ Tambah Baru'}
                </button>
              </div>

              {/* Daftar Kategori Tersimpan (Bisa Edit & Hapus) */}
              {kategoriList.length > 0 && (
                <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-800 divide-y divide-slate-800/70">
                  {kategoriList.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-slate-900/60 flex flex-wrap items-center justify-between gap-2 text-xs"
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
                            className="bg-slate-950 border border-indigo-500 rounded-lg px-2.5 py-1 text-slate-200 text-xs"
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
                            className="bg-slate-950 border border-indigo-500 rounded-lg px-2.5 py-1 text-slate-200 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateKat(item.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingKatId(null)}
                            className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
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
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-all"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteKat(item)}
                              className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition-all"
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
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                  Kategori
                </label>
                <select
                  value={manualForm.kategori}
                  onChange={(e) =>
                    setManualForm({
                      ...manualForm,
                      kategori: e.target.value,
                      tipe_barang: '',
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
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
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                  Tipe Barang
                </label>
                <select
                  value={manualForm.tipe_barang}
                  disabled={!manualForm.kategori}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, tipe_barang: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 disabled:opacity-50 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">
                    {manualForm.kategori
                      ? '-- Pilih Tipe Barang --'
                      : '-- Pilih Kategori Dulu --'}
                  </option>
                  {availableTipeBarang.map((tipe) => (
                    <option key={tipe} value={tipe}>
                      {tipe}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                  Nama Barang *
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.nama}
                  onChange={(e) => setManualForm({ ...manualForm, nama: e.target.value })}
                  placeholder="Contoh: USG / Patient Monitor"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                  Serial Number (SN)
                </label>
                <input
                  type="text"
                  value={manualForm.sn}
                  onChange={(e) => setManualForm({ ...manualForm, sn: e.target.value })}
                  placeholder="Contoh: SN12345678"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                  Quantity (Qty) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={manualForm.qty}
                  onChange={(e) => setManualForm({ ...manualForm, qty: e.target.value })}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                  Keterangan
                </label>
                <input
                  type="text"
                  value={manualForm.ket}
                  onChange={(e) => setManualForm({ ...manualForm, ket: e.target.value })}
                  placeholder="Catatan atau keterangan tambahan"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-cyan-900/30 transition-all cursor-pointer"
            >
              {saving ? 'Menyimpan...' : '+ Tambah Stock Maqna'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">
                📦 Stock Barang Maqna
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {stokMaqna.length} Jenis • {totalUnit} Unit Tersedia
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Otomatis sinkron dari input manual maupun transaksi Barang Masuk &amp; Barang Keluar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Export Excel
            </button>

            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Semua Kategori</option>
              {uniqueCategories.map((kat) => (
                <option key={kat} value={kat}>
                  {kat}
                </option>
              ))}
            </select>

            <select
              value={filterStok}
              onChange={(e) => setFilterStok(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="semua">Semua Stok</option>
              <option value="tersedia">Tersedia (&gt; 0)</option>
              <option value="habis">Habis (0)</option>
            </select>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Nama / Kategori / Tipe / SN..."
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56"
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-500 text-xs">
                    Belum ada data stok barang Maqna yang cocok.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      {item.kategori !== '-' ? (
                        <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-semibold">
                          {item.kategori}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-200">
                        {item.tipe_barang}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {item.nama_barang}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-cyan-400">
                      {item.sn}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.qty > 0
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {item.qty} Unit
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {item.keterangan}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}