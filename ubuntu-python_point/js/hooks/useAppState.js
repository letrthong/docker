import { useState, useEffect, useMemo } from 'react';
import { initialGlobalProducts, initialStores } from '../constants';

const getCache = (key, fallback) => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
};

const setCache = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

export function useAppState() {
    const [user, setUser] = useState(() => getCache('chain_user', null));
    const [stores, setStores] = useState(() => getCache('chain_stores', initialStores));
    const [globalProducts, setGlobalProducts] = useState(() => getCache('chain_products', initialGlobalProducts));
    const [warehouseTransactions, setWarehouseTransactions] = useState(() => getCache('chain_warehouse_tx', []));

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
        if (user && user.role === 'staff') setActiveTab('my-store');
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
        let found = null;
        let sId = null;
        stores.forEach(s => {
            const e = s.employees.find(emp => emp.username && emp.username.toLowerCase() === inputUsername && emp.password === loginForm.password);
            if (e) { found = e; sId = s.id; }
        });
        if (found) {
            setUser({ username: found.username, role: 'staff', storeId: sId, name: found.name, staffRole: found.role });
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
        // Kiểm tra trùng username (không phân biệt hoa thường)
        const inputUsername = employeeData.username?.toLowerCase();
        const isDuplicate = stores.some(s =>
            s.employees.some(e =>
                e.username && e.username.toLowerCase() === inputUsername && (!isEdit || e.id !== editingEmployee?.id)
            )
        );
        if (isDuplicate) {
            showToast("Username đã tồn tại!");
            return;
        }
        requestConfirm({
            type: isEdit ? 'edit' : 'add',
            title: isEdit ? 'Cập nhật' : 'Đăng ký mới',
            message: `Lưu hồ sơ cho ${employeeData.name}?`,
            onConfirm: () => {
                setStores(stores.map(s => {
                    if (s.id === storeId) {
                        if (isEdit) return { ...s, employees: s.employees.map(e => e.id === editingEmployee.id ? { ...employeeData, id: e.id } : e) };
                        return { ...s, employees: [...s.employees, { ...employeeData, id: 'e' + Date.now() }] };
                    }
                    return s;
                }));
                setShowModal(null);
                setEditingEmployee(null);
                showToast("Đã cập nhật nhân sự.");
            }
        });
    };

    const handleDeleteEmployee = (storeId, empId, empName) => {
        requestConfirm({
            type: 'delete', title: 'Xóa nhân sự',
            message: `Gỡ bỏ "${empName}" khỏi hệ thống?`,
            onConfirm: () => {
                setStores(stores.map(s => s.id === storeId ? { ...s, employees: s.employees.filter(e => e.id !== empId) } : s));
                setShowModal(null);
                showToast("Đã xóa nhân sự.");
            }
        });
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
        user, stores, globalProducts, warehouseTransactions,
        activeTab, selectedStore, storeSubTab, showModal, pendingAction,
        editingEmployee, toast, showUserMenu, searchTerm, historyFilter,
        currentStore, allEmployees, totalValue,
        // Setters
        setActiveTab, setSelectedStore, setStoreSubTab, setShowModal,
        setPendingAction, setEditingEmployee, setShowUserMenu,
        setSearchTerm, setHistoryFilter,
        // Handlers
        handleLogin, handleLogout, handleSaveEmployee, handleDeleteEmployee,
        handleSaveGlobalProduct, handleImportToWarehouse, handleDistribute,
        handleAddStore, handleDeleteStore, handleSellProduct,
        getProductInfo, showToast,
    };
}
