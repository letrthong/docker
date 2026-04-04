import React, { useState } from 'react';
import { Icon } from '../components/UI';

export default function AdminStaffGlobal({ allEmployees, stores, searchTerm, setSearchTerm, setSelectedStore, setActiveTab, setStoreSubTab, setEditingEmployee, setShowModal, handleDeleteEmployee, handleResetPassword, handleUpdateEmployeeStatus }) {
    const [filterTab, setFilterTab] = useState('all');
    const pendingCount = allEmployees.filter(e => e.status === 'create').length;

    const displayedEmployees = allEmployees.filter(e => filterTab === 'all' || (filterTab === 'pending' && e.status === 'create')).filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 text-left">
                <div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Nhân sự Toàn Hệ thống</h2><p className="text-slate-400 font-bold text-sm uppercase mt-1 tracking-widest">Tổng cộng {allEmployees.length} nhân sự</p></div>
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <button onClick={() => setShowModal('manageShifts')} className="flex items-center px-5 py-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all text-blue-600 shadow-sm whitespace-nowrap"><Icon name="clock" size={18} className="mr-2" /> Quản lý Ca</button>
                    <div className="flex bg-slate-200/50 p-1 rounded-2xl">
                        <button onClick={() => setFilterTab('all')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterTab === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tất cả</button>
                        <button onClick={() => setFilterTab('pending')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${filterTab === 'pending' ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            Chờ duyệt
                            {pendingCount > 0 && <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px] leading-none">{pendingCount}</span>}
                        </button>
                    </div>
                    <div className="relative flex-1 sm:flex-none"><Icon name="search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" /><input type="text" placeholder="Tìm tên nhân viên..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 text-sm font-bold shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                </div>
            </div>
            <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden p-2">
                <table className="w-full text-left text-sm border-separate border-spacing-y-2">
                    <thead className="bg-slate-50/50 border-b"><tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"><th className="px-10 py-6 text-left">Nhân viên</th><th className="px-10 py-6 text-center">Vai trò</th><th className="px-10 py-6 text-center">Chi nhánh gán</th><th className="px-10 py-6 text-center">Tài khoản</th><th className="px-10 py-6 text-right pr-14">Hành động</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {displayedEmployees.length === 0 && <tr><td colSpan="5" className="px-10 py-16 text-center text-slate-300 font-bold">Không có nhân sự nào trong danh sách</td></tr>}
                        {displayedEmployees.map(e => (
                            <tr key={e.id} className="hover:bg-blue-50/20 transition-all rounded-3xl group">
                                <td className="px-10 py-8 min-w-[250px] text-left flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white border text-blue-600 flex items-center justify-center font-black text-lg uppercase shadow-sm overflow-hidden shrink-0">{e.cccdImage ? <img src={e.cccdImage} className="w-full h-full object-cover" alt="CCCD"/> : e.name.charAt(0)}</div>
                                    <div><p className="font-black text-lg text-slate-900 leading-none mb-1">{e.name}</p><p className="text-[11px] font-bold text-slate-400">SĐT: {e.phone} · ID: {e.cccd || e.id}</p></div>
                                </td>
                                <td className="px-10 py-8 text-center uppercase">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <span className={`px-4 py-1.5 rounded-full font-black text-[10px] border-2 ${e.role === 'Quản lý' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{e.role}</span>
                                        <span className={`px-3 py-1 rounded-full font-black text-[9px] border ${e.status === 'disable' ? 'bg-rose-50 text-rose-500 border-rose-200' : (!e.status || e.status === 'active') ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>{e.status === 'disable' ? 'Vô hiệu' : (!e.status || e.status === 'active') ? 'Đã duyệt' : 'Chờ duyệt'}</span>
                                    </div>
                                </td>
                                <td className="px-10 py-8 text-center">
                                    <div className="flex flex-wrap gap-1 justify-center max-w-[150px] mx-auto">
                                        {(e.assignedStores || []).map(sid => <span key={sid} className="px-2 py-1 bg-blue-50 text-blue-600 text-[9px] font-black rounded-md">{stores.find(s=>s.id===sid)?.name || sid}</span>)}
                                    </div>
                                </td>
                                <td className="px-10 py-8 text-center font-mono font-bold text-slate-400 text-xs">@{e.username}</td>
                                <td className="px-10 py-8 text-right pr-14">
                                    <div className="flex justify-end gap-2">
                                        {e.status === 'create' && (
                                            <button onClick={() => handleUpdateEmployeeStatus(e.id, 'active')} className="p-3 text-emerald-500 hover:text-white rounded-xl hover:bg-emerald-500 transition-all" title="Duyệt CCCD"><Icon name="check-circle" size={18}/></button>
                                        )}
                                        <button onClick={() => handleResetPassword(e.id, e.name)} className="p-3 text-slate-400 hover:text-amber-500 rounded-xl hover:bg-white transition-all" title="Khôi phục mật khẩu"><Icon name="key" size={18}/></button>
                                        <button onClick={() => { setSelectedStore(stores.find(s=>s.id===e.assignedStores?.[0])); setActiveTab('stores'); setStoreSubTab('employees'); }} className="p-3 text-slate-400 hover:text-blue-500 rounded-xl hover:bg-white transition-all" title="Lịch trực"><Icon name="clock" size={18}/></button>
                                        <button onClick={() => { setEditingEmployee(e); setShowModal('editEmployee'); }} className="p-3 text-slate-400 hover:text-indigo-500 rounded-xl hover:bg-white transition-all" title="Sửa thông tin"><Icon name="edit-2" size={18}/></button>
                                        <button onClick={() => handleDeleteEmployee(null, e.id, e.name)} className="p-3 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-white transition-all" title="Xóa"><Icon name="trash-2" size={18}/></button>
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
