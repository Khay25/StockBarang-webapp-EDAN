import React, { useMemo, useState } from 'react';

export default function StockMaqna({
  transaksi = [],
  barangMasuk = [],
  barangKeluar = [],
}) {
  const [search, setSearch] = useState('');
  const [filterStok, setFilterStok] = useState('semua');

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
      const tipeBarang = (
        item.tipe_barang ||
        item.kategori ||
        item.category ||
        item.merk ||
        '-'
      ).trim();
      const sn = (item.sn || item.serial_number || '-').trim();
      const qty = Number(item.qty ?? item.jumlah ?? item.quantity ?? 0) || 0;
      const ket = (item.ket || item.keterangan || item.catatan || item.notes || '').trim();

      const key =
        sn && sn !== '-'
          ? `SN-${sn.toLowerCase()}`
          : `ITEM-${nama.toLowerCase()}-${tipeBarang.toLowerCase()}`;

      if (!mapBarang.has(key)) {
        mapBarang.set(key, {
          id: key,
          nama_barang: nama,
          tipe_barang: tipeBarang,
          sn: sn || '-',
          qty: 0,
          keterangan: ket || '-',
        });
      }

      const existing = mapBarang.get(key);

      if (item._arah === 'masuk') {
        existing.qty += qty;
      } else {
        existing.qty -= qty;
      }

      if (tipeBarang && tipeBarang !== '-') existing.tipe_barang = tipeBarang;
      if (ket) existing.keterangan = ket;
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
        row.keterangan.toLowerCase().includes(keyword);

      if (!matchSearch) return false;
      if (filterStok === 'tersedia') return row.qty > 0;
      if (filterStok === 'habis') return row.qty <= 0;
      return true;
    });
  }, [stokMaqna, search, filterStok]);

  const totalUnit = useMemo(
    () => stokMaqna.reduce((acc, item) => acc + (item.qty > 0 ? item.qty : 0), 0),
    [stokMaqna]
  );

  const handleExportCSV = () => {
    const headers = ['Nama Barang', 'Tipe Barang', 'SN', 'Qty', 'Keterangan'];
    const rows = filteredData.map((r) => [
      `"${r.nama_barang.replace(/"/g, '""')}"`,
      `"${r.tipe_barang.replace(/"/g, '""')}"`,
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
            Otomatis sinkron dari setiap input, edit, atau hapus pada Barang Masuk &amp; Barang Keluar.
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
            placeholder="Cari Nama / Tipe / SN..."
            className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-xs border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Nama Barang</th>
              <th className="py-3.5 px-4">Tipe Barang</th>
              <th className="py-3.5 px-4">SN</th>
              <th className="py-3.5 px-4">Qty</th>
              <th className="py-3.5 px-4">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-8 text-slate-500 text-xs">
                  Belum ada data stok barang Maqna yang cocok.
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    {item.nama_barang}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-200">
                      {item.tipe_barang}
                    </span>
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
  );
}