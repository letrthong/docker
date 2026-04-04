import React from 'react';
import { Icon, SummaryBigCard } from '../components/UI';
import StoreMap from '../components/StoreMap';

export default function AdminDashboard({ stores, globalProducts, allEmployees, setSelectedStore, setActiveTab }) {
    const handleMapSelect = (store) => {
        setSelectedStore(store);
        setActiveTab('stores');
    };

    return (
        <div className="space-y-10 animate-fade-in">
            <div className="bg-white p-3 sm:p-4 rounded-[40px] sm:rounded-[48px] border shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-white text-left">
                <SummaryBigCard color="bg-teal-600 hover:bg-teal-500" label="Sản phẩm kho tổng" value={globalProducts.reduce((a,p)=>a+Number(p.warehouseStock), 0)} icon="warehouse"/>
                <SummaryBigCard color="bg-amber-500 hover:bg-amber-400" label="Hàng tại cửa hàng" value={stores.reduce((a,s)=>a+s.inventory.reduce((sum,i)=>sum+Number(i.quantity),0), 0)} icon="package"/>
                <SummaryBigCard color="bg-indigo-400 hover:bg-indigo-300" label="Nhân sự hệ thống" value={allEmployees.length} icon="users"/>
            </div>
            <StoreMap stores={stores} onSelectStore={handleMapSelect} />
            <div className="bg-white rounded-[40px] border p-10 text-left shadow-sm">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black tracking-tight">Chi nhánh hoạt động</h3>
                    <button onClick={() => setActiveTab('stores')} className="text-xs font-black text-teal-600 hover:underline uppercase">Tất cả chi nhánh</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {stores.map(s => {
                        const storeEmpCount = allEmployees.filter(e => e.assignedStores?.includes(s.id)).length; return (
                        <div key={s.id} onClick={()=>{setSelectedStore(s); setActiveTab('stores')}} className="p-8 bg-slate-50 hover:bg-teal-50 rounded-[40px] border border-transparent hover:border-teal-200 transition-all cursor-pointer flex justify-between items-center group shadow-sm">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-[25px] bg-white flex items-center justify-center text-teal-600 shadow-sm border group-hover:scale-105 transition-all"><Icon name="store" size={24}/></div>
                                <div><p className="font-black text-xl text-slate-900 leading-none mb-1">{s.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{storeEmpCount} thành viên trực ca</p></div>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-300 group-hover:text-teal-600 shadow-sm transition-all"><Icon name="chevron-right" size={20}/></div>
                        </div>
                    )})}
                </div>
            </div>
        </div>
    );
}
