import React from 'react';
import { Icon } from '../components/UI';

export default function AdminStaffGlobal({ allEmployees, stores, searchTerm, setSearchTerm, setSelectedStore, setActiveTab, setStoreSubTab, setEditingEmployee, setShowModal, handleDeleteEmployee }) {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center text-left">
                <div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Nhân sự Toàn Hệ thống</h2><p className="text-slate-400 font-bold text-sm uppercase mt-1 tracking-widest">Tổng cộng {allEmployees.length} nhân viên</p></div>
                <div className="flex gap-4"><div className="relative"><Icon name="search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" /><input type="text" placeholder="Tìm tên nhân viên..." className="pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 text-sm font-bold shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>
            </div>
            <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden p-2">
                <table className="w-full text-left text-sm border-separate border-spacing-y-2">
                    <thead className="bg-slate-50/50 border-b"><tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"><th className="px-10 py-6 text-left">Nhân viên</th><th className="px-10 py-6 text-center">Vai trò</th><th className="px-10 py-6 text-center">Chi nhánh gán</th><th className="px-10 py-6 text-center">Tài khoản</th><th className="px-10 py-6 text-right pr-14">Hành động</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {allEmployees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map(e => (
                            <tr key={e.id} className="hover:bg-blue-50/20 transition-all rounded-3xl group">
                                <td className="px-10 py-8 min-w-[250px] text-left flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-white border text-blue-600 flex items-center justify-center font-black text-lg uppercase shadow-sm">{e.name.charAt(0)}</div><div><p className="font-black text-lg text-slate-900 leading-none mb-1">{e.name}</p><p className="text-[11px] font-bold text-slate-400">{e.phone}</p></div></td>
                                <td className="px-10 py-8 text-center uppercase"><span className={`px-4 py-1.5 rounded-full font-black text-[10px] border-2 ${e.role === 'Quản lý' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{e.role}</span></td>
                                <td className="px-10 py-8 text-center"><p className="font-bold text-blue-600">{e.storeName}</p></td>
                                <td className="px-10 py-8 text-center font-mono font-bold text-slate-400 text-xs">@{e.username}</td>
                                <td className="px-10 py-8 text-right pr-14">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setSelectedStore(stores.find(s=>s.id===e.storeId)); setActiveTab('stores'); setStoreSubTab('employees'); }} className="p-3 text-slate-400 hover:text-blue-500 rounded-xl hover:bg-white transition-all"><Icon name="clock" size={18}/></button>
                                        <button onClick={() => { setEditingEmployee(e); setSelectedStore(stores.find(s=>s.id===e.storeId)); setShowModal('editEmployee'); }} className="p-3 text-slate-400 hover:text-indigo-500 rounded-xl hover:bg-white transition-all"><Icon name="edit-2" size={18}/></button>
                                        <button onClick={() => handleDeleteEmployee(e.storeId, e.id, e.name)} className="p-3 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-white transition-all"><Icon name="trash-2" size={18}/></button>
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
