import React, { useState } from 'react';
import { Icon, SummaryMiniCard } from '../components/UI';

export default function AdminWarehouse({ globalProducts, totalValue, setShowModal, handleImportToWarehouse, setImportingItem, categories = [], stockRequests = [], handleProcessStockRequest }) {
    const [filterCategory, setFilterCategory] = useState('all');
    const [viewTab, setViewTab] = useState('inventory'); // 'inventory', 'requests'

    const displayedProducts = filterCategory === 'all' 
        ? globalProducts 
        : globalProducts.filter(p => p.category === filterCategory);
    const pendingRequests = stockRequests.filter(r => r.status === 'pending');

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex space-x-2 bg-slate-100 w-fit p-2 rounded-3xl shadow-inner mb-2">
                <button onClick={() => setViewTab('inventory')} className={`px-6 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${viewTab === 'inventory' ? 'bg-white text-teal-600 shadow-md scale-105' : 'text-slate-400 hover:text-teal-600'}`}>Tồn kho</button>
                <button onClick={() => setViewTab('requests')} className={`px-6 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center gap-2 ${viewTab === 'requests' ? 'bg-white text-orange-600 shadow-md scale-105' : 'text-slate-400 hover:text-orange-600'}`}>
                    Yêu cầu cấp hàng {pendingRequests.length > 0 && <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px] leading-none">{pendingRequests.length}</span>}
                </button>
            </div>

            {viewTab === 'inventory' ? (
            <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-8 rounded-[32px] border shadow-sm text-left">
                <div className="flex items-center gap-6"><div className="p-4 bg-teal-50 text-teal-600 rounded-2xl"><Icon name="warehouse" size={32}/></div><div><h2 className="text-3xl font-black text-slate-900 leading-none">Quản Lý Kho Hàng</h2><p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Dữ liệu hàng hóa toàn hệ thống</p></div></div>
                <div className="flex gap-3 flex-wrap">
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-5 py-3 bg-slate-50 border rounded-xl text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-teal-100 cursor-pointer text-slate-600">
                        <option value="all">Tất cả phân loại</option>
                        {categories.filter(c => !c.hidden).map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                    </select>
                    <button className="flex items-center px-5 py-3 bg-slate-50 border rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Xuất CSV</button>
                    <button onClick={() => setShowModal('manageCategories')} className="flex items-center px-5 py-3 bg-slate-50 border rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all text-teal-600"><Icon name="tags" size={18} className="mr-2" /> Quản lý Phân loại</button>
                    <button onClick={() => setShowModal('addGlobalProduct')} className="flex items-center px-8 py-3 bg-teal-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-teal-700 transition-all active:scale-95"><Icon name="plus" size={18} className="mr-2" /> Thêm sản phẩm</button>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                <SummaryMiniCard label="Tổng danh mục" value={globalProducts.length} />
                <SummaryMiniCard label="Giá trị tồn kho" value={totalValue.toLocaleString() + " đ"} color="text-teal-600" />
                <SummaryMiniCard label="Sắp hết hàng" value={globalProducts.filter(p=>p.warehouseStock>0 && p.warehouseStock<10).length} color="text-orange-500" icon={<Icon name="alert-triangle" size={14}/>} />
                <SummaryMiniCard label="Kho rỗng" value={globalProducts.filter(p=>p.warehouseStock===0).length} color="text-rose-500" />
            </div>
            <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden p-2">
                <table className="w-full text-left text-sm border-separate border-spacing-y-1">
                    <thead className="bg-slate-50/50 border-b"><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-10 py-6">Mô tả sản phẩm ↑↓</th><th className="px-10 py-6 text-center">Mã SKU</th><th className="px-10 py-6 text-center">Danh mục</th><th className="px-10 py-6 text-center">Kho tổng ↑↓</th><th className="px-10 py-6 text-center">Đơn giá</th><th className="px-10 py-6 text-right pr-14">Quản lý</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {displayedProducts.length === 0 && <tr><td colSpan="6" className="px-10 py-16 text-center text-slate-300 font-bold">Không có sản phẩm nào trong phân loại này</td></tr>}
                        {displayedProducts.map(p => {
                            const catInfo = categories.find(c => c.name === p.category) || { icon: '📦', name: p.category };
                            return (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group rounded-2xl">
                                <td className="px-10 py-8 min-w-[300px] text-left"><p className="font-black text-xl text-slate-800 mb-1 leading-none">{p.name}</p><p className="text-[11px] text-slate-400 line-clamp-1">{p.description || "Hàng hóa tiêu chuẩn"}</p></td>
                                <td className="px-10 py-8 text-xs font-mono font-bold text-slate-500 text-center uppercase">{p.sku}</td>
                                <td className="px-10 py-8 text-center"><span className="inline-flex items-center px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-600 uppercase"><span className="mr-2">{catInfo.icon}</span>{catInfo.name}</span></td>
                                <td className="px-10 py-8 text-center font-black"><span className={`text-lg ${p.warehouseStock < 10 ? 'text-orange-500' : 'text-teal-600'}`}>{p.warehouseStock}</span><span className="text-[11px] text-slate-400 ml-1.5">{p.unit}</span></td>
                                <td className="px-10 py-8 font-black text-slate-800 text-center">{p.basePrice.toLocaleString()} đ</td>
                                <td className="px-10 py-8 pr-14 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setImportingItem(p); setShowModal('importProduct'); }} className="p-3 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="Nhập hàng NCC"><Icon name="arrow-down-left" size={20}/></button>
                                        <button onClick={() => setShowModal('distribute')} className="p-3 text-orange-500 hover:bg-orange-50 rounded-xl transition-all" title="Điều phối chi nhánh"><Icon name="arrow-up-right" size={20}/></button>
                                    </div>
                                </td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            </>
            ) : (
            <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden p-2 text-left">
                <table className="w-full text-left text-sm border-separate border-spacing-y-1">
                    <thead className="bg-slate-50/50 border-b"><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-10 py-6">Thời gian</th><th className="px-10 py-6">Chi nhánh</th><th className="px-10 py-6">Sản phẩm</th><th className="px-10 py-6 text-center">Số lượng</th><th className="px-10 py-6">Ghi chú</th><th className="px-10 py-6 text-right pr-14">Trạng thái / Duyệt</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {stockRequests.length === 0 && <tr><td colSpan="6" className="px-10 py-16 text-center text-slate-300 font-bold">Chưa có yêu cầu cấp hàng nào</td></tr>}
                        {stockRequests.map(req => (
                            <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-10 py-6"><p className="font-bold text-slate-800">{new Date(req.date).toLocaleDateString('vi-VN')}</p><p className="text-[10px] text-slate-400">{new Date(req.date).toLocaleTimeString('vi-VN')}</p></td>
                                <td className="px-10 py-6 font-black text-blue-600">{req.storeName}</td>
                                <td className="px-10 py-6 font-bold text-slate-700">{req.productName}</td>
                                <td className="px-10 py-6 text-center font-black text-lg text-orange-500">{req.quantity}</td>
                                <td className="px-10 py-6 text-xs text-slate-500">{req.note}</td>
                                <td className="px-10 py-6 text-right pr-14">
                                    {req.status === 'pending' ? (
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleProcessStockRequest(req.id, 'shipping')} className="p-3 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="Xuất hàng"><Icon name="check" size={18}/></button>
                                            <button onClick={() => handleProcessStockRequest(req.id, 'rejected')} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Từ chối"><Icon name="x" size={18}/></button>
                                        </div>
                                    ) : (
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${req.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : req.status === 'shipping' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-rose-50 text-rose-500 border-rose-200'}`}>
                                            {req.status === 'completed' ? 'Đã nhận' : req.status === 'shipping' ? 'Đang giao' : 'Từ chối'}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            )}
        </div>
    );
}
