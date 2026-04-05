import React, { useState, useEffect } from 'react';
import { Icon, SummaryMiniCard } from '../components/UI';

export default function AdminHistory({ warehouseTransactions, historyFilter, setHistoryFilter }) {
    const [selectedQuarter, setSelectedQuarter] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [selectedStoreFilter, setSelectedStoreFilter] = useState('all');
    const year = historyFilter.year;
    const MONTH_NAMES = ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'];
    const QUARTER_NAMES = ['Q1 (Th1-3)','Q2 (Th4-6)','Q3 (Th7-9)','Q4 (Th10-12)'];

    // Sử dụng new Date() để tránh lỗi lệch múi giờ (Timezone) khi cắt chuỗi ISO
    const yearTxs = warehouseTransactions.filter(tx => {
        if (!tx.date) return false;
        if (new Date(tx.date).getFullYear().toString() !== String(year)) return false;
        if (selectedStoreFilter !== 'all' && tx.storeId !== selectedStoreFilter) return false;
        return true;
    });

    // Tự động đặt lại bộ lọc Quý/Tháng về "Tất cả" mỗi khi chuyển sang xem năm khác
    useEffect(() => {
        setSelectedQuarter('all');
        setSelectedMonth('all');
    }, [year]);

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const txsInMonth = yearTxs.filter(tx => new Date(tx.date).getMonth() === i);
        const imports = txsInMonth.filter(tx => tx.type === 'import');
        const sells = txsInMonth.filter(tx => tx.type === 'sell');
        const distributes = txsInMonth.filter(tx => tx.type === 'distribute');
        
        // Ép kiểu Number để tránh lỗi cộng dồn chuỗi (String concatenation)
        return {
            month: MONTH_NAMES[i],
            importQty: imports.reduce((s, tx) => s + Number(tx.quantity || 0), 0),
            sellQty: sells.reduce((s, tx) => s + Number(tx.quantity || 0), 0),
            distributeQty: distributes.reduce((s, tx) => s + Number(tx.quantity || 0), 0),
            sellValue: sells.reduce((s, tx) => s + Number(tx.quantity || 0) * Number(tx.unitPrice || 0), 0),
        };
    });

    const quarterlyData = Array.from({ length: 4 }, (_, q) => {
        const qMonths = monthlyData.slice(q * 3, q * 3 + 3);
        return {
            label: QUARTER_NAMES[q],
            importQty: qMonths.reduce((s, m) => s + m.importQty, 0),
            sellQty: qMonths.reduce((s, m) => s + m.sellQty, 0),
            distributeQty: qMonths.reduce((s, m) => s + m.distributeQty, 0),
            sellValue: qMonths.reduce((s, m) => s + m.sellValue, 0),
        };
    });

    // Lọc bỏ các Quý tương lai chưa có dữ liệu
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.floor(new Date().getMonth() / 3);
    const currentMonth = new Date().getMonth();

    const validQuarters = quarterlyData.map((q, index) => {
        const hasData = q.importQty > 0 || q.sellQty > 0 || q.distributeQty > 0;
        const isPastOrCurrent = Number(year) < currentYear || (Number(year) === currentYear && index <= currentQuarter);
        return { ...q, index, isValid: hasData || isPastOrCurrent };
    }).filter(q => q.isValid);

    const displayedQuarters = selectedQuarter === 'all' ? validQuarters : validQuarters.filter(q => q.index === Number(selectedQuarter));

    // Lọc bỏ các Tháng tương lai chưa có dữ liệu
    const validMonths = monthlyData.map((m, index) => {
        const hasData = m.importQty > 0 || m.sellQty > 0 || m.distributeQty > 0;
        const isPastOrCurrent = Number(year) < currentYear || (Number(year) === currentYear && index <= currentMonth);
        return { ...m, index, isValid: hasData || isPastOrCurrent };
    }).filter(m => m.isValid);

    const displayedMonths = selectedMonth === 'all' ? validMonths : validMonths.filter(m => m.index === Number(selectedMonth));

    const yearTotals = {
        importQty: monthlyData.reduce((s, m) => s + m.importQty, 0),
        sellQty: monthlyData.reduce((s, m) => s + m.sellQty, 0),
        distributeQty: monthlyData.reduce((s, m) => s + m.distributeQty, 0),
        sellValue: monthlyData.reduce((s, m) => s + m.sellValue, 0),
    };

    const chartMax = Math.max(1, ...monthlyData.map(m => Math.max(m.importQty, m.sellQty, m.distributeQty)));

    const filteredTxs = yearTxs.filter(tx => historyFilter.type === 'all' || tx.type === historyFilter.type).sort((a, b) => new Date(b.date) - new Date(a.date));

    const availableYears = [...new Set(warehouseTransactions.map(tx => tx.date ? new Date(tx.date).getFullYear().toString() : null).filter(Boolean))];
    if (!availableYears.includes(String(year))) availableYears.push(String(year));
    availableYears.sort((a, b) => b - a); // Sắp xếp năm giảm dần

    const typeLabel = { import: 'Nhập kho', distribute: 'Phân phối', sell: 'Bán hàng', return: 'Hoàn kho', transfer_out: 'Xuất luân chuyển', transfer_in: 'Nhận luân chuyển' };
    const typeColor = { import: 'bg-emerald-50 text-emerald-600 border-emerald-100', distribute: 'bg-orange-50 text-orange-600 border-orange-100', sell: 'bg-blue-50 text-blue-600 border-blue-100', return: 'bg-rose-50 text-rose-600 border-rose-100', transfer_out: 'bg-indigo-50 text-indigo-600 border-indigo-100', transfer_in: 'bg-teal-50 text-teal-600 border-teal-100' };
    const typeIcon = { import: 'arrow-down-left', distribute: 'arrow-up-right', sell: 'shopping-cart', return: 'corner-up-left', transfer_out: 'truck', transfer_in: 'package-check' };

    // Lấy danh sách các chi nhánh có phát sinh giao dịch để tạo menu chọn
    const availableStores = [];
    const storeMap = new Map();
    warehouseTransactions.forEach(tx => {
        if (tx.storeId && tx.storeName && !storeMap.has(tx.storeId)) {
            storeMap.set(tx.storeId, tx.storeName);
            availableStores.push({ id: tx.storeId, name: tx.storeName });
        }
    });

    const salesByStore = {};
    yearTxs.filter(tx => tx.type === 'sell').forEach(tx => {
        const storeName = tx.storeName || 'Không xác định';
        if (!salesByStore[storeName]) salesByStore[storeName] = { qty: 0, value: 0 };
        salesByStore[storeName].qty += Number(tx.quantity || 0);
        salesByStore[storeName].value += Number(tx.quantity || 0) * Number(tx.unitPrice || 0);
    });

    const exportToCSV = () => {
        const headers = ['Thời gian', 'Loại', 'Sản phẩm', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Chi nhánh', 'Ghi chú'];
        const rows = filteredTxs.map(tx => [
            new Date(tx.date).toLocaleString('vi-VN').replace(',', ''),
            typeLabel[tx.type] || tx.type,
            `"${tx.productName || ''}"`,
            tx.quantity,
            tx.unitPrice || 0,
            tx.type === 'sell' ? tx.quantity * (tx.unitPrice || 0) : 0,
            `"${tx.storeName || ''}"`,
            `"${tx.note || ''}"`
        ]);
        const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bao_cao_giao_dich_nam_${year}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header + Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-8 rounded-[32px] border shadow-sm text-left">
                <div className="flex items-center gap-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Icon name="bar-chart-3" size={32}/></div><div><h2 className="text-3xl font-black text-slate-900 leading-none">Thống Kê & Báo Cáo</h2><p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Nhập kho · Phân phối · Bán hàng · Năm {year}</p></div></div>
                <div className="flex gap-3 flex-wrap">
                    <select value={selectedStoreFilter} onChange={e => setSelectedStoreFilter(e.target.value)} className="px-5 py-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer max-w-[200px] sm:max-w-[250px] truncate">
                        <option value="all">Tất cả chi nhánh</option>
                        {availableStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select value={year} onChange={e => setHistoryFilter({...historyFilter, year: e.target.value})} className="px-5 py-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer">
                        {availableYears.map(y => <option key={y} value={y}>Năm {y}</option>)}
                    </select>
                    <select value={historyFilter.type} onChange={e => setHistoryFilter({...historyFilter, type: e.target.value})} className="px-5 py-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer">
                        <option value="all">Tất cả</option>
                        <option value="import">Nhập kho</option>
                        <option value="distribute">Phân phối</option>
                        <option value="sell">Bán hàng</option>
                        <option value="return">Hoàn kho</option>
                        <option value="transfer_out">Xuất luân chuyển</option>
                        <option value="transfer_in">Nhận luân chuyển</option>
                    </select>
                    <button onClick={exportToCSV} className="px-5 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95">
                        <Icon name="download" size={18}/> Xuất CSV
                    </button>
                </div>
            </div>

            {/* Year Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                <SummaryMiniCard label={`Nhập kho cả năm ${year}`} value={yearTotals.importQty + " SP"} color="text-emerald-600" />
                <SummaryMiniCard label={`Phân phối cả năm ${year}`} value={yearTotals.distributeQty + " SP"} color="text-orange-500" />
                <SummaryMiniCard label={`Bán ra cả năm ${year}`} value={yearTotals.sellQty + " SP"} color="text-blue-600" />
                <SummaryMiniCard label={`Doanh thu năm ${year}`} value={yearTotals.sellValue.toLocaleString() + " đ"} color="text-indigo-600" />
            </div>

            {/* Monthly Bar Chart */}
            <div className="bg-white rounded-[40px] border shadow-sm p-10 text-left">
                <h3 className="text-xl font-black tracking-tight mb-2 uppercase flex items-center gap-3"><Icon name="bar-chart-3" size={22} className="text-blue-600"/> Biểu đồ Nhập / Bán theo tháng — Năm {year}</h3>
                <div className="flex items-center gap-8 mb-8 mt-1">
                    <span className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="w-4 h-4 rounded bg-emerald-500 inline-block"></span> Nhập kho</span>
                    <span className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="w-4 h-4 rounded bg-blue-500 inline-block"></span> Bán ra</span>
                    <span className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="w-4 h-4 rounded bg-orange-400 inline-block"></span> Phân phối</span>
                </div>
                <div className="flex items-end gap-2 sm:gap-3 h-[280px] pt-4 border-b border-l border-slate-100 relative pl-1">
                    <div className="absolute -left-1 top-0 bottom-0 flex flex-col justify-between text-[9px] font-bold text-slate-300 pointer-events-none" style={{width: '1px'}}>
                        <span className="relative -top-2 -left-8">{chartMax}</span>
                        <span className="relative -left-8">{Math.round(chartMax / 2)}</span>
                        <span className="relative top-1 -left-8">0</span>
                    </div>
                    {monthlyData.map((m, i) => {
                        const importH = chartMax > 0 ? (m.importQty / chartMax) * 100 : 0;
                        const sellH = chartMax > 0 ? (m.sellQty / chartMax) * 100 : 0;
                        const distH = chartMax > 0 ? (m.distributeQty / chartMax) * 100 : 0;
                        const isSelected = selectedMonth === String(i);
                        return (
                            <div key={i} onClick={() => setSelectedMonth(isSelected ? 'all' : String(i))} className={`flex-1 flex flex-col items-center justify-end h-full gap-1 group relative cursor-pointer transition-all rounded-t-xl ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold rounded-xl px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-xl">
                                    <p className="text-emerald-400">Nhập: {m.importQty}</p>
                                    <p className="text-blue-400">Bán: {m.sellQty}</p>
                                    <p className="text-orange-400">Phối: {m.distributeQty}</p>
                                    <p className="text-slate-300 border-t border-slate-700 mt-1 pt-1">DT: {m.sellValue.toLocaleString()}đ</p>
                                    <p className="text-[8px] font-medium text-slate-400 mt-1 text-center italic">Nhấn để lọc dữ liệu</p>
                                </div>
                                <div className="flex gap-[2px] items-end w-full justify-center" style={{height: '100%'}}>
                                    <div className="bg-emerald-500 rounded-t-sm w-[30%] min-w-[4px] transition-all duration-500 hover:bg-emerald-400" style={{height: `${Math.max(importH, importH > 0 ? 2 : 0)}%`}}></div>
                                    <div className="bg-blue-500 rounded-t-sm w-[30%] min-w-[4px] transition-all duration-500 hover:bg-blue-400" style={{height: `${Math.max(sellH, sellH > 0 ? 2 : 0)}%`}}></div>
                                    <div className="bg-orange-400 rounded-t-sm w-[30%] min-w-[4px] transition-all duration-500 hover:bg-orange-300" style={{height: `${Math.max(distH, distH > 0 ? 2 : 0)}%`}}></div>
                                </div>
                                <p className={`text-[10px] font-black mt-2 leading-none ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>{m.month}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Quarterly Breakdown */}
            <div className="bg-white rounded-[40px] border shadow-sm p-10 text-left">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="text-xl font-black tracking-tight uppercase flex items-center gap-3"><Icon name="calendar" size={22} className="text-indigo-600"/> Thống kê theo Quý — Năm {year}</h3>
                    {validQuarters.length > 0 && (
                        <select value={selectedQuarter} onChange={e => setSelectedQuarter(e.target.value)} className="px-5 py-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer text-slate-700">
                            <option value="all">Tất cả các Quý</option>
                            {validQuarters.map(q => <option key={q.index} value={q.index}>{q.label}</option>)}
                        </select>
                    )}
                </div>
                {displayedQuarters.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-8">Chưa có dữ liệu Quý cho năm này.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {displayedQuarters.map((q) => {
                            const qMax = Math.max(1, q.importQty, q.sellQty, q.distributeQty);
                            return (
                                <div key={q.index} className="p-6 bg-slate-50 rounded-[30px] border hover:shadow-lg transition-all">
                                    <p className="font-black text-lg text-slate-900 mb-4">{q.label}</p>
                                    <div className="space-y-3">
                                        <div><div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1"><span className="text-emerald-600">Nhập kho</span><span className="text-slate-500">{q.importQty} SP</span></div><div className="w-full bg-slate-200 rounded-full h-3"><div className="bg-emerald-500 h-3 rounded-full transition-all duration-700" style={{width: `${(q.importQty / qMax) * 100}%`}}></div></div></div>
                                        <div><div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1"><span className="text-blue-600">Bán ra</span><span className="text-slate-500">{q.sellQty} SP</span></div><div className="w-full bg-slate-200 rounded-full h-3"><div className="bg-blue-500 h-3 rounded-full transition-all duration-700" style={{width: `${(q.sellQty / qMax) * 100}%`}}></div></div></div>
                                        <div><div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1"><span className="text-orange-500">Phân phối</span><span className="text-slate-500">{q.distributeQty} SP</span></div><div className="w-full bg-slate-200 rounded-full h-3"><div className="bg-orange-400 h-3 rounded-full transition-all duration-700" style={{width: `${(q.distributeQty / qMax) * 100}%`}}></div></div></div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doanh thu</p><p className="text-xl font-black text-indigo-600">{q.sellValue.toLocaleString()} đ</p></div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Monthly Detail Table */}
            <div className="bg-white rounded-[40px] border shadow-sm p-10 text-left">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="text-xl font-black tracking-tight uppercase flex items-center gap-3"><Icon name="table" size={22} className="text-slate-600"/> Chi tiết các tháng — Năm {year}</h3>
                    {validMonths.length > 0 && (
                        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="px-5 py-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer text-slate-700">
                            <option value="all">Tất cả các Tháng</option>
                            {validMonths.map(m => <option key={m.index} value={m.index}>{m.month}</option>)}
                        </select>
                    )}
                </div>
                {displayedMonths.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-8">Chưa có dữ liệu Tháng cho năm này.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-separate border-spacing-y-1">
                            <thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50"><th className="px-4 py-4 text-left rounded-l-xl">Tháng</th><th className="px-4 py-4 text-center">Nhập kho</th><th className="px-4 py-4 text-center">Phân phối</th><th className="px-4 py-4 text-center">Bán ra</th><th className="px-4 py-4 text-right rounded-r-xl">Doanh thu</th></tr></thead>
                            <tbody>
                                {displayedMonths.map((m) => (
                                    <tr key={m.index} className="hover:bg-blue-50/30 transition-colors"><td className="px-4 py-3 font-black text-slate-800">{m.month}/{year}</td><td className="px-4 py-3 text-center"><span className="text-emerald-600 font-black">{m.importQty}</span></td><td className="px-4 py-3 text-center"><span className="text-orange-500 font-black">{m.distributeQty}</span></td><td className="px-4 py-3 text-center"><span className="text-blue-600 font-black">{m.sellQty}</span></td><td className="px-4 py-3 text-right font-black text-indigo-600">{m.sellValue.toLocaleString()} đ</td></tr>
                                ))}
                                {selectedMonth === 'all' && (
                                    <tr className="bg-slate-100 font-black"><td className="px-4 py-4 rounded-l-xl">TỔNG NĂM</td><td className="px-4 py-4 text-center text-emerald-600">{yearTotals.importQty}</td><td className="px-4 py-4 text-center text-orange-500">{yearTotals.distributeQty}</td><td className="px-4 py-4 text-center text-blue-600">{yearTotals.sellQty}</td><td className="px-4 py-4 text-right text-indigo-600 rounded-r-xl">{yearTotals.sellValue.toLocaleString()} đ</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Sales by Store */}
            {Object.keys(salesByStore).length > 0 && (
                <div className="bg-white rounded-[40px] border shadow-sm p-10 text-left">
                    <h3 className="text-xl font-black tracking-tight mb-6 uppercase flex items-center gap-3"><Icon name="store" size={22} className="text-blue-600"/> Doanh số theo chi nhánh — Năm {year}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(salesByStore).map(([storeName, data]) => (
                            <div key={storeName} className="p-6 bg-slate-50 rounded-[30px] border">
                                <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center"><Icon name="store" size={20}/></div><p className="font-black text-lg text-slate-900">{storeName}</p></div>
                                <div className="flex justify-between"><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã bán</p><p className="text-2xl font-black text-blue-600">{data.qty}</p></div><div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doanh thu</p><p className="text-2xl font-black text-emerald-600">{data.value.toLocaleString()} đ</p></div></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Transaction Detail Log */}
            <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden p-2">
                <table className="w-full text-left text-sm border-separate border-spacing-y-1">
                    <thead className="bg-slate-50/50 border-b"><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-10 py-6">Thời gian</th><th className="px-10 py-6 text-center">Loại</th><th className="px-10 py-6">Sản phẩm</th><th className="px-10 py-6 text-center">Số lượng</th><th className="px-10 py-6">Chi nhánh</th><th className="px-10 py-6">Ghi chú</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredTxs.length === 0 && <tr><td colSpan="6" className="px-10 py-16 text-center text-slate-300 font-bold">Chưa có giao dịch nào trong năm {year}</td></tr>}
                        {filteredTxs.map(tx => (
                            <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-10 py-6"><p className="font-bold text-slate-800">{new Date(tx.date).toLocaleDateString('vi-VN')}</p><p className="text-[10px] text-slate-400">{new Date(tx.date).toLocaleTimeString('vi-VN')}</p></td>
                                <td className="px-10 py-6 text-center"><span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border-2 ${typeColor[tx.type]}`}><Icon name={typeIcon[tx.type]} size={12}/>{typeLabel[tx.type]}</span></td>
                                <td className="px-10 py-6 font-black text-slate-800">{tx.productName}</td>
                                <td className="px-10 py-6 text-center font-black text-lg text-blue-600">{tx.quantity}</td>
                                <td className="px-10 py-6 text-slate-500 font-bold">{tx.storeName || '—'}</td>
                                <td className="px-10 py-6 text-slate-400 text-xs">{tx.note}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
