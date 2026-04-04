import React, { useState } from 'react';
import { Icon, TabButton } from './components/UI';
import { ConfirmModal, AddProductModal, EmployeeModal, AddExistingEmployeeModal, StoreModal, DistributeModal, CategoryManagerModal, ShiftManagerModal, ChangePasswordModal, RequestStockModal, ReturnStockModal, TransferStockModal, ProfileModal, SellProductModal } from './components/Modals';
import { useAppState } from './hooks/useAppState';

// Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminStores from './pages/AdminStores';
import AdminWarehouse from './pages/AdminWarehouse';
import AdminStaffGlobal from './pages/AdminStaffGlobal';
import AdminHistory from './pages/AdminHistory';
import StoreDetail from './pages/StoreDetail';

export default function App() {
    const state = useAppState();
    const {
        user, stores, globalProducts, warehouseTransactions, shiftSlots, stockRequests,
        activeTab, selectedStore, storeSubTab, showModal, pendingAction,
        editingEmployee, editingStore, sellingItem, toast, showUserMenu, searchTerm, historyFilter,
        currentStore, allEmployees, totalValue, categories,
        setUser, setCategories, setShiftSlots, setActiveTab, setSelectedStore, setStoreSubTab, setShowModal,
        setPendingAction, setEditingEmployee, setEditingStore, setShowUserMenu,
        setSearchTerm, setHistoryFilter, setSellingItem,
        handleLogin, handleLogout, handleSaveEmployee, handleDeleteEmployee, handleAddExistingEmployee, handleUpdateEmployeeStatus,
        handleResetPassword, handleChangePassword, handleSaveGlobalProduct, handleImportToWarehouse, handleDistribute, handleAddStockRequest, handleProcessStockRequest, handleReceiveStockRequest, handleReturnStock, handleTransferStock,
        handleAddStore, handleEditStore, handleDeleteStore, handleSellProduct,
        getProductInfo,
    } = state;

    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isShaking, setIsShaking] = useState(false);

    const onLogin = (e) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setLoginError('');

        // Giả lập thời gian chờ backend xử lý từ 3 đến 5 giây
        const delay = Math.floor(Math.random() * 2000) + 3000;
        setTimeout(() => {
            const err = handleLogin(loginForm);
            setIsLoggingIn(false);
            if (err) {
                setLoginError(err);
                setIsShaking(true);
                setTimeout(() => setIsShaking(false), 400);
            } else {
                setLoginForm({ username: '', password: '' });
            }
        }, delay);
    };

    const onLogout = () => {
        handleLogout();
        setLoginError('');
        setLoginForm({ username: '', password: '' });
    };

    // ==================== LOGIN ====================
    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative">
                <style>{`
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        25% { transform: translateX(-8px); }
                        50% { transform: translateX(8px); }
                        75% { transform: translateX(-8px); }
                    }
                `}</style>
                <div className={`w-full max-w-[380px] bg-white rounded-[32px] shadow-2xl p-10 text-center ${isShaking ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 mb-6"><Icon name="package" size={32} /></div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2 uppercase">ĐĂNG NHẬP</h1>
                    <p className="text-slate-400 text-sm mb-8 font-medium leading-relaxed">Hệ thống quản lý chuỗi @ 2026 telua</p>
                    <form onSubmit={onLogin} className="space-y-4">
                        {loginError && <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs font-bold border border-rose-100">{loginError}</div>}
                        <input type="text" disabled={isLoggingIn} required className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Username" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
                        <div className="relative">
                            <input type={showPassword ? "text" : "password"} disabled={isLoggingIn} required className="w-full px-5 py-4 pr-12 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-bold disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
                            <button type="button" disabled={isLoggingIn} tabIndex="-1" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Icon name={showPassword ? "eye-off" : "eye"} size={20} /></button>
                        </div>
                        <button disabled={isLoggingIn} className={`w-full py-5 rounded-2xl font-black shadow-lg transition-all uppercase text-xs tracking-widest mt-4 flex items-center justify-center gap-2 ${isLoggingIn ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
                            {isLoggingIn ? (
                                <><Icon name="loader" className="animate-spin" size={16} /> Đang xử lý...</>
                            ) : (
                                'Vào hệ thống'
                            )}
                        </button>
                    </form>
                </div>
                <div className="absolute bottom-8 left-0 right-0 text-center px-4">
                    <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Được vận hành bởi <a href="https://telua.vn/" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700 hover:underline transition-colors">https://telua.vn/</a> @ 2026</p>
                </div>
            </div>
        );
    }

    // ==================== MAIN LAYOUT ====================
    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="bg-gradient-to-r from-teal-700/90 to-teal-600/90 backdrop-blur-md border-b border-teal-800/50 sticky top-0 z-50 h-20 px-4 md:px-8 flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-6 lg:space-x-10">
                    <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => user.role === 'admin' && setActiveTab('dashboard')}>
                        <div className="bg-white p-2.5 rounded-xl shadow-lg group-hover:scale-105 transition-transform"><Icon name="package" size={22} className="text-teal-600" /></div>
                        <h1 className="text-xl font-black tracking-tighter text-white uppercase hidden sm:block">Telua</h1>
                    </div>
                    <nav className="hidden md:flex items-center space-x-1 h-20 overflow-x-auto no-scrollbar">
                        {user.role === 'admin' ? (
                            <>
                                <TabButton active={activeTab === 'dashboard'} onClick={() => {setActiveTab('dashboard'); setSelectedStore(null)}} label="Tổng quan" icon="layout-dashboard" />
                                <TabButton active={activeTab === 'stores'} onClick={() => {setActiveTab('stores'); setSelectedStore(null)}} label="Chi nhánh" icon="store" />
                                <TabButton active={activeTab === 'warehouse'} onClick={() => {setActiveTab('warehouse'); setSelectedStore(null)}} label="Kho tổng" icon="warehouse" />
                                <TabButton active={activeTab === 'staff-global'} onClick={() => {setActiveTab('staff-global'); setSelectedStore(null)}} label="Nhân sự" icon="users" />
                                <TabButton active={activeTab === 'history'} onClick={() => {setActiveTab('history'); setSelectedStore(null)}} label="Lịch sử" icon="history" />
                            </>
                        ) : (
                            <TabButton active={activeTab === 'my-store'} onClick={() => setActiveTab('my-store')} label="Chi nhánh của tôi" icon="store" />
                        )}
                    </nav>
                </div>
                <div className="relative">
                    {user.role === 'staff' && user.assignedStores?.length > 1 && (
                        <select 
                            value={user.storeId} 
                            onChange={e => setUser({...user, storeId: e.target.value})}
                            className="hidden md:inline-block mr-4 px-4 py-2 bg-teal-800/30 text-white rounded-xl text-xs font-bold border border-teal-500/30 outline-none cursor-pointer appearance-none"
                        >
                            {user.assignedStores.map(sid => (
                                <option key={sid} value={sid} className="text-slate-900">{stores.find(s => s.id === sid)?.name}</option>
                            ))}
                        </select>
                    )}
                    <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center space-x-3 bg-teal-800/30 p-1.5 pr-4 rounded-2xl border border-teal-500/30 hover:bg-teal-800/50 transition-all">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-teal-700 font-black text-sm uppercase">{user.name.charAt(0)}</div>
                        <div className="text-left hidden sm:block leading-none mr-2"><p className="text-xs font-black text-white leading-none">{user.name}</p><p className="text-[10px] font-bold text-teal-100 uppercase mt-1 leading-none">{user.role === 'admin' ? 'Hệ thống' : 'Chi nhánh'}</p></div>
                        <Icon name="chevron-down" size={14} className="text-teal-200" />
                    </button>
                    {showUserMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 z-[60] overflow-hidden animate-in slide-in-from-top-2">
                            <button onClick={() => { setShowUserMenu(false); setShowModal('profile'); }} className="w-full flex items-center space-x-3 px-4 py-4 text-xs font-black text-slate-600 hover:bg-slate-50 rounded-2xl transition-all uppercase tracking-widest mb-1"><Icon name="user" size={16}/> <span>Hồ sơ cá nhân</span></button>
                            <button onClick={() => { setShowUserMenu(false); setShowModal('changePassword'); }} className="w-full flex items-center space-x-3 px-4 py-4 text-xs font-black text-slate-600 hover:bg-slate-50 rounded-2xl transition-all uppercase tracking-widest mb-1"><Icon name="key" size={16}/> <span>Đổi mật khẩu</span></button>
                            <button onClick={onLogout} className="w-full flex items-center space-x-3 px-4 py-4 text-xs font-black text-rose-500 hover:bg-rose-50 rounded-2xl transition-all uppercase tracking-widest"><Icon name="log-out" size={16}/> <span>Đăng xuất</span></button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-[1400px] mx-auto w-full">
                {toast && <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-[100] bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center space-x-4 animate-in slide-in-from-right"><Icon name="check-circle-2" size={16} className="text-emerald-400"/><p className="text-sm font-bold">{toast}</p></div>}

                {/* Admin Pages */}
                {user.role === 'admin' && activeTab === 'dashboard' && !selectedStore && (
                    <AdminDashboard stores={stores} globalProducts={globalProducts} allEmployees={allEmployees} setSelectedStore={setSelectedStore} setActiveTab={setActiveTab} />
                )}

                {user.role === 'admin' && activeTab === 'staff-global' && (
                    <AdminStaffGlobal allEmployees={allEmployees} stores={stores} searchTerm={searchTerm} setSearchTerm={setSearchTerm} setSelectedStore={setSelectedStore} setActiveTab={setActiveTab} setStoreSubTab={setStoreSubTab} setEditingEmployee={setEditingEmployee} setShowModal={setShowModal} handleDeleteEmployee={handleDeleteEmployee} handleResetPassword={handleResetPassword} handleUpdateEmployeeStatus={handleUpdateEmployeeStatus} />
                )}

                {user.role === 'admin' && activeTab === 'stores' && !selectedStore && (
                    <AdminStores stores={stores} allEmployees={allEmployees} setSelectedStore={setSelectedStore} setShowModal={setShowModal} handleDeleteStore={handleDeleteStore} setEditingStore={setEditingStore} />
                )}

                {user.role === 'admin' && activeTab === 'warehouse' && (
                    <AdminWarehouse globalProducts={globalProducts} totalValue={totalValue} setShowModal={setShowModal} handleImportToWarehouse={handleImportToWarehouse} categories={categories} stockRequests={stockRequests} handleProcessStockRequest={handleProcessStockRequest} />
                )}

                {user.role === 'admin' && activeTab === 'history' && (
                    <AdminHistory warehouseTransactions={warehouseTransactions} historyFilter={historyFilter} setHistoryFilter={setHistoryFilter} />
                )}

                {/* Store Detail — shared by admin (selected store) and staff (my-store) */}
                {currentStore && (activeTab === 'my-store' || selectedStore) && activeTab !== 'staff-global' && activeTab !== 'history' && (
                    <StoreDetail currentStore={currentStore} allEmployees={allEmployees} user={user} storeSubTab={storeSubTab} setStoreSubTab={setStoreSubTab} setSelectedStore={setSelectedStore} setEditingEmployee={setEditingEmployee} setEditingStore={setEditingStore} setSellingItem={setSellingItem} setShowModal={setShowModal} handleSellProduct={handleSellProduct} handleDeleteEmployee={handleDeleteEmployee} handleResetPassword={handleResetPassword} handleUpdateEmployeeStatus={handleUpdateEmployeeStatus} getProductInfo={getProductInfo} warehouseTransactions={warehouseTransactions} stockRequests={stockRequests} handleReceiveStockRequest={handleReceiveStockRequest} shiftSlots={shiftSlots} />
                )}
            </main>

            {/* Modals */}
            {showModal === 'confirmPopup' && <ConfirmModal pendingAction={pendingAction} setShowModal={setShowModal} setPendingAction={setPendingAction} />}
            {showModal === 'addGlobalProduct' && <AddProductModal setShowModal={setShowModal} handleSaveGlobalProduct={handleSaveGlobalProduct} categories={categories} />}
            {showModal === 'manageCategories' && <CategoryManagerModal setShowModal={setShowModal} categories={categories} setCategories={setCategories} />}
            {showModal === 'manageShifts' && <ShiftManagerModal setShowModal={setShowModal} shiftSlots={shiftSlots} setShiftSlots={setShiftSlots} />}
                {(showModal === 'addEmployee' || showModal === 'editEmployee') && <EmployeeModal showModal={showModal} setShowModal={setShowModal} editingEmployee={editingEmployee} setEditingEmployee={setEditingEmployee} handleSaveEmployee={handleSaveEmployee} currentStoreId={currentStore?.id} stores={stores} user={user} shiftSlots={shiftSlots} />}
            {showModal === 'addExistingEmployee' && <AddExistingEmployeeModal setShowModal={setShowModal} allEmployees={allEmployees} currentStoreId={currentStore?.id} handleAddExistingEmployee={(empId) => handleAddExistingEmployee(currentStore?.id, empId)} user={user} />}
            {showModal === 'addStore' && <StoreModal setShowModal={setShowModal} handleSaveStore={handleAddStore} />}
            {showModal === 'editStore' && <StoreModal setShowModal={setShowModal} handleSaveStore={(data) => handleEditStore(editingStore.id, data)} initialData={editingStore} />}
            {showModal === 'distribute' && <DistributeModal setShowModal={setShowModal} stores={stores} globalProducts={globalProducts} currentStore={currentStore} handleDistribute={handleDistribute} />}
            {showModal === 'requestStock' && <RequestStockModal setShowModal={setShowModal} globalProducts={globalProducts} currentStore={currentStore} handleAddStockRequest={handleAddStockRequest} />}
            {showModal === 'returnStock' && <ReturnStockModal setShowModal={setShowModal} globalProducts={globalProducts} currentStore={currentStore} handleReturnStock={handleReturnStock} />}
            {showModal === 'transferStock' && <TransferStockModal setShowModal={setShowModal} currentStore={currentStore} stores={stores} globalProducts={globalProducts} handleTransferStock={handleTransferStock} />}
            {showModal === 'sellProduct' && <SellProductModal setShowModal={setShowModal} currentStore={currentStore} product={sellingItem} handleSellProduct={handleSellProduct} />}
            {showModal === 'changePassword' && <ChangePasswordModal setShowModal={setShowModal} handleChangePassword={handleChangePassword} />}
            {showModal === 'profile' && <ProfileModal setShowModal={setShowModal} user={user} allEmployees={allEmployees} shiftSlots={shiftSlots} />}

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-[90] flex justify-around items-center h-16 px-1 pb-safe">
                {user.role === 'admin' ? (
                    <>
                        <button onClick={() => {setActiveTab('dashboard'); setSelectedStore(null)}} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === 'dashboard' ? 'text-teal-600' : 'text-slate-400 hover:text-teal-500'}`}><Icon name="layout-dashboard" size={20}/><span className="text-[9px] font-black uppercase tracking-wider">Tổng quan</span></button>
                        <button onClick={() => {setActiveTab('stores'); setSelectedStore(null)}} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === 'stores' ? 'text-teal-600' : 'text-slate-400 hover:text-teal-500'}`}><Icon name="store" size={20}/><span className="text-[9px] font-black uppercase tracking-wider">Chi nhánh</span></button>
                        <button onClick={() => {setActiveTab('warehouse'); setSelectedStore(null)}} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === 'warehouse' ? 'text-teal-600' : 'text-slate-400 hover:text-teal-500'}`}><Icon name="warehouse" size={20}/><span className="text-[9px] font-black uppercase tracking-wider">Kho tổng</span></button>
                        <button onClick={() => {setActiveTab('staff-global'); setSelectedStore(null)}} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === 'staff-global' ? 'text-teal-600' : 'text-slate-400 hover:text-teal-500'}`}><Icon name="users" size={20}/><span className="text-[9px] font-black uppercase tracking-wider">Nhân sự</span></button>
                        <button onClick={() => {setActiveTab('history'); setSelectedStore(null)}} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === 'history' ? 'text-teal-600' : 'text-slate-400 hover:text-teal-500'}`}><Icon name="history" size={20}/><span className="text-[9px] font-black uppercase tracking-wider">Lịch sử</span></button>
                    </>
                ) : (
                    <button onClick={() => setActiveTab('my-store')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeTab === 'my-store' ? 'text-teal-600' : 'text-slate-400 hover:text-teal-500'}`}><Icon name="store" size={20}/><span className="text-[9px] font-black uppercase tracking-wider">Chi nhánh</span></button>
                )}
            </nav>
        </div>
    );
}