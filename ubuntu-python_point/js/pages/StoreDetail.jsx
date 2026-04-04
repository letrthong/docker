import React from 'react';
import { Icon, SubTabButton, StoreStatusBadge, getShiftColorClass } from '../components/UI';
import { DAYS_OF_WEEK } from '../constants';

export default function StoreDetail({ currentStore, allEmployees = [], user, storeSubTab, setStoreSubTab, setSelectedStore, setEditingEmployee, setEditingStore, setSellingItem, setShowModal, handleSellProduct, handleDeleteEmployee, handleResetPassword, handleUpdateEmployeeStatus, getProductInfo, warehouseTransactions = [], stockRequests = [], handleReceiveStockRequest, shiftSlots = [] }) {
    const isManager = user.role === 'admin' || (user.role === 'staff' && user.staffRole === 'Quản lý');
    const storeTxs = warehouseTransactions.filter(tx => tx.storeId === currentStore.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const storeRequests = stockRequests.filter(r => r.storeId === currentStore.id);

    const storeEmployees = allEmployees.filter(e => e.assignedStores?.includes(currentStore.id));

    const typeLabel = { import: 'Nhập kho', distribute: 'Nhận hàng', sell: 'Bán hàng', return: 'Hoàn kho', transfer_out: 'Xuất luân chuyển', transfer_in: 'Nhận luân chuyển' };
    const typeColor = { import: 'bg-emerald-50 text-emerald-600 border-emerald-100', distribute: 'bg-orange-50 text-orange-600 border-orange-100', sell: 'bg-blue-50 text-blue-600 border-blue-100', return: 'bg-rose-50 text-rose-600 border-rose-100', transfer_out: 'bg-indigo-50 text-indigo-600 border-indigo-100', transfer_in: 'bg-teal-50 text-teal-600 border-teal-100' };
    const typeIcon = { import: 'arrow-down-left', distribute: 'arrow-down-left', sell: 'shopping-cart', return: 'corner-up-left', transfer_out: 'truck', transfer_in: 'package-check' };

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
                    <div>
                    <div className="flex items-center gap-4 mb-2">
                        <h2 className="text-5xl font-black tracking-tight text-slate-900 leading-none">{currentStore.name}</h2>
                        {user.role === 'admin' && (
                            <button onClick={() => { setEditingStore(currentStore); setShowModal('editStore'); }} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                                <Icon name="edit-2" size={24} />
                            </button>
                        )}
                    </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-slate-400 font-bold text-xl">
                            <p className="flex items-center"><Icon name="map-pin" size={24} className="mr-2 text-blue-500" /> {currentStore.location}</p>
                            {(currentStore.openTime || currentStore.closeTime) && (
                                <p className="flex items-center"><Icon name="clock" size={24} className="mr-2 text-orange-500" /> {currentStore.openTime || '08:00'} - {currentStore.closeTime || '22:00'} <StoreStatusBadge openTime={currentStore.openTime} closeTime={currentStore.closeTime} /></p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 p-10 rounded-[50px] border border-slate-100 text-center min-w-[280px] shadow-inner">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Hàng tại chi nhánh</p>
                    <p className="text-6xl font-black text-blue-600 tracking-tighter">{currentStore.inventory.reduce((sum, i) => sum + Number(i.quantity), 0)} <span className="text-xl opacity-30">SP</span></p>
                    <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-widest">{currentStore.inventory.length} mã sản phẩm (SKU)</p>
                </div>
            </div>
            <div className="flex space-x-2 bg-slate-100 w-fit p-2 rounded-3xl shadow-inner mb-8">
                <SubTabButton active={storeSubTab === 'inventory'} onClick={() => setStoreSubTab('inventory')} label="Mặt hàng" icon="package"/>
                <SubTabButton active={storeSubTab === 'employees'} onClick={() => setStoreSubTab('employees')} label="Nhân sự & Lịch trực" icon="users"/>
                {isManager && (
                    <SubTabButton active={storeSubTab === 'history'} onClick={() => setStoreSubTab('history')} label="Lịch sử giao dịch" icon="history"/>
                )}
                {isManager && (
                    <SubTabButton active={storeSubTab === 'requests'} onClick={() => setStoreSubTab('requests')} label="Yêu cầu cấp hàng" icon="package-plus"/>
                )}
            </div>

            {storeSubTab === 'inventory' && (
                <div className="bg-white rounded-[40px] border overflow-hidden p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black tracking-tight uppercase flex items-center gap-3 leading-none"><Icon name="package" size={24} className="text-blue-600" /> Tồn kho chi nhánh</h3>
                        <div className="flex gap-2">
                            {isManager && (
                                <button onClick={() => setShowModal('transferStock')} className="bg-indigo-50 text-indigo-600 px-4 py-2 sm:px-6 sm:py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center border border-indigo-100 active:scale-95 transition-all hover:bg-indigo-500 hover:text-white"><Icon name="truck" size={18} className="mr-2 hidden sm:block"/> Luân chuyển</button>
                            )}
                            {isManager && (
                                <button onClick={() => setShowModal('returnStock')} className="bg-rose-50 text-rose-600 px-4 py-2 sm:px-6 sm:py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center border border-rose-100 active:scale-95 transition-all hover:bg-rose-500 hover:text-white"><Icon name="corner-up-left" size={18} className="mr-2 hidden sm:block"/> Hoàn trả</button>
                            )}
                        </div>
                    </div>
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
                                        <td className="px-10 py-8 text-right pr-14"><button onClick={() => { setSellingItem({ ...item, name: info.name, unit: info.unit }); setShowModal('sellProduct'); }} disabled={item.quantity === 0} className={`px-8 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 ${item.quantity > 0 ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100' : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'}`}>{item.quantity > 0 ? 'Xuất bán' : 'Hết hàng'}</button></td>
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
                        <h3 className="text-2xl font-black tracking-tight uppercase flex items-center gap-3 leading-none"><Icon name="clock" size={24} className="text-blue-600" /> Bảng phân ca trực tuần</h3>
                        {isManager && (
                            <div className="flex gap-3">
                                <button onClick={()=>{setShowModal('addExistingEmployee');}} className="bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center shadow-sm active:scale-95 transition-all hover:bg-slate-200"><Icon name="search" size={18} className="mr-2"/> Tìm từ hệ thống</button>
                                <button onClick={()=>{setEditingEmployee(null); setShowModal('addEmployee');}} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg active:scale-95 transition-all hover:bg-blue-700"><Icon name="user-plus" size={18} className="mr-2"/> Thêm mới</button>
                            </div>
                        )}
                    </div>
                    <div className="space-y-8">
                    {storeEmployees.map(e => {
                        const canViewCccd = user.role === 'admin' || user.username === e.username;
                        let totalHours = 0;
                        if (e.schedule) {
                            Object.values(e.schedule).forEach(storeSch => {
                                Object.values(storeSch || {}).forEach(shifts => {
                                    if (Array.isArray(shifts)) {
                                        shifts.forEach(shiftId => {
                                            const slot = shiftSlots.find(s => s.id === shiftId);
                                            if (slot && slot.time) {
                                                const pts = slot.time.split('-');
                                                if(pts.length === 2) {
                                                    const [sh, sm] = pts[0].trim().split(':').map(Number);
                                                    const [eh, em] = pts[1].trim().split(':').map(Number);
                                                    if (!isNaN(sh) && !isNaN(eh)) {
                                                        let h = (eh + (em||0)/60) - (sh + (sm||0)/60);
                                                        if (h < 0) h += 24;
                                                        totalHours += h;
                                                        return;
                                                    }
                                                }
                                            }
                                            totalHours += 4;
                                        });
                                    }
                                });
                            });
                        }
                        totalHours = Math.round(totalHours * 10) / 10;
                        return (
                            <div key={e.id} className="p-8 bg-slate-50 rounded-[40px] border border-transparent hover:border-blue-200 transition-all flex flex-col xl:flex-row gap-8 items-start xl:items-center relative group shadow-sm border-l-8 border-l-blue-600">
                                <div className="flex items-center gap-6 xl:w-[250px]">
                                    <div className="w-16 h-16 rounded-[25px] bg-white text-blue-600 flex items-center justify-center font-black text-2xl shadow-sm uppercase border leading-none overflow-hidden shrink-0">{(canViewCccd && e.cccdImage) ? <img src={e.cccdImage} className="w-full h-full object-cover" alt="CCCD"/> : e.name.charAt(0)}</div>
                                    <div>
                                        <p className="font-black text-2xl text-slate-900 leading-none mb-2">{e.name}</p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest ${e.role === 'Quản lý' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{e.role}</span>
                                            {canViewCccd && <span className="px-3 py-1 rounded-full text-[10px] font-black text-slate-500 border border-slate-200 bg-white">ID: {e.cccd || e.id}</span>}
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest ${e.status === 'disable' ? 'bg-rose-50 text-rose-500 border-rose-200' : (!e.status || e.status === 'active') ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>{e.status === 'disable' ? 'Vô hiệu' : (!e.status || e.status === 'active') ? 'Đã duyệt' : 'Chờ duyệt'}</span>
                                            <span className="px-3 py-1 rounded-full text-[10px] font-black text-blue-600 border border-blue-200 bg-blue-50">{totalHours}h / tuần</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-x-auto w-full no-scrollbar">
                                    <div className="flex space-x-2 min-w-[700px]">
                                        <div className="w-20 shrink-0 flex flex-col pt-7 space-y-1.5">
                                            {shiftSlots.filter(s => !s.hidden).map(slot => (
                                                <div key={slot.id} className="h-8 flex flex-col justify-center text-right pr-3 border-r-2 border-slate-100">
                                                    <p className="text-[10px] font-black text-slate-700 leading-none">{slot.label}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 mt-0.5 tracking-tighter">{slot.time}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {DAYS_OF_WEEK.map(day => (
                                            <div key={day.id} className="flex-1 min-w-[60px] text-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">{day.label}</p>
                                                <div className="space-y-1.5">
                                                    {shiftSlots.filter(s => !s.hidden).map(slot => {
                                                    const storeSchedule = e.schedule?.[currentStore.id] || {};
                                                    const isActive = storeSchedule[day.id]?.includes(slot.id);
                                                        return <div key={slot.id} className={`h-8 rounded-xl border flex items-center justify-center transition-all ${getShiftColorClass(slot.color, isActive, true)}`} title={`${slot.label} (${slot.time})`}>
                                                            {isActive ? <Icon name="check" size={14}/> : <span className="w-1.5 h-1.5 rounded-full bg-slate-100"></span>}
                                                        </div>;
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {isManager && (
                                    <div className="flex xl:flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {user.role === 'admin' && e.status === 'create' && (
                                            <button onClick={() => handleUpdateEmployeeStatus(e.id, 'active')} className="p-3 bg-white text-emerald-500 rounded-xl shadow-sm border hover:bg-emerald-500 hover:text-white transition-all" title="Duyệt CCCD"><Icon name="check-circle" size={18}/></button>
                                        )}
                                        <button onClick={() => handleResetPassword(e.id, e.name)} className="p-3 bg-white text-amber-500 rounded-xl shadow-sm border hover:bg-amber-500 hover:text-white transition-all" title="Khôi phục mật khẩu"><Icon name="key" size={18}/></button>
                                        <button onClick={()=>{setEditingEmployee(e); setShowModal('editEmployee');}} className="p-3 bg-white text-blue-500 rounded-xl shadow-sm border hover:bg-blue-500 hover:text-white transition-all" title="Sửa thông tin"><Icon name="edit-2" size={18}/></button>
                                        {(user.role === 'admin' || e.username !== user.username) && <button onClick={()=>handleDeleteEmployee(currentStore.id, e.id, e.name)} className="p-3 bg-white text-rose-500 rounded-xl shadow-sm border hover:bg-rose-500 hover:text-white transition-all" title="Xóa"><Icon name="trash-2" size={18}/></button>}
                                    </div>
                                )}
                            </div>
                        )})}
                    </div>
                </div>
            )}

            {storeSubTab === 'history' && isManager && (
                <div className="bg-white rounded-[40px] border overflow-hidden p-2">
                    <table className="w-full text-left text-sm border-separate border-spacing-y-1">
                        <thead className="bg-slate-50/50 border-b"><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-10 py-6">Thời gian</th><th className="px-10 py-6 text-center">Loại</th><th className="px-10 py-6">Sản phẩm</th><th className="px-10 py-6 text-center">Số lượng</th><th className="px-10 py-6">Ghi chú</th><th className="px-10 py-6 text-right pr-14">Doanh thu</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {storeTxs.length === 0 && <tr><td colSpan="6" className="px-10 py-16 text-center text-slate-300 font-bold">Chưa có giao dịch nào</td></tr>}
                            {storeTxs.map(tx => (
                                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-10 py-6"><p className="font-bold text-slate-800">{new Date(tx.date).toLocaleDateString('vi-VN')}</p><p className="text-[10px] text-slate-400">{new Date(tx.date).toLocaleTimeString('vi-VN')}</p></td>
                                    <td className="px-10 py-6 text-center"><span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border-2 ${typeColor[tx.type]}`}><Icon name={typeIcon[tx.type]} size={12}/>{typeLabel[tx.type]}</span></td>
                                    <td className="px-10 py-6 font-black text-slate-800">{tx.productName}</td>
                                    <td className="px-10 py-6 text-center font-black text-lg text-blue-600">{tx.quantity}</td>
                                    <td className="px-10 py-6 text-xs text-slate-500 font-medium">{tx.note || '—'}</td>
                                    <td className="px-10 py-6 text-right pr-14 text-emerald-600 font-bold">{tx.type === 'sell' ? (tx.quantity * (tx.unitPrice || 0)).toLocaleString() + ' đ' : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {storeSubTab === 'requests' && isManager && (
                <div className="bg-white rounded-[40px] border overflow-hidden p-10">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-black tracking-tight uppercase flex items-center gap-3 leading-none"><Icon name="package-plus" size={24} className="text-orange-500" /> Yêu cầu cấp thêm hàng</h3>
                        <button onClick={() => setShowModal('requestStock')} className="bg-orange-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg active:scale-95 transition-all hover:bg-orange-600"><Icon name="plus" size={18} className="mr-2"/> Tạo yêu cầu mới</button>
                    </div>
                    <table className="w-full text-left text-sm border-separate border-spacing-y-1">
                        <thead className="bg-slate-50/50 border-b"><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-6 py-4">Thời gian</th><th className="px-6 py-4">Sản phẩm</th><th className="px-6 py-4 text-center">Số lượng</th><th className="px-6 py-4">Ghi chú</th><th className="px-6 py-4 text-right">Trạng thái</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {storeRequests.length === 0 && <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-300 font-bold">Chưa có yêu cầu nào</td></tr>}
                            {storeRequests.map(req => (
                                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4"><p className="font-bold text-slate-800">{new Date(req.date).toLocaleDateString('vi-VN')}</p><p className="text-[10px] text-slate-400">{new Date(req.date).toLocaleTimeString('vi-VN')}</p></td>
                                    <td className="px-6 py-4 font-black text-slate-700">{req.productName}</td>
                                    <td className="px-6 py-4 text-center font-black text-lg text-orange-500">{req.quantity}</td>
                                    <td className="px-6 py-4 text-xs text-slate-500">{req.note}</td>
                                    <td className="px-6 py-4 text-right">
                                        {req.status === 'shipping' ? (
                                            <button onClick={() => handleReceiveStockRequest(req.id)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 active:scale-95 transition-all animate-bounce">Nhận hàng</button>
                                        ) : (
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${req.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : req.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-500 border-rose-200'}`}>
                                                {req.status === 'pending' ? 'Đang chờ' : req.status === 'completed' ? 'Đã nhận' : 'Từ chối'}
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
