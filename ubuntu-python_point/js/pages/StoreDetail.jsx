import React, { useState } from 'react';
import { Icon, SubTabButton, StoreStatusBadge, getShiftColorClass } from '../components/UI';
import { DAYS_OF_WEEK } from '../constants';

export default function StoreDetail({ currentStore, storeTransactions = [], allEmployees = [], user, storeSubTab, setStoreSubTab, setSelectedStore, setEditingEmployee, setEditingStore, setSellingItem, setShowModal, handleSellProduct, handleDeleteEmployee, handleResetPassword, handleUpdateEmployeeStatus, getProductInfo, warehouseTransactions = [], stockRequests = [], handleReceiveStockRequest, shiftSlots = [] }) {
    const isManager = user.role === 'admin' || (user.role === 'staff' && user.staffRole === 'Quản lý');
    const storeTxs = warehouseTransactions.filter(tx => tx.storeId === currentStore.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const storeRequests = stockRequests.filter(r => r.storeId === currentStore.id);

    const storeEmployees = allEmployees.filter(e => e.assignedStores?.includes(currentStore.id));

    const typeLabel = { import: 'Nhập kho', distribute: 'Nhận hàng', sell: 'Bán hàng', return: 'Hoàn kho', transfer_out: 'Xuất luân chuyển', transfer_in: 'Nhận luân chuyển' };
    const typeColor = { import: 'bg-emerald-50 text-emerald-600 border-emerald-100', distribute: 'bg-orange-50 text-orange-600 border-orange-100', sell: 'bg-blue-50 text-blue-600 border-blue-100', return: 'bg-rose-50 text-rose-600 border-rose-100', transfer_out: 'bg-indigo-50 text-indigo-600 border-indigo-100', transfer_in: 'bg-teal-50 text-teal-600 border-teal-100' };
    const typeIcon = { import: 'arrow-down-left', distribute: 'arrow-down-left', sell: 'shopping-cart', return: 'corner-up-left', transfer_out: 'truck', transfer_in: 'package-check' };

    // Dữ liệu cho Báo cáo tháng
    const [reportMonth, setReportMonth] = useState(new Date().getMonth());
    const [reportYear, setReportYear] = useState(new Date().getFullYear());
    const [inventorySort, setInventorySort] = useState('none');
    const [inventorySearchTerm, setInventorySearchTerm] = useState('');
    const daysInMonth = new Date(reportYear, reportMonth + 1, 0).getDate();

    const allTxs = storeTransactions && storeTransactions.length > 0 ? storeTransactions : storeTxs;
    const availableYears = [...new Set(allTxs.map(tx => new Date(tx.date).getFullYear()).filter(y => !isNaN(y)))];
    if (!availableYears.includes(new Date().getFullYear())) availableYears.push(new Date().getFullYear());
    availableYears.sort((a, b) => b - a); // Sắp xếp năm giảm dần

    const txsThisMonth = allTxs.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate.getMonth() === reportMonth && txDate.getFullYear() === reportYear;
    });

    // Lấy các giao dịch PHÁT SINH SAU tháng báo cáo (để tính ngược lại tồn kho)
    const txsAfterMonth = allTxs.filter(tx => {
        const txDate = new Date(tx.date);
        const txYear = txDate.getFullYear();
        return txYear > reportYear || (txYear === reportYear && txDate.getMonth() > reportMonth);
    });

    const dailyRevenue = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const revenue = txsThisMonth
            .filter(tx => tx.type === 'sell' && new Date(tx.date).getDate() === day)
            .reduce((sum, tx) => sum + (tx.quantity * (tx.unitPrice || 0)), 0);
        return { day, revenue };
    });
    const maxRevenue = Math.max(...dailyRevenue.map(d => d.revenue), 1);
    const totalMonthlyRevenue = dailyRevenue.reduce((sum, d) => sum + d.revenue, 0);
    const averageRevenue = totalMonthlyRevenue / daysInMonth;
    const avgHeightPct = maxRevenue > 0 ? (averageRevenue / maxRevenue) * 100 : 0;

    const sortedInventory = [...currentStore.inventory].sort((a, b) => {
        if (inventorySort === 'asc') return Number(a.quantity) - Number(b.quantity);
        if (inventorySort === 'desc') return Number(b.quantity) - Number(a.quantity);
        return 0;
    });

    const displayedInventory = sortedInventory.filter(item => {
        if (!inventorySearchTerm) return true;
        const info = getProductInfo(item.productId);
        const term = inventorySearchTerm.toLowerCase();
        return (info.name && info.name.toLowerCase().includes(term)) || (info.sku && info.sku.toLowerCase().includes(term));
    });

    // Tiền xử lý dữ liệu cho bảng báo cáo Nhập-Xuất-Tồn
    const reportInventoryData = currentStore.inventory.map(item => {
        const productInfo = getProductInfo(item.productId);
        
        const itemTxsThisMonth = txsThisMonth.filter(tx => tx.productId === item.productId);
        const imported = itemTxsThisMonth.filter(tx => ['receive', 'transfer_in'].includes(tx.type)).reduce((sum, tx) => sum + tx.quantity, 0);
        const exported = itemTxsThisMonth.filter(tx => ['sell', 'return', 'transfer_out'].includes(tx.type)).reduce((sum, tx) => sum + tx.quantity, 0);

        const itemTxsAfter = txsAfterMonth.filter(tx => tx.productId === item.productId);
        const importedAfter = itemTxsAfter.filter(tx => ['receive', 'transfer_in'].includes(tx.type)).reduce((sum, tx) => sum + tx.quantity, 0);
        const exportedAfter = itemTxsAfter.filter(tx => ['sell', 'return', 'transfer_out'].includes(tx.type)).reduce((sum, tx) => sum + tx.quantity, 0);
        
        const endingInventory = Number(item.quantity) - importedAfter + exportedAfter;
        const beginningInventory = endingInventory - imported + exported;
        const endingValue = endingInventory * (productInfo?.basePrice || 0); // Tính Thành tiền dựa trên Đơn giá (Giá bán)
        
        return { productId: item.productId, productInfo, beginningInventory, imported, exported, endingInventory, endingValue };
    });
    const totalEndingValue = reportInventoryData.reduce((sum, item) => sum + item.endingValue, 0);

    return (
        <div className="space-y-10 animate-fade-in text-left">
            {user.role === 'admin' && (
                <button onClick={()=>setSelectedStore(null)} className="flex items-center text-[11px] font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-[0.2em] mb-6">
                    <Icon name="chevron-left" size={14} className="mr-2"/> Quay lại danh mục chi nhánh
                </button>
            )}
            <div className="bg-white p-6 sm:p-8 rounded-[32px] border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center space-x-6">
                    <div className="bg-blue-50 text-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"><Icon name="store" size={32}/></div>
                    <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-black tracking-tight text-slate-900 leading-none">{currentStore.name}</h2>
                        {user.role === 'admin' && (
                            <button onClick={() => { setEditingStore(currentStore); setShowModal('editStore'); }} className="text-slate-300 hover:text-blue-600 transition-colors">
                                <Icon name="edit-2" size={18} />
                            </button>
                        )}
                    </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-slate-500 font-medium text-sm">
                            <p className="flex items-center"><Icon name="map-pin" size={16} className="mr-1.5 text-blue-500" /> {currentStore.location}</p>
                            {currentStore.hotline && (
                                <p className="flex items-center"><Icon name="phone" size={16} className="mr-1.5 text-rose-500" /> <a href={`tel:${currentStore.hotline}`} className="hover:text-rose-600 hover:underline">{currentStore.hotline}</a></p>
                            )}
                            {currentStore.website && (
                                <p className="flex items-center"><Icon name="globe" size={16} className="mr-1.5 text-emerald-500" /> <a href={currentStore.website} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 hover:underline">{currentStore.website}</a></p>
                            )}
                            {(currentStore.openTime || currentStore.closeTime) && (
                                <p className="flex items-center"><Icon name="clock" size={16} className="mr-1.5 text-orange-500" /> {currentStore.openTime || '08:00'} - {currentStore.closeTime || '22:00'} <span className="ml-2"><StoreStatusBadge openTime={currentStore.openTime} closeTime={currentStore.closeTime} /></span></p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 flex items-center gap-6 w-full md:w-auto justify-between md:justify-start">
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tổng số lượng</p><p className="text-2xl font-black text-blue-600 leading-none">{currentStore.inventory.reduce((sum, i) => sum + Number(i.quantity), 0)} <span className="text-sm opacity-50">SP</span></p></div>
                    <div className="w-px h-10 bg-slate-200"></div>
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Mã sản phẩm</p><p className="text-2xl font-black text-slate-700 leading-none">{currentStore.inventory.length} <span className="text-sm opacity-50">SKU</span></p></div>
                </div>
            </div>
            <div className="flex space-x-1 sm:space-x-2 bg-slate-100 w-full md:w-fit p-1.5 sm:p-2 rounded-2xl sm:rounded-3xl shadow-inner mb-6 overflow-x-auto no-scrollbar">
                <SubTabButton active={storeSubTab === 'inventory'} onClick={() => setStoreSubTab('inventory')} label="Mặt hàng" icon="package"/>
                <SubTabButton active={storeSubTab === 'employees'} onClick={() => setStoreSubTab('employees')} label="Nhân sự & Lịch trực" icon="users"/>
                {isManager && (
                    <SubTabButton active={storeSubTab === 'history'} onClick={() => setStoreSubTab('history')} label="Lịch sử giao dịch" icon="history"/>
                )}
                {isManager && (
                    <SubTabButton active={storeSubTab === 'requests'} onClick={() => setStoreSubTab('requests')} label="Yêu cầu cấp hàng" icon="package-plus"/>
                )}
                <SubTabButton active={storeSubTab === 'report'} onClick={() => setStoreSubTab('report')} label="Báo cáo tháng" icon="bar-chart-3"/>
            </div>

            {storeSubTab === 'inventory' && (
                <div className="bg-white rounded-[40px] border overflow-hidden p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <h3 className="text-xl font-black tracking-tight uppercase flex items-center gap-3 leading-none"><Icon name="package" size={24} className="text-blue-600" /> Tồn kho chi nhánh</h3>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Icon name="search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input 
                                    type="text" 
                                    placeholder="Tìm tên hoặc mã SKU..." 
                                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 text-xs font-bold transition-all" 
                                    value={inventorySearchTerm} 
                                    onChange={e => setInventorySearchTerm(e.target.value)} 
                                />
                            </div>
                            <div className="flex gap-2">
                                {isManager && (
                                    <button onClick={() => setShowModal('transferStock')} className="bg-indigo-50 text-indigo-600 px-4 py-2 sm:px-6 sm:py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center border border-indigo-100 active:scale-95 transition-all hover:bg-indigo-500 hover:text-white"><Icon name="truck" size={18} className="mr-2 hidden sm:block"/> Luân chuyển</button>
                                )}
                                {isManager && (
                                    <button onClick={() => setShowModal('returnStock')} className="bg-rose-50 text-rose-600 px-4 py-2 sm:px-6 sm:py-3 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center border border-rose-100 active:scale-95 transition-all hover:bg-rose-500 hover:text-white"><Icon name="corner-up-left" size={18} className="mr-2 hidden sm:block"/> Hoàn trả</button>
                                )}
                            </div>
                        </div>
                    </div>
                    <table className="w-full text-sm border-separate border-spacing-y-2">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b"><tr><th className="px-10 py-6 text-left">Sản phẩm</th><th className="px-10 py-6 text-center">SKU</th><th className="px-10 py-6 text-center cursor-pointer hover:text-blue-600 transition-colors select-none" onClick={() => setInventorySort(prev => prev === 'none' ? 'desc' : prev === 'desc' ? 'asc' : 'none')} title="Nhấn để sắp xếp">Số lượng {inventorySort === 'none' ? '↕' : inventorySort === 'desc' ? '↓' : '↑'}</th><th className="px-10 py-6 text-center">Đơn vị</th><th className="px-10 py-6 text-center">Đơn giá</th><th className="px-10 py-6 text-center">Đã bán</th><th className="px-10 py-6 text-right pr-14">Giao dịch</th></tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {displayedInventory.length === 0 && (
                                <tr><td colSpan="7" className="text-center text-slate-400 py-10 font-bold">Không tìm thấy sản phẩm nào phù hợp.</td></tr>
                            )}
                            {displayedInventory.map(item => {
                                const info = getProductInfo(item.productId);
                                return (
                                    <tr key={item.productId} className="hover:bg-blue-50/20 transition-all rounded-3xl group">
                                        <td className="px-10 py-6 min-w-[300px] text-left">
                                            <div className="flex items-center gap-4">
                                                {info.image ? (
                                                    <img src={info.image} alt={info.name} className="w-12 h-12 rounded-xl object-cover border shadow-sm shrink-0 bg-white" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 shrink-0 border border-slate-200"><Icon name="package" size={20}/></div>
                                                )}
                                                <div>
                                                    <p className="font-black text-xl text-slate-800 mb-1 leading-none">{info.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">{info.category}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 font-mono font-bold text-slate-400 text-xs text-center">{info.sku}</td>
                                    <td className="px-10 py-8 text-center font-black"><span className={`px-6 py-2 rounded-full text-xs border-2 ${item.quantity < 5 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{item.quantity}</span></td>
                                    <td className="px-10 py-8 text-center font-bold text-slate-500">{info.unit}</td>
                                    <td className="px-10 py-8 text-center font-black text-slate-800">{(info.basePrice || 0).toLocaleString()} đ</td>
                                        <td className="px-10 py-8 text-center"><span className="px-6 py-2 rounded-full bg-emerald-50 text-emerald-600 font-black text-xs border-2 border-emerald-100">+{item.sold || 0}</span></td>
                                        <td className="px-10 py-8 text-right pr-14"><button onClick={() => { setSellingItem({ ...item, name: info.name, unit: info.unit, image: info.image }); setShowModal('sellProduct'); }} disabled={item.quantity === 0} className={`px-8 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 ${item.quantity > 0 ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100' : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'}`}>{item.quantity > 0 ? 'Xuất bán' : 'Hết hàng'}</button></td>
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

            {storeSubTab === 'report' && (
                <div className="bg-white rounded-[40px] border shadow-sm p-10 text-left animate-fade-in space-y-10">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <h2 className="text-2xl font-black text-slate-900">Báo cáo Hoạt động - Tháng {reportMonth + 1}/{reportYear}</h2>
                        <div className="flex gap-3">
                            <select value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))} className="px-5 py-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer text-slate-700">
                                {Array.from({length: 12}, (_, i) => <option key={i} value={i}>Tháng {i + 1}</option>)}
                            </select>
                            <select value={reportYear} onChange={e => setReportYear(Number(e.target.value))} className="px-5 py-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer text-slate-700">
                                {availableYears.map(y => <option key={y} value={y}>Năm {y}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    {/* Biểu đồ doanh thu theo ngày */}
                    <div className="bg-slate-50 p-8 rounded-[30px] border">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Icon name="bar-chart-3" size={20} className="text-blue-600"/> Doanh thu Bán hàng mỗi ngày</h3>
                            <div className="bg-white px-5 py-3 rounded-2xl border shadow-sm text-left sm:text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng doanh thu tháng</p>
                                <p className="text-xl font-black text-emerald-600 leading-none">{totalMonthlyRevenue.toLocaleString()} đ</p>
                            </div>
                        </div>
                        <div className="flex items-end gap-1 sm:gap-2 h-[240px] pt-4 border-b border-l border-slate-200 relative ml-8 sm:ml-12 pl-2">
                            <div className="absolute -left-2 top-0 bottom-0 flex flex-col justify-between text-[10px] font-bold text-slate-400 pointer-events-none transform -translate-x-full text-right pr-2 w-16 sm:w-20">
                                <span>{maxRevenue.toLocaleString()} đ</span>
                                <span>{(maxRevenue / 2).toLocaleString()} đ</span>
                                <span>0 đ</span>
                            </div>
                            {dailyRevenue.map((d) => {
                                const heightPct = (d.revenue / maxRevenue) * 100;
                                return (
                                    <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group relative">
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-md">
                                            Ngày {d.day}: {d.revenue.toLocaleString()} đ
                                        </div>
                                        <div className="w-full max-w-[20px] bg-blue-500 rounded-t-[4px] transition-all duration-500 group-hover:bg-blue-400" style={{ height: `${Math.max(heightPct, heightPct > 0 ? 1 : 0)}%`, minHeight: heightPct > 0 ? '4px' : '0' }}></div>
                                        <p className="text-[10px] font-black text-slate-400 leading-none">{d.day}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bảng báo cáo Tồn / Nhập / Bán */}
                    <div className="overflow-hidden border rounded-3xl">
                        <table className="w-full text-left text-sm border-separate border-spacing-y-0">
                            <thead className="bg-slate-50 border-b">
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="px-6 py-4 border-b">Sản phẩm</th>
                                    <th className="px-6 py-4 text-center border-b">Đơn giá</th>
                                    <th className="px-6 py-4 text-center border-b">Tồn đầu kỳ</th>
                                    <th className="px-6 py-4 text-center border-b">Nhập trong tháng</th>
                                    <th className="px-6 py-4 text-center border-b">Xuất/Bán trong tháng</th>
                                    <th className="px-6 py-4 text-center border-b">Tồn cuối kỳ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {reportInventoryData.map(item => (
                                    <tr key={item.productId} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-800">{item.productInfo?.name || item.productId}</td>
                                        <td className="px-6 py-4 text-center font-black text-slate-800">{(item.productInfo?.basePrice || 0).toLocaleString()} đ</td>
                                        <td className="px-6 py-4 text-center font-black text-slate-500">{item.beginningInventory}</td>
                                        <td className="px-6 py-4 text-center font-black text-emerald-600">+{item.imported}</td>
                                        <td className="px-6 py-4 text-center font-black text-blue-600">-{item.exported}</td>
                                        <td className="px-6 py-4 text-center font-black text-slate-800">{item.endingInventory}</td>
                                    </tr>
                                ))}
                                {reportInventoryData.length === 0 && (
                                    <tr><td colSpan="6" className="text-center text-slate-400 py-8 font-bold">Chưa có dữ liệu sản phẩm trong kho.</td></tr>
                                )}
                                {reportInventoryData.length > 0 && (
                                    <tr className="bg-slate-50">
                                        <td colSpan="5" className="px-6 py-5 text-right font-black text-slate-500 uppercase tracking-widest">Tổng giá trị tồn cuối kỳ</td>
                                        <td className="px-6 py-5 text-center font-black text-indigo-600 text-lg">{totalEndingValue.toLocaleString()} đ</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
