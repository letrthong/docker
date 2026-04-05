import React from 'react';
import { Icon, StoreStatusBadge } from '../components/UI';

export default function AdminStores({ stores, allEmployees = [], setSelectedStore, setShowModal, handleDeleteStore, setEditingStore }) {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center text-left">
                <div><h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Mạng lưới Chi nhánh</h2><p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Đang vận hành {stores.length} địa điểm</p></div>
                <button onClick={() => setShowModal('addStore')} className="bg-blue-600 text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl flex items-center hover:scale-105 transition-all"><Icon name="plus" size={18} className="mr-2"/> Thêm chi nhánh</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {stores.map(s => {
                    const storeEmpCount = allEmployees.filter(e => e.assignedStores?.includes(s.id)).length; return (
                    <div key={s.id} onClick={() => setSelectedStore(s)} className="bg-white rounded-[40px] border shadow-sm hover:shadow-2xl transition-all group cursor-pointer relative overflow-hidden flex flex-col h-full border-b-4 border-b-transparent hover:border-b-blue-600">
                        {s.image ? (
                            <div className="h-40 w-full relative overflow-hidden bg-slate-100 shrink-0">
                                <img src={s.image} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none"></div>
                                <div className="absolute bottom-4 left-8 text-white"><Icon name="store" size={24} className="opacity-80"/></div>
                            </div>
                        ) : (
                            <div className="pt-8 px-8 pb-0">
                                <div className="bg-blue-50 text-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shrink-0"><Icon name="store" size={28}/></div>
                            </div>
                        )}
                        <div className={`px-8 pb-8 flex-1 flex flex-col ${s.image ? 'pt-6' : ''}`}>
                            <h3 className="font-black text-2xl text-slate-900 mb-2 text-left leading-tight">{s.name}</h3>
                            <div className="mb-auto space-y-2 relative z-10">
                            <p className="text-sm text-slate-400 flex items-center font-medium text-left leading-relaxed"><Icon name="map-pin" size={14} className="mr-2 text-blue-500 shrink-0"/> {s.location}</p>
                            {s.hotline && <p className="text-sm text-slate-400 flex items-center font-medium text-left leading-relaxed"><Icon name="phone" size={14} className="mr-2 text-rose-500 shrink-0"/> <a href={`tel:${s.hotline}`} className="hover:text-rose-600 hover:underline truncate">{s.hotline}</a></p>}
                            {s.website && <p className="text-sm text-slate-400 flex items-center font-medium text-left leading-relaxed"><Icon name="globe" size={14} className="mr-2 text-emerald-500 shrink-0"/> <a href={s.website} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 hover:underline truncate">{s.website}</a></p>}
                            {(s.openTime || s.closeTime) && <p className="text-sm text-slate-400 flex items-center font-medium text-left leading-relaxed"><Icon name="clock" size={14} className="mr-2 text-orange-500 shrink-0"/> {s.openTime || '08:00'} - {s.closeTime || '22:00'} <StoreStatusBadge openTime={s.openTime} closeTime={s.closeTime} /></p>}
                        </div>
                        <div className="mt-8 pt-6 border-t flex items-center justify-between">
                            <span className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-1.5"><Icon name="users" size={14} className="text-slate-300"/> {storeEmpCount} Nhân sự</span>
                            <div className="flex items-center text-xs font-black text-blue-600 uppercase tracking-tighter">Chi tiết <Icon name="chevron-right" size={16} className="ml-1 group-hover:translate-x-1 transition-transform" /></div>
                        </div>
                        </div>
                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => { e.stopPropagation(); setEditingStore(s); setShowModal('editStore'); }} className="p-2 text-slate-200 hover:text-blue-500"><Icon name="edit-2" size={18}/></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteStore(s.id, s.name); }} className="p-2 text-slate-200 hover:text-rose-500"><Icon name="trash-2" size={18}/></button>
                    </div>
                    </div>
                )})}
            </div>
        </div>
    );
}
