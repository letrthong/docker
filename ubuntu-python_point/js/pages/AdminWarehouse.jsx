import React from 'react';
import { Icon, SummaryMiniCard } from '../components/UI';
import { CATEGORIES } from '../constants';

export default function AdminWarehouse({ globalProducts, totalValue, setShowModal, handleImportToWarehouse }) {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-8 rounded-[32px] border shadow-sm text-left">
                <div className="flex items-center gap-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Icon name="warehouse" size={32}/></div><div><h2 className="text-3xl font-black text-slate-900 leading-none">Quản Lý Kho Hàng</h2><p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Dữ liệu hàng hóa toàn hệ thống</p></div></div>
                <div className="flex gap-3">
                    <button className="flex items-center px-5 py-3 bg-slate-50 border rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Xuất CSV</button>
                    <button onClick={() => setShowModal('addGlobalProduct')} className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all active:scale-95"><Icon name="plus" size={18} className="mr-2" /> Thêm sản phẩm</button>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                <SummaryMiniCard label="Tổng danh mục" value={globalProducts.length} />
                <SummaryMiniCard label="Giá trị tồn kho" value={totalValue.toLocaleString() + " đ"} color="text-blue-600" />
                <SummaryMiniCard label="Sắp hết hàng" value={globalProducts.filter(p=>p.warehouseStock>0 && p.warehouseStock<10).length} color="text-orange-500" icon={<Icon name="alert-triangle" size={14}/>} />
                <SummaryMiniCard label="Kho rỗng" value={globalProducts.filter(p=>p.warehouseStock===0).length} color="text-rose-500" />
            </div>
            <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden p-2">
                <table className="w-full text-left text-sm border-separate border-spacing-y-1">
                    <thead className="bg-slate-50/50 border-b"><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-10 py-6">Mô tả sản phẩm ↑↓</th><th className="px-10 py-6 text-center">Mã SKU</th><th className="px-10 py-6 text-center">Danh mục</th><th className="px-10 py-6 text-center">Kho tổng ↑↓</th><th className="px-10 py-6 text-center">Đơn giá</th><th className="px-10 py-6 text-right pr-14">Quản lý</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {globalProducts.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group rounded-2xl">
                                <td className="px-10 py-8 min-w-[300px] text-left"><p className="font-black text-xl text-slate-800 mb-1 leading-none">{p.name}</p><p className="text-[11px] text-slate-400 line-clamp-1">{p.description || "Hàng hóa tiêu chuẩn"}</p></td>
                                <td className="px-10 py-8 text-xs font-mono font-bold text-slate-500 text-center uppercase">{p.sku}</td>
                                <td className="px-10 py-8 text-center"><span className="inline-flex items-center px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-600 uppercase"><span className="mr-2">{CATEGORIES[p.category] || '📦'}</span>{p.category}</span></td>
                                <td className="px-10 py-8 text-center font-black"><span className={`text-lg ${p.warehouseStock < 10 ? 'text-orange-500' : 'text-blue-600'}`}>{p.warehouseStock}</span><span className="text-[11px] text-slate-400 ml-1.5">{p.unit}</span></td>
                                <td className="px-10 py-8 font-black text-slate-800 text-center">{p.basePrice.toLocaleString()} đ</td>
                                <td className="px-10 py-8 pr-14 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleImportToWarehouse(p.id, 10)} className="p-3 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="Nhập hàng NCC"><Icon name="arrow-down-left" size={20}/></button>
                                        <button onClick={() => setShowModal('distribute')} className="p-3 text-orange-500 hover:bg-orange-50 rounded-xl transition-all" title="Điều phối chi nhánh"><Icon name="arrow-up-right" size={20}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
