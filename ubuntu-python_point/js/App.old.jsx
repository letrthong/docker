import React, { useState, useEffect, useMemo } from 'react';
import { Icon, TabButton, SubTabButton, SummaryMiniCard, SummaryBigCard, Input, Select } from './components/UI';
import { EmployeeForm } from './components/EmployeeForm';
import { SHIFT_SLOTS, DAYS_OF_WEEK, CATEGORIES, initialGlobalProducts, initialStores } from './constants';

export default function App() {
    const getCache = (key, fallback) => {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    };

    const setCache = (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    };

    const [user, setUser] = useState(() => getCache('chain_user', null)); 
    const [stores, setStores] = useState(() => getCache('chain_stores', initialStores));
    const [globalProducts, setGlobalProducts] = useState(() => getCache('chain_products', initialGlobalProducts));
    const [warehouseTransactions, setWarehouseTransactions] = useState(() => getCache('chain_warehouse_tx', []));

    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedStore, setSelectedStore] = useState(null);
    const [storeSubTab, setStoreSubTab] = useState('inventory'); 
    const [showModal, setShowModal] = useState(null); 
    const [pendingAction, setPendingAction] = useState(null); 
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [toast, setToast] = useState(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [historyFilter, setHistoryFilter] = useState({ type: 'all', year: String(new Date().getFullYear()), viewMode: 'year' });

    useEffect(() => { 
        setCache('chain_user', user); 
        if(user && user.role === 'staff') setActiveTab('my-store'); 
    }, [user]);
    useEffect(() => { setCache('chain_stores', stores); }, [stores]);
    useEffect(() => { setCache('chain_products', globalProducts); }, [globalProducts]);
    useEffect(() => { setCache('chain_warehouse_tx', warehouseTransactions); }, [warehouseTransactions]);

    const currentStore = useMemo(() => {
        if (!user) return null;
        return selectedStore || (user.role === 'staff' ? stores.find(s => s.id === user.storeId) : null);
    }, [selectedStore, user, stores]);

    const allEmployees = useMemo(() => {
        return stores.flatMap(s => s.employees.map(e => ({ ...e, storeName: s.name, storeId: s.id })));
    }, [stores]);

    // Đã thêm định nghĩa totalValue để ngăn lỗi (bug) trong giao diện cũ
    const totalValue = useMemo(() => {
        return globalProducts.reduce((sum, p) => sum + (p.warehouseStock * p.basePrice), 0);
    }, [globalProducts]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (loginForm.username === 'admin' && loginForm.password === 'admin') {
            setUser({ username: 'Admin Manager', role: 'admin', name: 'Quản trị viên' });
            setActiveTab('dashboard');
        } else {
            let found = null;
            let sId = null;
            stores.forEach(s => {
                const e = s.employees.find(emp => emp.username === loginForm.username && emp.password === loginForm.password);
                if (e) { found = e; sId = s.id; }
            });
            if (found) { setUser({ username: found.username, role: 'staff', storeId: sId, name: found.name, staffRole: found.role }); } 
            else setLoginError('Sai tài khoản hoặc mật khẩu!');
        }
    };

    const handleLogout = () => { setUser(null); setSelectedStore(null); setShowUserMenu(false); localStorage.removeItem('chain_user'); };

    const requestConfirm = (actionConfig) => { setPendingAction(actionConfig); setShowModal('confirmPopup'); };

    const handleSaveEmployee = (storeId, employeeData) => {
        if (!storeId) return;
        const isEdit = !!editingEmployee;
        requestConfirm({
            type: isEdit ? 'edit' : 'add', title: isEdit ? 'Cập nhật' : 'Đăng ký mới',
            message: `Lưu hồ sơ cho ${employeeData.name}?`,
            onConfirm: () => {
                setStores(stores.map(s => {
                    if (s.id === storeId) {
                        if (isEdit) { return { ...s, employees: s.employees.map(e => e.id === editingEmployee.id ? { ...employeeData, id: e.id } : e) }; }
                        else { return { ...s, employees: [...s.employees, { ...employeeData, id: 'e' + Date.now() }] }; }
                    }
                    return s;
                }));
                setShowModal(null); setEditingEmployee(null); showToast("Đã cập nhật nhân sự.");
            }
        });
    };

    const handleDeleteEmployee = (storeId, empId, empName) => {
        requestConfirm({ type: 'delete', title: 'Xóa nhân sự', message: `Gỡ bỏ "${empName}" khỏi hệ thống?`, onConfirm: () => { setStores(stores.map(s => s.id === storeId ? { ...s, employees: s.employees.filter(e => e.id !== empId) } : s)); setShowModal(null); showToast("Đã xóa nhân sự."); }});
    };

    const handleSaveGlobalProduct = (productData) => {
        requestConfirm({ type: 'add', title: 'Tạo sản phẩm', message: `Thêm "${productData.name}" vào danh mục?`, onConfirm: () => { setGlobalProducts([...globalProducts, { ...productData, id: 'p' + Date.now(), warehouseStock: Number(productData.initialStock || 0), basePrice: Number(productData.basePrice) }]); setShowModal(null); showToast("Đã tạo sản phẩm."); }});
    };

    const handleImportToWarehouse = (productId, amount) => {
        const qty = Number(amount);
        const product = globalProducts.find(p => p.id === productId);
        setGlobalProducts(globalProducts.map(p => p.id === productId ? { ...p, warehouseStock: p.warehouseStock + qty } : p));
        setWarehouseTransactions(prev => [...prev, {
            id: 'tx' + Date.now(),
            type: 'import',
            productId,
            productName: product?.name || 'N/A',
            quantity: qty,
            date: new Date().toISOString(),
            note: `Nhập ${qty} ${product?.unit || 'cái'} vào kho tổng`
        }]);
        showToast("Đã cập nhật kho tổng.");
    };

    const handleDistribute = (storeId, productId, amount) => {
        const qty = Number(amount);
        const product = globalProducts.find(p => p.id === productId);
        const store = stores.find(s => s.id === storeId);
        setGlobalProducts(globalProducts.map(p => p.id === productId ? { ...p, warehouseStock: p.warehouseStock - qty } : p));
        setStores(stores.map(s => {
            if (s.id === storeId) {
                const exist = s.inventory.find(i => i.productId === productId);
                const inv = exist ? s.inventory.map(i => i.productId === productId ? { ...i, quantity: i.quantity + qty } : i) : [...s.inventory, { productId, quantity: qty, sold: 0 }];
                return { ...s, inventory: inv };
            }
            return s;
        }));
        setWarehouseTransactions(prev => [...prev, {
            id: 'tx' + Date.now(),
            type: 'distribute',
            productId,
            productName: product?.name || 'N/A',
            storeId,
            storeName: store?.name || 'N/A',
            quantity: qty,
            date: new Date().toISOString(),
            note: `Phân phối ${qty} ${product?.unit || 'cái'} đến ${store?.name}`
        }]);
        setShowModal(null); showToast("Đã phân phối hàng.");
    };

    const handleAddStore = (storeData) => { setStores([...stores, { ...storeData, id: 's' + Date.now(), employees: [], inventory: [], transactions: [] }]); setShowModal(null); showToast("Đã mở chi nhánh."); };

    const handleDeleteStore = (storeId, storeName) => { requestConfirm({ type: 'delete', title: 'Xóa chi nhánh', message: `Xác nhận xóa hoàn toàn chi nhánh "${storeName}"?`, onConfirm: () => { setStores(stores.filter(s => s.id !== storeId)); setSelectedStore(null); setShowModal(null); showToast("Đã xóa chi nhánh."); }}); };

    const handleSellProduct = (storeId, productId) => {
        const product = globalProducts.find(p => p.id === productId);
        const store = stores.find(s => s.id === storeId);
        setStores(stores.map(s => s.id === storeId ? { ...s, inventory: s.inventory.map(i => i.productId === productId ? { ...i, quantity: i.quantity - 1, sold: (i.sold || 0) + 1 } : i) } : s));
        setWarehouseTransactions(prev => [...prev, {
            id: 'tx' + Date.now(),
            type: 'sell',
            productId,
            productName: product?.name || 'N/A',
            storeId,
            storeName: store?.name || 'N/A',
            quantity: 1,
            unitPrice: product?.basePrice || 0,
            date: new Date().toISOString(),
            note: `Bán 1 ${product?.unit || 'cái'} tại ${store?.name}`
        }]);
        showToast("Đã ghi nhận bán hàng.");
    };

    const getProductInfo = (pid) => globalProducts.find(p => p.id === pid) || { name: 'N/A', sku: 'N/A', category: 'N/A', unit: 'cái' };

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><div className="w-full max-w-[380px] bg-white rounded-[32px] shadow-2xl p-10 text-center"><div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mb-6"><Icon name="package" size={32} /></div><h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2 uppercase">ĐĂNG NHẬP</h1><p className="text-slate-400 text-sm mb-8 font-medium leading-relaxed">Hệ thống quản lý chuỗi hợp nhất<br/>v2.5 Professional</p><form onSubmit={handleLogin} className="space-y-4">{loginError && <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs font-bold border border-rose-100">{loginError}</div>}<input type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="Username" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} /><input type="password" required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} /><button className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all uppercase text-xs tracking-widest mt-4">Vào hệ thống</button></form></div></div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-white border-b sticky top-0 z-50 h-20 px-8 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-6 lg:space-x-10"><div className="flex items-center space-x-3 cursor-pointer group" onClick={() => user.role === 'admin' && setActiveTab('dashboard')}><div className="bg-blue-600 p-2.5 rounded-xl shadow-lg group-hover:scale-105 transition-transform"><Icon name="package" size={22} className="text-white" /></div><h1 className="text-xl font-black tracking-tighter text-slate-900 uppercase hidden sm:block">ChainFlow</h1></div>
                    <nav className="flex items-center space-x-1 h-20 overflow-x-auto no-scrollbar">
                        {user.role === 'admin' ? (
                            <><TabButton active={activeTab === 'dashboard'} onClick={() => {setActiveTab('dashboard'); setSelectedStore(null)}} label="Tổng quan" icon="layout-dashboard" /><TabButton active={activeTab === 'stores'} onClick={() => {setActiveTab('stores'); setSelectedStore(null)}} label="Chi nhánh" icon="store" /><TabButton active={activeTab === 'warehouse'} onClick={() => {setActiveTab('warehouse'); setSelectedStore(null)}} label="Kho tổng" icon="warehouse" /><TabButton active={activeTab === 'staff-global'} onClick={() => {setActiveTab('staff-global'); setSelectedStore(null)}} label="Nhân sự" icon="users" /><TabButton active={activeTab === 'history'} onClick={() => {setActiveTab('history'); setSelectedStore(null)}} label="Lịch sử" icon="history" /></>
                        ) : (
                            <TabButton active={activeTab === 'my-store'} onClick={() => setActiveTab('my-store')} label="Chi nhánh của tôi" icon="store" />
                        )}
                    </nav>
                </div>
                <div className="relative"><button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center space-x-3 bg-slate-50 p-1.5 pr-4 rounded-2xl border hover:bg-slate-100 transition-all"><div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm uppercase">{user.name.charAt(0)}</div><div className="text-left hidden sm:block leading-none mr-2"><p className="text-xs font-black text-slate-900 leading-none">{user.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase mt-1 leading-none">{user.role === 'admin' ? 'Hệ thống' : 'Chi nhánh'}</p></div><Icon name="chevron-down" size={14} className="text-slate-300" /></button>{showUserMenu && (<div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 z-[60] overflow-hidden animate-in slide-in-from-top-2"><button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-4 text-xs font-black text-rose-500 hover:bg-rose-50 rounded-2xl transition-all uppercase tracking-widest"><Icon name="log-out" size={16}/> <span>Đăng xuất</span></button></div>)}</div>
            </header>
            <main className="flex-1 p-8 max-w-[1400px] mx-auto w-full">
                {toast && <div className="fixed bottom-8 right-8 z-[100] bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center space-x-4 animate-in slide-in-from-right"><Icon name="check-circle-2" size={16} className="text-emerald-400"/><p className="text-sm font-bold">{toast}</p></div>}

                {user.role === 'admin' && activeTab === 'dashboard' && !selectedStore && (
                    <div className="space-y-10 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-white text-left"><SummaryBigCard color="bg-blue-600" label="Sản phẩm kho tổng" value={globalProducts.reduce((a,p)=>a+p.warehouseStock, 0)} icon="warehouse"/><SummaryBigCard color="bg-emerald-500" label="Hàng tại cửa hàng" value={stores.reduce((a,s)=>a+s.inventory.reduce((sum,i)=>sum+i.quantity,0), 0)} icon="package"/><SummaryBigCard color="bg-indigo-600" label="Nhân sự hệ thống" value={allEmployees.length} icon="users"/></div>
                        <div className="bg-white rounded-[40px] border p-10 text-left shadow-sm"><div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black tracking-tight">Chi nhánh hoạt động</h3><button onClick={() => setActiveTab('stores')} className="text-xs font-black text-blue-600 hover:underline uppercase">Tất cả chi nhánh</button></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {stores.map(s => (
                                    <div key={s.id} onClick={()=>{setSelectedStore(s); setActiveTab('stores')}} className="p-8 bg-slate-50 hover:bg-blue-50 rounded-[40px] border border-transparent hover:border-blue-200 transition-all cursor-pointer flex justify-between items-center group shadow-sm"><div className="flex items-center gap-6"><div className="w-16 h-16 rounded-[25px] bg-white flex items-center justify-center text-blue-600 shadow-sm border group-hover:scale-105 transition-all"><Icon name="store" size={24}/></div><div><p className="font-black text-xl text-slate-900 leading-none mb-1">{s.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.employees.length} thành viên trực ca</p></div></div><div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-300 group-hover:text-blue-600 shadow-sm transition-all"><Icon name="chevron-right" size={20}/></div></div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {user.role === 'admin' && activeTab === 'staff-global' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex justify-between items-center text-left"><div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Nhân sự Toàn Hệ thống</h2><p className="text-slate-400 font-bold text-sm uppercase mt-1 tracking-widest">Tổng cộng {allEmployees.length} nhân viên</p></div><div className="flex gap-4"><div className="relative"><Icon name="search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" /><input type="text" placeholder="Tìm tên nhân viên..." className="pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 text-sm font-bold shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div></div>
                        <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden p-2"><table className="w-full text-left text-sm border-separate border-spacing-y-2"><thead className="bg-slate-50/50 border-b"><tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"><th className="px-10 py-6 text-left">Nhân viên</th><th className="px-10 py-6 text-center">Vai trò</th><th className="px-10 py-6 text-center">Chi nhánh gán</th><th className="px-10 py-6 text-center">Tài khoản</th><th className="px-10 py-6 text-right pr-14">Hành động</th></tr></thead><tbody className="divide-y divide-slate-50">{allEmployees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map(e => (
                            <tr key={e.id} className="hover:bg-blue-50/20 transition-all rounded-3xl group"><td className="px-10 py-8 min-w-[250px] text-left flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-white border text-blue-600 flex items-center justify-center font-black text-lg uppercase shadow-sm">{e.name.charAt(0)}</div><div><p className="font-black text-lg text-slate-900 leading-none mb-1">{e.name}</p><p className="text-[11px] font-bold text-slate-400">{e.phone}</p></div></td><td className="px-10 py-8 text-center uppercase"><span className={`px-4 py-1.5 rounded-full font-black text-[10px] border-2 ${e.role === 'Quản lý' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{e.role}</span></td><td className="px-10 py-8 text-center"><p className="font-bold text-blue-600">{e.storeName}</p></td><td className="px-10 py-8 text-center font-mono font-bold text-slate-400 text-xs">@{e.username}</td><td className="px-10 py-8 text-right pr-14"><div className="flex justify-end gap-2"><button onClick={() => { setSelectedStore(stores.find(s=>s.id===e.storeId)); setActiveTab('stores'); setStoreSubTab('employees'); }} className="p-3 text-slate-400 hover:text-blue-500 rounded-xl hover:bg-white transition-all"><Icon name="clock" size={18}/></button><button onClick={() => { setEditingEmployee(e); setSelectedStore(stores.find(s=>s.id===e.storeId)); setShowModal('editEmployee'); }} className="p-3 text-slate-400 hover:text-indigo-500 rounded-xl hover:bg-white transition-all"><Icon name="edit-2" size={18}/></button><button onClick={() => handleDeleteEmployee(e.storeId, e.id, e.name)} className="p-3 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-white transition-all"><Icon name="trash-2" size={18}/></button></div></td></tr>
                        ))}</tbody></table></div>
                    </div>
                )}

                {user.role === 'admin' && activeTab === 'stores' && !selectedStore && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex justify-between items-center text-left"><div><h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Mạng lưới Chi nhánh</h2><p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Đang vận hành {stores.length} địa điểm</p></div><button onClick={() => setShowModal('addStore')} className="bg-blue-600 text-white px-8 py-4 rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl flex items-center hover:scale-105 transition-all"><Icon name="plus" size={18} className="mr-2"/> Thêm chi nhánh</button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {stores.map(s => (
                                <div key={s.id} onClick={() => setSelectedStore(s)} className="bg-white p-8 rounded-[40px] border shadow-sm hover:shadow-2xl transition-all group cursor-pointer relative overflow-hidden flex flex-col h-full border-b-4 border-b-transparent hover:border-b-blue-600"><div className="bg-blue-50 text-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Icon name="store" size={28}/></div><h3 className="font-black text-2xl text-slate-900 mb-2 text-left">{s.name}</h3><p className="text-sm text-slate-400 flex items-center font-medium mb-auto text-left leading-relaxed"><Icon name="map-pin" size={14} className="mr-2 text-blue-500 shrink-0"/> {s.location}</p><div className="mt-8 pt-6 border-t flex items-center justify-between"><span className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-1.5"><Icon name="users" size={14} className="text-slate-300"/> {s.employees.length} Nhân sự</span><div className="flex items-center text-xs font-black text-blue-600 uppercase tracking-tighter">Chi tiết <Icon name="chevron-right" size={16} className="ml-1 group-hover:translate-x-1 transition-transform" /></div></div><button onClick={(e) => { e.stopPropagation(); handleDeleteStore(s.id, s.name); }} className="absolute top-6 right-6 p-2 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Icon name="trash-2" size={18}/></button></div>
                            ))}
                        </div>
                    </div>
                )}

                {user.role === 'admin' && activeTab === 'warehouse' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-8 rounded-[32px] border shadow-sm text-left"><div className="flex items-center gap-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Icon name="warehouse" size={32}/></div><div><h2 className="text-3xl font-black text-slate-900 leading-none">Quản Lý Kho Hàng</h2><p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Dữ liệu hàng hóa toàn hệ thống</p></div></div><div className="flex gap-3"><button className="flex items-center px-5 py-3 bg-slate-50 border rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Xuất CSV</button><button onClick={() => setShowModal('addGlobalProduct')} className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all active:scale-95"><Icon name="plus" size={18} className="mr-2" /> Thêm sản phẩm</button></div></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left"><SummaryMiniCard label="Tổng danh mục" value={globalProducts.length} /><SummaryMiniCard label="Giá trị tồn kho" value={totalValue.toLocaleString() + " đ"} color="text-blue-600" /><SummaryMiniCard label="Sắp hết hàng" value={globalProducts.filter(p=>p.warehouseStock>0 && p.warehouseStock<10).length} color="text-orange-500" icon={<Icon name="alert-triangle" size={14}/>} /><SummaryMiniCard label="Kho rỗng" value={globalProducts.filter(p=>p.warehouseStock===0).length} color="text-rose-500" /></div>
                        <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden p-2"><table className="w-full text-left text-sm border-separate border-spacing-y-1"><thead className="bg-slate-50/50 border-b"><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-10 py-6">Mô tả sản phẩm ↑↓</th><th className="px-10 py-6 text-center">Mã SKU</th><th className="px-10 py-6 text-center">Danh mục</th><th className="px-10 py-6 text-center">Kho tổng ↑↓</th><th className="px-10 py-6 text-center">Đơn giá</th><th className="px-10 py-6 text-right pr-14">Quản lý</th></tr></thead><tbody className="divide-y divide-slate-50">
                            {globalProducts.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group rounded-2xl"><td className="px-10 py-8 min-w-[300px] text-left"><p className="font-black text-xl text-slate-800 mb-1 leading-none">{p.name}</p><p className="text-[11px] text-slate-400 line-clamp-1">{p.description || "Hàng hóa tiêu chuẩn"}</p></td><td className="px-10 py-8 text-xs font-mono font-bold text-slate-500 text-center uppercase">{p.sku}</td><td className="px-10 py-8 text-center"><span className="inline-flex items-center px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-600 uppercase"><span className="mr-2">{CATEGORIES[p.category] || '📦'}</span>{p.category}</span></td><td className="px-10 py-8 text-center font-black"><span className={`text-lg ${p.warehouseStock < 10 ? 'text-orange-500' : 'text-blue-600'}`}>{p.warehouseStock}</span><span className="text-[11px] text-slate-400 ml-1.5">{p.unit}</span></td><td className="px-10 py-8 font-black text-slate-800 text-center">{p.basePrice.toLocaleString()} đ</td><td className="px-10 py-8 pr-14 text-right"><div className="flex justify-end gap-2"><button onClick={() => handleImportToWarehouse(p.id, 10)} className="p-3 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="Nhập hàng NCC"><Icon name="arrow-down-left" size={20}/></button><button onClick={() => { setSelectedStore(null); setShowModal('distribute'); }} className="p-3 text-orange-500 hover:bg-orange-50 rounded-xl transition-all" title="Điều phối chi nhánh"><Icon name="arrow-up-right" size={20}/></button></div></td></tr>
                            ))}
                        </tbody></table></div>
                    </div>
                )}

                {user.role === 'admin' && activeTab === 'history' && (() => {
                    const year = historyFilter.year;
                    const MONTH_NAMES = ['Th1','Th2','Th3','Th4','Th5','Th6','Th7','Th8','Th9','Th10','Th11','Th12'];
                    const QUARTER_NAMES = ['Q1 (Th1-3)','Q2 (Th4-6)','Q3 (Th7-9)','Q4 (Th10-12)'];

                    // All transactions in selected year
                    const yearTxs = warehouseTransactions.filter(tx => tx.date && tx.date.slice(0, 4) === year);

                    // Build monthly data [0..11]
                    const monthlyData = Array.from({ length: 12 }, (_, i) => {
                        const mm = String(i + 1).padStart(2, '0');
                        const prefix = `${year}-${mm}`;
                        const txsInMonth = yearTxs.filter(tx => tx.date.slice(0, 7) === prefix);
                        const imports = txsInMonth.filter(tx => tx.type === 'import');
                        const sells = txsInMonth.filter(tx => tx.type === 'sell');
                        const distributes = txsInMonth.filter(tx => tx.type === 'distribute');
                        return {
                            month: MONTH_NAMES[i],
                            importQty: imports.reduce((s, tx) => s + tx.quantity, 0),
                            sellQty: sells.reduce((s, tx) => s + tx.quantity, 0),
                            distributeQty: distributes.reduce((s, tx) => s + tx.quantity, 0),
                            sellValue: sells.reduce((s, tx) => s + tx.quantity * (tx.unitPrice || 0), 0),
                        };
                    });

                    // Build quarterly data [0..3]
                    const quarterlyData = Array.from({ length: 4 }, (_, q) => {
                        const qMonths = monthlyData.slice(q * 3, q * 3 + 3);
                        return {
                            label: QUARTER_NAMES[q],
                            importQty: qMonths.reduce((s, m) => s + m.importQty, 0),
                            sellQty: qMonths.reduce((s, m) => s + m.sellQty, 0),
                            distributeQty: qMonths.reduce((s, m) => s + m.distributeQty, 0),
                            sellValue: qMonths.reduce((s, m) => s + m.sellValue, 0),
                        };
                    });

                    // Year totals
                    const yearTotals = {
                        importQty: monthlyData.reduce((s, m) => s + m.importQty, 0),
                        sellQty: monthlyData.reduce((s, m) => s + m.sellQty, 0),
                        distributeQty: monthlyData.reduce((s, m) => s + m.distributeQty, 0),
                        sellValue: monthlyData.reduce((s, m) => s + m.sellValue, 0),
                    };

                    // Chart max for scaling bars
                    const chartMax = Math.max(1, ...monthlyData.map(m => Math.max(m.importQty, m.sellQty)));

                    // Filter detail transactions
                    const filteredTxs = yearTxs.filter(tx => historyFilter.type === 'all' || tx.type === historyFilter.type).sort((a, b) => new Date(b.date) - new Date(a.date));

                    // Available years from data
                    const availableYears = [...new Set(warehouseTransactions.map(tx => tx.date?.slice(0, 4)).filter(Boolean))];
                    if (!availableYears.includes(year)) availableYears.push(year);
                    availableYears.sort();

                    const typeLabel = { import: 'Nhập kho', distribute: 'Phân phối', sell: 'Bán hàng' };
                    const typeColor = { import: 'bg-emerald-50 text-emerald-600 border-emerald-100', distribute: 'bg-orange-50 text-orange-600 border-orange-100', sell: 'bg-blue-50 text-blue-600 border-blue-100' };
                    const typeIcon = { import: 'arrow-down-left', distribute: 'arrow-up-right', sell: 'shopping-cart' };

                    // Sales by store for the year
                    const salesByStore = {};
                    yearTxs.filter(tx => tx.type === 'sell').forEach(tx => {
                        if (!salesByStore[tx.storeName]) salesByStore[tx.storeName] = { qty: 0, value: 0 };
                        salesByStore[tx.storeName].qty += tx.quantity;
                        salesByStore[tx.storeName].value += tx.quantity * (tx.unitPrice || 0);
                    });

                    return (
                    <div className="space-y-8 animate-fade-in">
                        {/* Header + Filters */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-8 rounded-[32px] border shadow-sm text-left">
                            <div className="flex items-center gap-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Icon name="bar-chart-3" size={32}/></div><div><h2 className="text-3xl font-black text-slate-900 leading-none">Thống Kê & Báo Cáo</h2><p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Nhập kho · Phân phối · Bán hàng · Năm {year}</p></div></div>
                            <div className="flex gap-3 flex-wrap">
                                <select value={year} onChange={e => setHistoryFilter({...historyFilter, year: e.target.value})} className="px-5 py-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer">
                                    {availableYears.map(y => <option key={y} value={y}>Năm {y}</option>)}
                                </select>
                                <select value={historyFilter.type} onChange={e => setHistoryFilter({...historyFilter, type: e.target.value})} className="px-5 py-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer">
                                    <option value="all">Tất cả</option>
                                    <option value="import">Nhập kho</option>
                                    <option value="distribute">Phân phối</option>
                                    <option value="sell">Bán hàng</option>
                                </select>
                            </div>
                        </div>

                        {/* Year Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                            <SummaryMiniCard label={`Nhập kho cả năm ${year}`} value={yearTotals.importQty + " SP"} color="text-emerald-600" />
                            <SummaryMiniCard label={`Phân phối cả năm ${year}`} value={yearTotals.distributeQty + " SP"} color="text-orange-500" />
                            <SummaryMiniCard label={`Bán ra cả năm ${year}`} value={yearTotals.sellQty + " SP"} color="text-blue-600" />
                            <SummaryMiniCard label={`Doanh thu năm ${year}`} value={yearTotals.sellValue.toLocaleString() + " đ"} color="text-indigo-600" />
                        </div>

                        {/* Monthly Bar Chart */}
                        <div className="bg-white rounded-[40px] border shadow-sm p-10 text-left">
                            <h3 className="text-xl font-black tracking-tight mb-2 uppercase flex items-center gap-3"><Icon name="bar-chart-3" size={22} className="text-blue-600"/> Biểu đồ Nhập / Bán theo tháng — Năm {year}</h3>
                            <div className="flex items-center gap-8 mb-8 mt-1">
                                <span className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="w-4 h-4 rounded bg-emerald-500 inline-block"></span> Nhập kho</span>
                                <span className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="w-4 h-4 rounded bg-blue-500 inline-block"></span> Bán ra</span>
                            </div>
                            <div className="flex items-end gap-2 sm:gap-3 h-[280px] pt-4 border-b border-l border-slate-100 relative pl-1">
                                {/* Y-axis labels */}
                                <div className="absolute -left-1 top-0 bottom-0 flex flex-col justify-between text-[9px] font-bold text-slate-300 pointer-events-none" style={{width: '1px'}}>
                                    <span className="relative -top-2 -left-8">{chartMax}</span>
                                    <span className="relative -left-8">{Math.round(chartMax / 2)}</span>
                                    <span className="relative top-1 -left-8">0</span>
                                </div>
                                {monthlyData.map((m, i) => {
                                    const importH = chartMax > 0 ? (m.importQty / chartMax) * 100 : 0;
                                    const sellH = chartMax > 0 ? (m.sellQty / chartMax) * 100 : 0;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1 group relative">
                                            {/* Tooltip */}
                                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold rounded-xl px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-xl">
                                                <p className="text-emerald-400">Nhập: {m.importQty}</p>
                                                <p className="text-blue-400">Bán: {m.sellQty}</p>
                                                <p className="text-orange-400">Phối: {m.distributeQty}</p>
                                                <p className="text-slate-300 border-t border-slate-700 mt-1 pt-1">DT: {m.sellValue.toLocaleString()}đ</p>
                                            </div>
                                            <div className="flex gap-[2px] items-end w-full justify-center" style={{height: '100%'}}>
                                                <div className="bg-emerald-500 rounded-t-lg w-[40%] min-w-[6px] transition-all duration-500 hover:bg-emerald-400" style={{height: `${Math.max(importH, importH > 0 ? 2 : 0)}%`}}></div>
                                                <div className="bg-blue-500 rounded-t-lg w-[40%] min-w-[6px] transition-all duration-500 hover:bg-blue-400" style={{height: `${Math.max(sellH, sellH > 0 ? 2 : 0)}%`}}></div>
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 mt-2 leading-none">{m.month}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quarterly Breakdown */}
                        <div className="bg-white rounded-[40px] border shadow-sm p-10 text-left">
                            <h3 className="text-xl font-black tracking-tight mb-6 uppercase flex items-center gap-3"><Icon name="calendar" size={22} className="text-indigo-600"/> Thống kê theo Quý — Năm {year}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {quarterlyData.map((q, qi) => {
                                    const qMax = Math.max(1, q.importQty, q.sellQty);
                                    return (
                                        <div key={qi} className="p-6 bg-slate-50 rounded-[30px] border hover:shadow-lg transition-all">
                                            <p className="font-black text-lg text-slate-900 mb-4">{q.label}</p>
                                            <div className="space-y-3">
                                                <div><div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1"><span className="text-emerald-600">Nhập kho</span><span className="text-slate-500">{q.importQty} SP</span></div><div className="w-full bg-slate-200 rounded-full h-3"><div className="bg-emerald-500 h-3 rounded-full transition-all duration-700" style={{width: `${(q.importQty / qMax) * 100}%`}}></div></div></div>
                                                <div><div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1"><span className="text-blue-600">Bán ra</span><span className="text-slate-500">{q.sellQty} SP</span></div><div className="w-full bg-slate-200 rounded-full h-3"><div className="bg-blue-500 h-3 rounded-full transition-all duration-700" style={{width: `${(q.sellQty / qMax) * 100}%`}}></div></div></div>
                                                <div><div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1"><span className="text-orange-500">Phân phối</span><span className="text-slate-500">{q.distributeQty} SP</span></div><div className="w-full bg-slate-200 rounded-full h-3"><div className="bg-orange-400 h-3 rounded-full transition-all duration-700" style={{width: `${(q.distributeQty / qMax) * 100}%`}}></div></div></div>
                                            </div>
                                            <div className="mt-4 pt-4 border-t"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doanh thu</p><p className="text-xl font-black text-indigo-600">{q.sellValue.toLocaleString()} đ</p></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Monthly Detail Table */}
                        <div className="bg-white rounded-[40px] border shadow-sm p-10 text-left">
                            <h3 className="text-xl font-black tracking-tight mb-6 uppercase flex items-center gap-3"><Icon name="table" size={22} className="text-slate-600"/> Chi tiết 12 tháng — Năm {year}</h3>
                            <div className="overflow-x-auto"><table className="w-full text-sm border-separate border-spacing-y-1"><thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50"><th className="px-4 py-4 text-left rounded-l-xl">Tháng</th><th className="px-4 py-4 text-center">Nhập kho</th><th className="px-4 py-4 text-center">Phân phối</th><th className="px-4 py-4 text-center">Bán ra</th><th className="px-4 py-4 text-right rounded-r-xl">Doanh thu</th></tr></thead>
                                <tbody>{monthlyData.map((m, i) => (
                                    <tr key={i} className="hover:bg-blue-50/30 transition-colors"><td className="px-4 py-3 font-black text-slate-800">{m.month}/{year}</td><td className="px-4 py-3 text-center"><span className="text-emerald-600 font-black">{m.importQty}</span></td><td className="px-4 py-3 text-center"><span className="text-orange-500 font-black">{m.distributeQty}</span></td><td className="px-4 py-3 text-center"><span className="text-blue-600 font-black">{m.sellQty}</span></td><td className="px-4 py-3 text-right font-black text-indigo-600">{m.sellValue.toLocaleString()} đ</td></tr>
                                ))}<tr className="bg-slate-100 font-black"><td className="px-4 py-4 rounded-l-xl">TỔNG NĂM</td><td className="px-4 py-4 text-center text-emerald-600">{yearTotals.importQty}</td><td className="px-4 py-4 text-center text-orange-500">{yearTotals.distributeQty}</td><td className="px-4 py-4 text-center text-blue-600">{yearTotals.sellQty}</td><td className="px-4 py-4 text-right text-indigo-600 rounded-r-xl">{yearTotals.sellValue.toLocaleString()} đ</td></tr></tbody>
                            </table></div>
                        </div>

                        {/* Sales by Store */}
                        {Object.keys(salesByStore).length > 0 && (
                            <div className="bg-white rounded-[40px] border shadow-sm p-10 text-left">
                                <h3 className="text-xl font-black tracking-tight mb-6 uppercase flex items-center gap-3"><Icon name="store" size={22} className="text-blue-600"/> Doanh số theo chi nhánh — Năm {year}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Object.entries(salesByStore).map(([storeName, data]) => (
                                        <div key={storeName} className="p-6 bg-slate-50 rounded-[30px] border">
                                            <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center"><Icon name="store" size={20}/></div><p className="font-black text-lg text-slate-900">{storeName}</p></div>
                                            <div className="flex justify-between"><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã bán</p><p className="text-2xl font-black text-blue-600">{data.qty}</p></div><div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doanh thu</p><p className="text-2xl font-black text-emerald-600">{data.value.toLocaleString()} đ</p></div></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Transaction Detail Log */}
                        <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden p-2">
                            <table className="w-full text-left text-sm border-separate border-spacing-y-1">
                                <thead className="bg-slate-50/50 border-b"><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="px-10 py-6">Thời gian</th><th className="px-10 py-6 text-center">Loại</th><th className="px-10 py-6">Sản phẩm</th><th className="px-10 py-6 text-center">Số lượng</th><th className="px-10 py-6">Chi nhánh</th><th className="px-10 py-6">Ghi chú</th></tr></thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredTxs.length === 0 && <tr><td colSpan="6" className="px-10 py-16 text-center text-slate-300 font-bold">Chưa có giao dịch nào trong năm {year}</td></tr>}
                                    {filteredTxs.map(tx => (
                                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-10 py-6"><p className="font-bold text-slate-800">{new Date(tx.date).toLocaleDateString('vi-VN')}</p><p className="text-[10px] text-slate-400">{new Date(tx.date).toLocaleTimeString('vi-VN')}</p></td>
                                            <td className="px-10 py-6 text-center"><span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border-2 ${typeColor[tx.type]}`}><Icon name={typeIcon[tx.type]} size={12}/>{typeLabel[tx.type]}</span></td>
                                            <td className="px-10 py-6 font-black text-slate-800">{tx.productName}</td>
                                            <td className="px-10 py-6 text-center font-black text-lg text-blue-600">{tx.quantity}</td>
                                            <td className="px-10 py-6 text-slate-500 font-bold">{tx.storeName || '—'}</td>
                                            <td className="px-10 py-6 text-slate-400 text-xs">{tx.note}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    );
                })()}

                {currentStore && (activeTab === 'my-store' || selectedStore) && activeTab !== 'staff-global' && activeTab !== 'history' && (
                    <div className="space-y-10 animate-fade-in text-left">
                        {user.role === 'admin' && (<button onClick={()=>setSelectedStore(null)} className="flex items-center text-[11px] font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-[0.2em] mb-6"><Icon name="chevron-left" size={14} className="mr-2"/> Quay lại danh mục chi nhánh</button>)}
                        <div className="bg-white p-12 rounded-[60px] border shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10"><div className="flex items-center space-x-10"><div className="bg-blue-600 text-white p-10 rounded-[45px] shadow-2xl shadow-blue-200 flex items-center justify-center"><Icon name="store" size={56}/></div><div><h2 className="text-5xl font-black tracking-tight text-slate-900 mb-2 leading-none">{currentStore.name}</h2><p className="text-slate-400 font-bold text-xl flex items-center mt-3"><Icon name="map-pin" size={24} className="mr-3 text-blue-500" /> {currentStore.location}</p></div></div><div className="bg-slate-50 p-10 rounded-[50px] border border-slate-100 text-center min-w-[280px] shadow-inner"><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Hàng tại chi nhánh</p><p className="text-6xl font-black text-blue-600 tracking-tighter">{currentStore.inventory.length} <span className="text-xl opacity-30">MÃ</span></p></div></div>
                        <div className="flex space-x-2 bg-slate-100 w-fit p-2 rounded-3xl shadow-inner mb-8"><SubTabButton active={storeSubTab === 'inventory'} onClick={() => setStoreSubTab('inventory')} label="Mặt hàng" icon="package"/><SubTabButton active={storeSubTab === 'employees'} onClick={() => setStoreSubTab('employees')} label="Nhân sự & Lịch trực" icon="users"/></div>
                        {storeSubTab === 'inventory' && (
                            <div className="bg-white rounded-[40px] border overflow-hidden p-2"><table className="w-full text-sm border-separate border-spacing-y-2"><thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b"><tr><th className="px-10 py-6 text-left">Sản phẩm</th><th className="px-10 py-6 text-center">SKU</th><th className="px-10 py-6 text-center">Tồn kho</th><th className="px-10 py-6 text-center">Đã bán</th><th className="px-10 py-6 text-right pr-14">Giao dịch</th></tr></thead><tbody className="divide-y divide-slate-50">
                                {currentStore.inventory.map(item => {
                                    const info = getProductInfo(item.productId);
                                    return (<tr key={item.productId} className="hover:bg-blue-50/20 transition-all rounded-3xl group"><td className="px-10 py-8 min-w-[300px] text-left"><p className="font-black text-xl text-slate-800 mb-1 leading-none">{info.name}</p><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">{info.category}</p></td><td className="px-10 py-8 font-mono font-bold text-slate-400 text-xs text-center">{info.sku}</td><td className="px-10 py-8 text-center font-black"><span className={`px-6 py-2 rounded-full text-xs border-2 ${item.quantity < 5 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{item.quantity} {info.unit}</span></td><td className="px-10 py-8 text-center"><span className="px-6 py-2 rounded-full bg-emerald-50 text-emerald-600 font-black text-xs border-2 border-emerald-100">+{item.sold || 0}</span></td><td className="px-10 py-8 text-right pr-14"><button onClick={() => handleSellProduct(currentStore.id, item.productId)} disabled={item.quantity === 0} className={`px-8 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 ${item.quantity > 0 ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100' : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'}`}>{item.quantity > 0 ? 'Xuất bán' : 'Hết hàng'}</button></td></tr>)
                                })}
                            </tbody></table></div>
                        )}
                        {storeSubTab === 'employees' && (
                            <div className="bg-white rounded-[40px] border p-10 text-left"><div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black tracking-tight uppercase flex items-center gap-3 leading-none"><Icon name="clock" size={24} className="text-blue-600" /> Bảng phân ca trực tuần (4h)</h3>{user.role === 'admin' && (<button onClick={()=>{setEditingEmployee(null); setShowModal('addEmployee');}} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center shadow-lg active:scale-95 transition-all"><Icon name="user-plus" size={18} className="mr-2"/> Thêm nhân sự mới</button>)}</div>
                                <div className="space-y-8">
                                    {currentStore.employees.map(e => (
                                        <div key={e.id} className="p-8 bg-slate-50 rounded-[40px] border border-transparent hover:border-blue-200 transition-all flex flex-col xl:flex-row gap-8 items-start xl:items-center relative group shadow-sm border-l-8 border-l-blue-600"><div className="flex items-center gap-6 xl:w-[250px]"><div className="w-16 h-16 rounded-[25px] bg-white text-blue-600 flex items-center justify-center font-black text-2xl shadow-sm uppercase border leading-none">{e.name.charAt(0)}</div><div><p className="font-black text-2xl text-slate-900 leading-none mb-2">{e.name}</p><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest ${e.role === 'Quản lý' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{e.role}</span></div></div><div className="flex-1 overflow-x-auto w-full no-scrollbar"><div className="flex space-x-4 min-w-[700px]">{DAYS_OF_WEEK.map(day => (<div key={day.id} className="flex-1 min-w-[80px] text-center"><p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">{day.label}</p><div className="space-y-1.5">{SHIFT_SLOTS.map(slot => { const isActive = e.schedule?.[day.id]?.includes(slot.id); return <div key={slot.id} className={`p-2 rounded-xl text-[9px] font-black border transition-all ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' : 'bg-white text-slate-200 border-slate-50 opacity-30 hover:opacity-100'}`} title={slot.time}>{slot.label}</div> })}</div></div>))}</div></div>{user.role === 'admin' && (<div className="flex xl:flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={()=>{setEditingEmployee(e); setShowModal('editEmployee');}} className="p-3 bg-white text-blue-500 rounded-xl shadow-sm border hover:bg-blue-500 hover:text-white transition-all"><Icon name="edit-2" size={18}/></button><button onClick={()=>handleDeleteEmployee(currentStore.id, e.id, e.name)} className="p-3 bg-white text-rose-500 rounded-xl shadow-sm border hover:bg-rose-500 hover:text-white transition-all"><Icon name="trash-2" size={18}/></button></div>)}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {showModal === 'confirmPopup' && pendingAction && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in"><div className="bg-white rounded-[50px] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 p-12 text-center space-y-8 animate-in zoom-in-95"><div className={`w-24 h-24 rounded-[35px] flex items-center justify-center mx-auto shadow-inner ${pendingAction.type === 'delete' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-600'} flex items-center justify-center`}><Icon name={pendingAction.type === 'delete' ? 'alert-triangle' : 'help-circle'} size={48}/></div><div className="space-y-2"><h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">{pendingAction.title}</h3><p className="text-slate-400 font-bold leading-relaxed">{pendingAction.message}</p></div><div className="flex gap-4 pt-4"><button onClick={() => { setShowModal(null); setPendingAction(null); }} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[25px] font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Quay lại</button><button onClick={() => pendingAction.onConfirm()} className={`flex-1 py-5 text-white rounded-[25px] font-black uppercase text-xs tracking-widest shadow-xl transition-all ${pendingAction.type === 'delete' ? 'bg-rose-500 shadow-rose-100 hover:bg-rose-600' : 'bg-blue-600 shadow-blue-100 hover:bg-blue-700'}`}>Xác nhận</button></div></div></div>
            )}
            {showModal === 'addGlobalProduct' && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6"><div className="bg-white rounded-[60px] w-full max-w-2xl shadow-2xl overflow-hidden border animate-in zoom-in-95"><div className="p-10 border-b flex justify-between items-center bg-slate-50/50"><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">Thêm sản phẩm hệ thống</h3><button onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-3xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={28}/></button></div><form className="p-10 space-y-8" onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.target); handleSaveGlobalProduct({ sku: fd.get('sku'), name: fd.get('name'), category: fd.get('category'), basePrice: fd.get('price'), initialStock: fd.get('stock'), unit: fd.get('unit'), description: fd.get('desc') }); }}><div className="grid grid-cols-1 sm:grid-cols-2 gap-6"><Input label="Mã SKU" name="sku" required placeholder="Ví dụ: SP-001" /><Input label="Tên sản phẩm" name="name" required placeholder="Tên hàng hóa..." /></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left"><Select label="Phân loại" name="category" required>{Object.keys(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}</Select><Input label="Đơn vị tính" name="unit" required placeholder="cái, bao..." /><Input label="Giá vốn niêm yết" name="price" type="number" required placeholder="VNĐ" /></div><Input label="Mô tả hàng hóa" name="desc" placeholder="Thông tin chi tiết sản phẩm..." /><Input label="Số lượng thực nhập đầu kỳ" name="stock" type="number" defaultValue="0" /><button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-[30px] font-black shadow-2xl hover:bg-blue-700 uppercase text-[11px] tracking-widest transition-all active:scale-95 leading-none">Khai báo danh mục</button></form></div></div>
            )}
            {(showModal === 'addEmployee' || showModal === 'editEmployee') && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6"><div className="bg-white rounded-[60px] w-full max-w-4xl shadow-2xl overflow-hidden border animate-in zoom-in-95"><div className="p-10 border-b flex justify-between items-center bg-slate-50/50"><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">{showModal === 'addEmployee' ? 'Đăng ký nhân sự' : 'Cập nhật nhân sự'}</h3><button onClick={()=>{setShowModal(null); setEditingEmployee(null);}} className="p-4 hover:bg-slate-200 rounded-3xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={28}/></button></div><EmployeeForm initialData={editingEmployee} onSave={(data) => handleSaveEmployee(currentStore?.id, data)} onCancel={() => { setShowModal(null); setEditingEmployee(null); }} /></div></div>
            )}
            {showModal === 'addStore' && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6"><div className="bg-white rounded-[50px] w-full max-w-md shadow-2xl overflow-hidden border animate-in zoom-in-95"><div className="p-8 border-b flex justify-between items-center bg-slate-50/50"><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">Mở chi nhánh mới</h3><button onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={24}/></button></div><form className="p-8 space-y-6" onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.target); handleAddStore({ name: fd.get('name'), location: fd.get('location') }); }}><Input label="Tên chi nhánh" name="name" required placeholder="Cửa hàng Quận..." /><Input label="Địa chỉ cụ thể" name="location" required placeholder="Số 123..." /><button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[30px] font-black shadow-lg hover:bg-blue-700 uppercase text-[11px] tracking-widest transition-all active:scale-95 leading-none">Kích hoạt ngay</button></form></div></div>
            )}
            {showModal === 'distribute' && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6"><div className="bg-white rounded-[50px] w-full max-w-md shadow-2xl overflow-hidden border animate-in zoom-in-95"><div className="p-8 border-b flex justify-between items-center bg-slate-50/50"><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight text-left leading-none">Điều phối kho hàng</h3><button onClick={()=>setShowModal(null)} className="p-4 hover:bg-slate-200 rounded-2xl transition-all text-slate-400 flex items-center justify-center"><Icon name="x" size={24}/></button></div><form className="p-8 space-y-6" onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.target); handleDistribute(fd.get('sid'), fd.get('pid'), fd.get('qty')); }}><Select label="Chi nhánh đích" name="sid" defaultValue={currentStore?.id}><option value="">-- Chọn điểm đến --</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select><Select label="Mặt hàng luân chuyển" name="pid"><option value="">-- Chọn mặt hàng --</option>{globalProducts.map(p => <option key={p.id} value={p.id}>{p.name} (Tồn tổng: {p.warehouseStock})</option>)}</Select><Input label="Số lượng xuất kho" name="qty" type="number" required min="1" /><button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[30px] font-black shadow-lg hover:bg-blue-700 uppercase text-[11px] tracking-widest leading-none">Chuyển kho tức thì</button></form></div></div>
            )}
        </div>
    );
}