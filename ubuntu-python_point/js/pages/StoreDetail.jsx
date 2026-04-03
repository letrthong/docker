import React from 'react';
import { Icon, SubTabButton } from '../components/UI';
import { SHIFT_SLOTS, DAYS_OF_WEEK } from '../constants';

export default function StoreDetail({ currentStore, user, storeSubTab, setStoreSubTab, setSelectedStore, setEditingEmployee, setShowModal, handleSellProduct, handleDeleteEmployee, getProductInfo }) {
    return (
        <div className="space-y-10 animate-fade-in text-left">
            {user.role === 'admin' && (
                <button onClick={()=>setSelectedStore(null)} className="flex items-center text-[11px] font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-[0.2em] mb-6">
                    <Icon name="chevron-left" size={14} className="mr-2"/> Quay lại danh mục chi nhánh
                </button>
            )}
            <div className="bg-white p-12 rounded-[60px] border shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                <div className="flex items-center space-x-10">
                    <div className="bg-blue-600 text-white p-10 rounded-[45px] shadow-2xl shadow-blue-200 flex items-center justify-center"><Icon name="store" size={56}/></div>
                    <div><h2 className="text-5xl font-black tracking-tight text-slate-900 mb-2 leading-none">{currentStore.name}</h2><p className="text-slate-400 font-bold text-xl flex items-center mt-3"><Icon name="map-pin" size={24} className="mr-3 text-blue-500" /> {currentStore.location}</p></div>
                </div>
                <div className="bg-slate-50 p-10 rounded-[50px] border border-slate-100 text-center min-w-[280px] shadow-inner">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Hàng tại chi nhánh</p>
                    <p className="text-6xl font-black text-blue-600 tracking-tighter">{currentStore.inventory.length} <span className="text-xl opacity-30">MÃ</span></p>
                </div>
            </div>
            <div className="flex space-x-2 bg-slate-100 w-fit p-2 rounded-3xl shadow-inner mb-8">
                <SubTabButton active={storeSubTab === 'inventory'} onClick={() => setStoreSubTab('inventory')} label="Mặt hàng" icon="package"/>
                <SubTabButton active={storeSubTab === 'employees'} onClick={() => setStoreSubTab('employees')} label="Nhân sự & Lịch trực" icon="users"/>
            </div>

            {storeSubTab === 'inventory' && (
                <div className="bg-white rounded-[40px] border overflow-hidden p-2">
                    <table className="w-full text-sm border-separate border-spacing-y-2">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b"><tr><th className="px-10 py-6 text-left">Sản phẩm</th><th className="px-10 py-6 text-center">SKU</th><th className="px-10 py-6 text-center">Tồn kho</th><th className="px-10 py-6 text-center">Đã bán</th><th className="px-10 py-6 text-right pr-14">Giao dịch</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {currentStore.inventory.map(item => {
                                const info = getProductInfo(item.productId);
                                return (
                                    <tr key={item.productId} className="hover:bg-blue-50/20 transition-all rounded-3xl group">
                                        <td className="px-10 py-8 min-w-[300px] text-left"><p className="font-black text-xl text-slate-800 mb-1 leading-none">{info.name}</p><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">{info.category}</p></td>
                                        <td className="px-10 py-8 font-mono font-bold text-slate-400 text-xs text-center">{info.sku}</td>
                                        <td className="px-10 py-8 text-center font-black"><span className={`px-6 py-2 rounded-full text-xs border-2 ${item.quantity < 5 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{item.quantity} {info.unit}</span></td>
                                        <td className="px-10 py-8 text-center"><span className="px-6 py-2 rounded-full bg-emerald-50 text-emerald-600 font-black text-xs border-2 border-emerald-100">+{item.sold || 0}</span></td>
                                        <td className="px-10 py-8 text-right pr-14"><button onClick={() => handleSellProduct(currentStore.id, item.productId)} disabled={item.quantity === 0} className={`px-8 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 ${item.quantity > 0 ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100' : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'}`}>{item.quantity > 0 ? 'Xuất bán' : 'Hết hàng'}</button></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {storeSubTab === 'employees' && (
                <div className="bg-white rounded-[40px] border p-10 text-left">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-black tracking-tight uppercase flex items-center gap-3 leading-none"><Icon name="clock" size={24} className="text-blue-600" /> Bảng phân ca trực tuần (4h)</h3>
                        {user.role === 'admin' && (
                            <button onClick={()=>{setEditingEmployee(null); setShowModal('addEmployee');}} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg active:scale-95 transition-all"><Icon name="user-plus" size={18} className="mr-2"/> Thêm nhân sự mới</button>
                        )}
                    </div>
                    <div className="space-y-8">
                        {currentStore.employees.map(e => (
                            <div key={e.id} className="p-8 bg-slate-50 rounded-[40px] border border-transparent hover:border-blue-200 transition-all flex flex-col xl:flex-row gap-8 items-start xl:items-center relative group shadow-sm border-l-8 border-l-blue-600">
                                <div className="flex items-center gap-6 xl:w-[250px]">
                                    <div className="w-16 h-16 rounded-[25px] bg-white text-blue-600 flex items-center justify-center font-black text-2xl shadow-sm uppercase border leading-none">{e.name.charAt(0)}</div>
                                    <div><p className="font-black text-2xl text-slate-900 leading-none mb-2">{e.name}</p><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest ${e.role === 'Quản lý' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{e.role}</span></div>
                                </div>
                                <div className="flex-1 overflow-x-auto w-full no-scrollbar">
                                    <div className="flex space-x-4 min-w-[700px]">
                                        {DAYS_OF_WEEK.map(day => (
                                            <div key={day.id} className="flex-1 min-w-[80px] text-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">{day.label}</p>
                                                <div className="space-y-1.5">
                                                    {SHIFT_SLOTS.map(slot => {
                                                        const isActive = e.schedule?.[day.id]?.includes(slot.id);
                                                        return <div key={slot.id} className={`p-2 rounded-xl text-[9px] font-black border transition-all ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-white text-slate-200 border-slate-50 opacity-30 hover:opacity-100'}`} title={slot.time}>{slot.label}</div>;
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {user.role === 'admin' && (
                                    <div className="flex xl:flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={()=>{setEditingEmployee(e); setShowModal('editEmployee');}} className="p-3 bg-white text-blue-500 rounded-xl shadow-sm border hover:bg-blue-500 hover:text-white transition-all"><Icon name="edit-2" size={18}/></button>
                                        <button onClick={()=>handleDeleteEmployee(currentStore.id, e.id, e.name)} className="p-3 bg-white text-rose-500 rounded-xl shadow-sm border hover:bg-rose-500 hover:text-white transition-all"><Icon name="trash-2" size={18}/></button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
