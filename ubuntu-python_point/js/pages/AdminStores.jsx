import React from 'react';
import { Icon } from '../components/UI';

export default function AdminStores({ stores, setSelectedStore, setShowModal, handleDeleteStore }) {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center text-left">
                <div><h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Mạng lưới Chi nhánh</h2><p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Đang vận hành {stores.length} địa điểm</p></div>
                <button onClick={() => setShowModal('addStore')} className="bg-blue-600 text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl flex items-center hover:scale-105 transition-all"><Icon name="plus" size={18} className="mr-2"/> Thêm chi nhánh</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {stores.map(s => (
                    <div key={s.id} onClick={() => setSelectedStore(s)} className="bg-white p-8 rounded-[40px] border shadow-sm hover:shadow-2xl transition-all group cursor-pointer relative overflow-hidden flex flex-col h-full border-b-4 border-b-transparent hover:border-b-blue-600">
                        <div className="bg-blue-50 text-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Icon name="store" size={28}/></div>
                        <h3 className="font-black text-2xl text-slate-900 mb-2 text-left">{s.name}</h3>
                        <p className="text-sm text-slate-400 flex items-center font-medium mb-auto text-left leading-relaxed"><Icon name="map-pin" size={14} className="mr-2 text-blue-500 shrink-0"/> {s.location}</p>
                        <div className="mt-8 pt-6 border-t flex items-center justify-between">
                            <span className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-1.5"><Icon name="users" size={14} className="text-slate-300"/> {s.employees.length} Nhân sự</span>
                            <div className="flex items-center text-xs font-black text-blue-600 uppercase tracking-tighter">Chi tiết <Icon name="chevron-right" size={16} className="ml-1 group-hover:translate-x-1 transition-transform" /></div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteStore(s.id, s.name); }} className="absolute top-6 right-6 p-2 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Icon name="trash-2" size={18}/></button>
                    </div>
                ))}
            </div>
        </div>
    );
}
