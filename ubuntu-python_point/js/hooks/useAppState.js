import { useState, useEffect, useMemo } from 'react';
import { initialGlobalProducts, initialStores } from '../constants';

const getCache = (key, fallback) => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
};

const setCache = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

const initialCategories = [];

export function useAppState() {
    const [user, setUser] = useState(() => getCache('chain_user', null));
    const [stores, setStores] = useState(() => getCache('chain_stores', initialStores));
    const [globalProducts, setGlobalProducts] = useState(() => getCache('chain_products', initialGlobalProducts));
    const [warehouseTransactions, setWarehouseTransactions] = useState(() => getCache('chain_warehouse_tx', []));
    const [categories, setCategories] = useState(() => getCache('chain_categories', initialCategories));
    const [stockRequests, setStockRequests] = useState(() => getCache('chain_stock_requests', []));
    const [allEmployees, setAllEmployees] = useState(() => {
        const saved = getCache('chain_employees', null);
        if (saved) return saved;
        // Tự động Migrate dữ liệu nhân sự cũ từ stores sang Global
        const s = getCache('chain_stores', initialStores);
        return s.flatMap(store => (store.employees || []).map(e => ({
            ...e,
            assignedStores: [store.id],
            schedule: { [store.id]: e.schedule || { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] } }
        })));
    });

    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedStore, setSelectedStore] = useState(null);
    const [storeSubTab, setStoreSubTab] = useState('inventory');
    const [showModal, setShowModal] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [editingStore, setEditingStore] = useState(null);
    const [toast, setToast] = useState(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [historyFilter, setHistoryFilter] = useState({ type: 'all', year: String(new Date().getFullYear()), viewMode: 'year' });

    useEffect(() => {
        setCache('chain_user', user);
        if (user && user.role === 'staff') setActiveTab('my-store');
    }, [user]);
    useEffect(() => { setCache('chain_stores', stores); }, [stores]);
    useEffect(() => { setCache('chain_products', globalProducts); }, [globalProducts]);
    useEffect(() => { setCache('chain_warehouse_tx', warehouseTransactions); }, [warehouseTransactions]);
    useEffect(() => { setCache('chain_categories', categories); }, [categories]);
    useEffect(() => { setCache('chain_stock_requests', stockRequests); }, [stockRequests]);
    useEffect(() => { setCache('chain_employees', allEmployees); }, [allEmployees]);

    const currentStore = useMemo(() => {
        if (!user) return null;
        return selectedStore || (user.role === 'staff' ? stores.find(s => s.id === user.storeId) : null);
    }, [selectedStore, user, stores]);

    const totalValue = useMemo(() => {
        return globalProducts.reduce((sum, p) => sum + (p.warehouseStock * p.basePrice), 0);
    }, [globalProducts]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const requestConfirm = (actionConfig) => {
        setPendingAction(actionConfig);
        setShowModal('confirmPopup');
    };

    const handleLogin = (loginForm) => {
        const inputUsername = loginForm.username.toLowerCase();
        if (inputUsername === 'admin' && loginForm.password === 'admin') {
            setUser({ username: 'Admin Manager', role: 'admin', name: 'Quản trị viên' });
            setActiveTab('dashboard');
            return null;
        }
        const found = allEmployees.find(emp => emp.username && emp.username.toLowerCase() === inputUsername && emp.password === loginForm.password);
        if (found) {
            const status = found.status || 'active'; // Hỗ trợ tương thích ngược với tài khoản cũ
            if (status === 'create') return 'Tài khoản đang chờ Admin xác minh CCCD!';
            if (status === 'disable') return 'Tài khoản đã bị vô hiệu hóa!';

            const defaultStoreId = found.assignedStores?.[0] || null;
            setUser({ username: found.username, role: 'staff', assignedStores: found.assignedStores || [], storeId: defaultStoreId, name: found.name, staffRole: found.role });
            return null;
        }
        return 'Sai tài khoản hoặc mật khẩu!';
    };

    const handleLogout = () => {
        setUser(null);
        setSelectedStore(null);
        setShowUserMenu(false);
        localStorage.removeItem('chain_user');
    };

    const handleSaveEmployee = (storeId, employeeData) => {
        if (!storeId) return;
        const isEdit = !!editingEmployee;

        const inputCccd = (employeeData.cccd || '').trim();
        if (!inputCccd) {
            showToast("Vui lòng nhập số CCCD/CMND!");
            return;
        }
        const isDuplicateCccd = allEmployees.some(e => e.cccd === inputCccd && (!isEdit || e.id !== editingEmployee?.id));
        if (isDuplicateCccd) {
            showToast("Số CCCD/CMND đã tồn tại trong hệ thống!");
            return;
        }

        const inputUsername = (employeeData.username || '').toLowerCase();
        const isDuplicate = allEmployees.some(e => e.username && e.username.toLowerCase() === inputUsername && (!isEdit || e.id !== editingEmployee?.id));
        if (isDuplicate) {
            showToast("Username đã tồn tại!");
            return;
        }
        requestConfirm({
            type: isEdit ? 'edit' : 'add',
            title: isEdit ? 'Cập nhật' : 'Đăng ký mới',
            message: `Lưu hồ sơ cho ${employeeData.name}?`,
            onConfirm: () => {
                setAllEmployees(prev => {
                    if (isEdit) return prev.map(e => e.id === editingEmployee.id ? { ...employeeData, id: e.id } : e);
                    return [...prev, { ...employeeData, id: employeeData.cccd }];
                });
                setShowModal(null);
                setEditingEmployee(null);
                showToast("Đã cập nhật nhân sự.");
            }
        });
    };

    const handleDeleteEmployee = (storeId, empId, empName) => {
        const isGlobalDelete = !storeId;
        requestConfirm({
            type: 'delete', title: isGlobalDelete ? 'Vô hiệu hóa nhân sự' : 'Gỡ khỏi chi nhánh',
            message: isGlobalDelete ? `Vô hiệu hóa tài khoản "${empName}" khỏi hệ thống?` : `Gỡ "${empName}" khỏi ca trực của chi nhánh này?`,
            onConfirm: () => {
                setAllEmployees(prev => {
                    if (isGlobalDelete) {
                        return prev.map(e => e.id === empId ? { ...e, status: 'disable' } : e);
                    }
                    return prev.map(e => {
                        if (e.id === empId) {
                            const newStores = (e.assignedStores || []).filter(id => id !== storeId);
                            return { ...e, assignedStores: newStores };
                        }
                        return e;
                    });
                });
                setShowModal(null);
                showToast(isGlobalDelete ? "Đã vô hiệu hóa tài khoản nhân sự." : "Đã gỡ khỏi chi nhánh.");
            }
        });
    };

    const handleAddExistingEmployee = (storeId, empId) => {
        setAllEmployees(prev => prev.map(e => {
            if (e.id === empId) {
                const assignedStores = e.assignedStores || [];
                if (!assignedStores.includes(storeId)) {
                    return {
                        ...e,
                        assignedStores: [...assignedStores, storeId],
                        schedule: { ...e.schedule, [storeId]: { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] } }
                    };
                }
            }
            return e;
        }));
        setShowModal(null);
        showToast("Đã kéo nhân sự vào chi nhánh.");
    };

    const handleResetPassword = (empId, empName) => {
        requestConfirm({
            type: 'edit', title: 'Khôi phục mật khẩu',
            message: `Đặt lại mật khẩu cho "${empName}" thành "123456"?`,
            onConfirm: () => {
                setAllEmployees(prev => prev.map(e => e.id === empId ? { ...e, password: '123456' } : e));
                setShowModal(null);
                showToast("Đã đặt lại mật khẩu thành 123456.");
            }
        });
    };

    const handleChangePassword = (oldPassword, newPassword) => {
        if (user.role === 'admin') {
            showToast("Tài khoản Admin không thể đổi mật khẩu ở đây.");
            return false;
        }
        const emp = allEmployees.find(e => e.username === user.username);
        if (!emp || emp.password !== oldPassword) {
            return "Mật khẩu hiện tại không chính xác!";
        }
        setAllEmployees(prev => prev.map(e => e.username === user.username ? { ...e, password: newPassword } : e));
        setShowModal(null);
        showToast("Đã đổi mật khẩu thành công!");
        return null;
    };

    const handleUpdateEmployeeStatus = (empId, newStatus) => {
        setAllEmployees(prev => prev.map(e => e.id === empId ? { ...e, status: newStatus } : e));
        showToast(newStatus === 'active' ? "Đã duyệt tài khoản!" : "Đã cập nhật trạng thái.");
    };

    const handleAddStockRequest = (storeId, productId, quantity, note) => {
        const product = globalProducts.find(p => p.id === productId);
        const store = stores.find(s => s.id === storeId);
        setStockRequests(prev => [{
            id: 'req' + Date.now(),
            storeId, storeName: store?.name,
            productId, productName: product?.name,
            quantity: Number(quantity),
            status: 'pending',
            date: new Date().toISOString(),
            note
        }, ...prev]);
        setShowModal(null);
        showToast("Đã gửi yêu cầu cấp hàng đến Kho tổng.");
    };

    const handleProcessStockRequest = (requestId, status) => {
        const req = stockRequests.find(r => r.id === requestId);
        if (!req) return;

        if (status === 'shipping') {
            const product = globalProducts.find(p => p.id === req.productId);
            if (!product || product.warehouseStock < req.quantity) {
                showToast("Lỗi: Kho tổng không đủ hàng để duyệt!");
                return;
            }
            setGlobalProducts(globalProducts.map(p => p.id === req.productId ? { ...p, warehouseStock: p.warehouseStock - req.quantity } : p));
            setWarehouseTransactions(prev => [...prev, {
                id: 'tx' + Date.now(), type: 'distribute', productId: req.productId,
                productName: product?.name || 'N/A', storeId: req.storeId,
                storeName: req.storeName || 'N/A', quantity: req.quantity,
                date: new Date().toISOString(),
                note: `Xuất kho gửi đến ${req.storeName} (Đang giao)`
            }]);
        }
        setStockRequests(prev => prev.map(r => r.id === requestId ? { ...r, status } : r));
        if (status === 'rejected') showToast("Đã từ chối yêu cầu.");
        else showToast("Đã xuất kho, chờ chi nhánh nhận.");
    };

    const handleReceiveStockRequest = (requestId) => {
        const req = stockRequests.find(r => r.id === requestId);
        if (!req || req.status !== 'shipping') return;

        setStores(stores.map(s => {
            if (s.id === req.storeId) {
                const exist = s.inventory.find(i => i.productId === req.productId);
                const inv = exist
                    ? s.inventory.map(i => i.productId === req.productId ? { ...i, quantity: i.quantity + req.quantity } : i)
                    : [...s.inventory, { productId: req.productId, quantity: req.quantity, sold: 0 }];
                return { ...s, inventory: inv };
            }
            return s;
        }));

        setStockRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'completed' } : r));

        showToast("Đã xác nhận nhận hàng vào kho chi nhánh!");
    };

    const handleReturnStock = (storeId, productId, amount, reason) => {
        const qty = Number(amount);
        if (qty <= 0) return;
        const product = globalProducts.find(p => p.id === productId);
        const store = stores.find(s => s.id === storeId);
        
        const storeInventoryItem = store?.inventory.find(i => i.productId === productId);
        if (!storeInventoryItem || storeInventoryItem.quantity < qty) {
            showToast("Số lượng trong kho không đủ để hoàn trả!");
            return;
        }

        setGlobalProducts(globalProducts.map(p => p.id === productId ? { ...p, warehouseStock: p.warehouseStock + qty } : p));
        
        setStores(stores.map(s => s.id === storeId ? { ...s, inventory: s.inventory.map(i => i.productId === productId ? { ...i, quantity: i.quantity - qty } : i) } : s));

        setWarehouseTransactions(prev => [...prev, {
            id: 'tx' + Date.now(), type: 'return', productId,
            productName: product?.name || 'N/A', storeId,
            storeName: store?.name || 'N/A', quantity: qty,
            date: new Date().toISOString(),
            note: `Hoàn kho: ${reason || 'Không xác định'}`
        }]);

        setShowModal(null);
        showToast("Đã xuất trả hàng về kho tổng.");
    };

    const handleTransferStock = (fromStoreId, toStoreId, productId, amount, note) => {
        const qty = Number(amount);
        if (qty <= 0 || fromStoreId === toStoreId) {
            showToast("Thông tin luân chuyển không hợp lệ!");
            return;
        }
        const product = globalProducts.find(p => p.id === productId);
        const fromStore = stores.find(s => s.id === fromStoreId);
        const toStore = stores.find(s => s.id === toStoreId);
        
        const fromInventoryItem = fromStore?.inventory.find(i => i.productId === productId);
        if (!fromInventoryItem || fromInventoryItem.quantity < qty) {
            showToast("Số lượng trong kho không đủ để luân chuyển!");
            return;
        }

        setStores(stores.map(s => {
            if (s.id === fromStoreId) return { ...s, inventory: s.inventory.map(i => i.productId === productId ? { ...i, quantity: i.quantity - qty } : i) };
            if (s.id === toStoreId) {
                const exist = s.inventory.find(i => i.productId === productId);
                const inv = exist ? s.inventory.map(i => i.productId === productId ? { ...i, quantity: i.quantity + qty } : i) : [...s.inventory, { productId, quantity: qty, sold: 0 }];
                return { ...s, inventory: inv };
            }
            return s;
        }));

        const now = new Date().toISOString();
        setWarehouseTransactions(prev => [
            ...prev,
            { id: 'tx_out_' + Date.now() + '1', type: 'transfer_out', productId, productName: product?.name || 'N/A', storeId: fromStoreId, storeName: fromStore?.name || 'N/A', quantity: qty, date: now, note: `Chuyển đến ${toStore?.name}: ${note || ''}` },
            { id: 'tx_in_' + Date.now() + '2', type: 'transfer_in', productId, productName: product?.name || 'N/A', storeId: toStoreId, storeName: toStore?.name || 'N/A', quantity: qty, date: now, note: `Nhận từ ${fromStore?.name}: ${note || ''}` }
        ]);

        setShowModal(null);
        showToast(`Đã luân chuyển hàng đến ${toStore?.name}.`);
    };

    const handleSaveGlobalProduct = (productData) => {
        requestConfirm({
            type: 'add', title: 'Tạo sản phẩm',
            message: `Thêm "${productData.name}" vào danh mục?`,
            onConfirm: () => {
                setGlobalProducts([...globalProducts, {
                    ...productData, id: 'p' + Date.now(),
                    warehouseStock: Number(productData.initialStock || 0),
                    basePrice: Number(productData.basePrice)
                }]);
                setShowModal(null);
                showToast("Đã tạo sản phẩm.");
            }
        });
    };

    const handleImportToWarehouse = (productId, amount) => {
        const qty = Number(amount);
        const product = globalProducts.find(p => p.id === productId);
        setGlobalProducts(globalProducts.map(p => p.id === productId ? { ...p, warehouseStock: p.warehouseStock + qty } : p));
        setWarehouseTransactions(prev => [...prev, {
            id: 'tx' + Date.now(), type: 'import', productId,
            productName: product?.name || 'N/A', quantity: qty,
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
                const inv = exist
                    ? s.inventory.map(i => i.productId === productId ? { ...i, quantity: i.quantity + qty } : i)
                    : [...s.inventory, { productId, quantity: qty, sold: 0 }];
                return { ...s, inventory: inv };
            }
            return s;
        }));
        setWarehouseTransactions(prev => [...prev, {
            id: 'tx' + Date.now(), type: 'distribute', productId,
            productName: product?.name || 'N/A', storeId,
            storeName: store?.name || 'N/A', quantity: qty,
            date: new Date().toISOString(),
            note: `Phân phối ${qty} ${product?.unit || 'cái'} đến ${store?.name}`
        }]);
        setShowModal(null);
        showToast("Đã phân phối hàng.");
    };

    const handleAddStore = (storeData) => {
        setStores([...stores, { ...storeData, id: 's' + Date.now(), employees: [], inventory: [], transactions: [] }]);
        setShowModal(null);
        showToast("Đã mở chi nhánh.");
    };

    const handleEditStore = (storeId, storeData) => {
        setStores(stores.map(s => s.id === storeId ? { ...s, ...storeData } : s));
        setShowModal(null);
        setEditingStore(null);
        showToast("Đã cập nhật chi nhánh.");
    };

    const handleDeleteStore = (storeId, storeName) => {
        requestConfirm({
            type: 'delete', title: 'Xóa chi nhánh',
            message: `Xác nhận xóa hoàn toàn chi nhánh "${storeName}"?`,
            onConfirm: () => {
                setStores(stores.filter(s => s.id !== storeId));
                setSelectedStore(null);
                setShowModal(null);
                showToast("Đã xóa chi nhánh.");
            }
        });
    };

    const handleSellProduct = (storeId, productId) => {
        const product = globalProducts.find(p => p.id === productId);
        const store = stores.find(s => s.id === storeId);
        setStores(stores.map(s => s.id === storeId ? {
            ...s, inventory: s.inventory.map(i => i.productId === productId
                ? { ...i, quantity: i.quantity - 1, sold: (i.sold || 0) + 1 } : i)
        } : s));
        setWarehouseTransactions(prev => [...prev, {
            id: 'tx' + Date.now(), type: 'sell', productId,
            productName: product?.name || 'N/A', storeId,
            storeName: store?.name || 'N/A', quantity: 1,
            unitPrice: product?.basePrice || 0,
            date: new Date().toISOString(),
            note: `Bán 1 ${product?.unit || 'cái'} tại ${store?.name}`
        }]);
        showToast("Đã ghi nhận bán hàng.");
    };

    const getProductInfo = (pid) => globalProducts.find(p => p.id === pid) || { name: 'N/A', sku: 'N/A', category: 'N/A', unit: 'cái' };

    return {
        // State
        user, stores, globalProducts, warehouseTransactions, categories, stockRequests,
        activeTab, selectedStore, storeSubTab, showModal, pendingAction,
        editingEmployee, editingStore, toast, showUserMenu, searchTerm, historyFilter, setUser,
        currentStore, allEmployees, totalValue,
        // Setters
        setCategories, setActiveTab, setSelectedStore, setStoreSubTab, setShowModal,
        setPendingAction, setEditingEmployee, setEditingStore, setShowUserMenu,
        setSearchTerm, setHistoryFilter,
        // Handlers
        handleLogin, handleLogout, handleSaveEmployee, handleDeleteEmployee, handleAddExistingEmployee, handleUpdateEmployeeStatus,
        handleResetPassword, handleChangePassword, handleSaveGlobalProduct, handleImportToWarehouse, handleDistribute, handleAddStockRequest, handleProcessStockRequest, handleReceiveStockRequest, handleReturnStock, handleTransferStock,
        handleAddStore, handleEditStore, handleDeleteStore, handleSellProduct,
        getProductInfo, showToast,
    };
}
