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
const initialShiftSlots = [
    { id: 's1', label: 'Ca Sáng', time: '08:00 - 12:00', hidden: false, color: 'blue' },
    { id: 's2', label: 'Ca Chiều', time: '13:00 - 17:00', hidden: false, color: 'emerald' },
    { id: 's3', label: 'Ca Tối', time: '18:00 - 22:00', hidden: false, color: 'slate' }
];

export function useAppState() {
    const [user, setUser] = useState(() => getCache('chain_user', null));
    const [stores, setStores] = useState(initialStores);
    const [globalProducts, setGlobalProducts] = useState(initialGlobalProducts);
    const [warehouseTransactions, setWarehouseTransactions] = useState([]);
    const [categories, setCategories] = useState(initialCategories);
    const [shiftSlots, setShiftSlots] = useState(initialShiftSlots);
    const [stockRequests, setStockRequests] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);

    const [activeTab, setActiveTab] = useState('dashboard');
    const [isLoaded, setIsLoaded] = useState(false);
    const [selectedStore, setSelectedStore] = useState(null);
    const [storeSubTab, setStoreSubTab] = useState('inventory');
    const [showModal, setShowModal] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [editingStore, setEditingStore] = useState(null);
    const [sellingItem, setSellingItem] = useState(null);
    const [toast, setToast] = useState(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [historyFilter, setHistoryFilter] = useState({ type: 'all', year: String(new Date().getFullYear()), viewMode: 'year' });

    // Khởi tạo: Lấy dữ liệu từ Backend khi mở ứng dụng (Ưu tiên Backend hơn LocalStorage)
    useEffect(() => {
        // Chủ động xóa bỏ dữ liệu nhạy cảm cũ có thể còn lưu ở LocalStorage của trình duyệt
        localStorage.removeItem('chain_employees');
        localStorage.removeItem('chain_products');
        localStorage.removeItem('chain_stores');
        localStorage.removeItem('chain_warehouse_tx');
        localStorage.removeItem('chain_categories');
        localStorage.removeItem('chain_shift_slots');
        localStorage.removeItem('chain_stock_requests');

        fetch('/pos/api/v1/config')
            .then(res => res.json())
            .then(data => {
                if (data.stores && data.stores.length > 0) setStores(data.stores);
                if (data.products && data.products.length > 0) setGlobalProducts(data.products);
                if (data.allEmployees && data.allEmployees.length > 0) setAllEmployees(data.allEmployees);
                if (data.stockRequests && data.stockRequests.length > 0) setStockRequests(data.stockRequests);
                if (data.categories && data.categories.length > 0) setCategories(data.categories);
                if (data.shiftSlots && data.shiftSlots.length > 0) setShiftSlots(data.shiftSlots);
                setIsLoaded(true);
            })
            .catch(err => { console.error("Lỗi kết nối Backend:", err); setIsLoaded(true); });
    }, []);

    // Đồng bộ: Đẩy dữ liệu lên Backend mỗi khi có thay đổi (Auto-Save)
    useEffect(() => {
        if (!isLoaded) return;
        if (stores.length === 0 && globalProducts.length === 0 && allEmployees.length === 0) return;
        fetch('/pos/api/v1/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stores, products: globalProducts, allEmployees, stockRequests, categories, shiftSlots })
        }).catch(err => console.error("Lỗi đồng bộ Backend:", err));
    }, [isLoaded, stores, globalProducts, allEmployees, stockRequests, categories, shiftSlots]);

    useEffect(() => {
        setCache('chain_user', user);
        if (user && user.role === 'staff') setActiveTab('my-store');
    }, [user]);

    const currentStore = useMemo(() => {
        if (!user) return null;
        return selectedStore || (user.role === 'staff' ? stores.find(s => s.id === user.storeId) : null);
    }, [selectedStore, user, stores]);

    const totalValue = useMemo(() => {
        return globalProducts.reduce((sum, p) => sum + (Number(p.warehouseStock) * Number(p.basePrice)), 0);
    }, [globalProducts]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const requestConfirm = (actionConfig) => {
        setPendingAction(actionConfig);
        setShowModal('confirmPopup');
    };

    const handleLogin = async (loginForm) => {
        try {
            const res = await fetch('/pos/api/v1/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginForm)
            });
            const data = await res.json();
            
            if (!res.ok) {
                return data.error || 'Sai tài khoản hoặc mật khẩu!';
            }
            
            setCache('chain_token', data.token); // Lưu lại JWT token vào LocalStorage
            setUser(data.user);
            if (data.user.role === 'admin') {
                setActiveTab('dashboard');
            }
            return null;
        } catch (error) {
            console.error("Lỗi đăng nhập:", error);
            return 'Lỗi kết nối máy chủ!';
        }
    };

    const handleLogout = () => {
        setUser(null);
        setSelectedStore(null);
        setShowUserMenu(false);
        localStorage.removeItem('chain_user');
        localStorage.removeItem('chain_token');
    };

    const handleSaveEmployee = (storeId, employeeData) => {
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
        setAllEmployees(prev => {
            if (isEdit) return prev.map(e => e.id === editingEmployee.id ? { ...employeeData, id: e.id } : e);
            return [...prev, { ...employeeData, id: employeeData.cccd }];
        });
        setShowModal(null);
        setEditingEmployee(null);
        showToast(isEdit ? "Đã cập nhật hồ sơ nhân sự thành công!" : "Đã thêm nhân sự mới thành công!");
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
        const reqQty = Number(quantity);
        if (reqQty > (product?.warehouseStock || 0)) {
            showToast(`Lỗi: Kho tổng chỉ còn ${product?.warehouseStock || 0} sản phẩm!`);
            return;
        }
        const store = stores.find(s => s.id === storeId);
        setStockRequests(prev => [{
            id: 'req_' + crypto.randomUUID().replace(/-/g, ''),
            storeId, storeName: store?.name,
            productId, productName: product?.name,
            quantity: reqQty,
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
            setGlobalProducts(globalProducts.map(p => p.id === req.productId ? { ...p, warehouseStock: Number(p.warehouseStock) - req.quantity } : p));
            setWarehouseTransactions(prev => [...prev, {
                id: 'tx_' + crypto.randomUUID().replace(/-/g, ''), type: 'distribute', productId: req.productId,
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
                    ? s.inventory.map(i => i.productId === req.productId ? { ...i, quantity: Number(i.quantity) + req.quantity } : i)
                    : [...s.inventory, { productId: req.productId, quantity: req.quantity, sold: 0 }];
                return { ...s, inventory: inv };
            }
            return s;
        }));

        setStockRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'completed' } : r));

        showToast("Đã xác nhận nhận hàng vào kho chi nhánh!");
    };

    const handleReturnStock = async (storeId, productId, amount, reason) => {
        const qty = Number(amount);
        if (qty <= 0) return;

        try {
            const res = await fetch(`/pos/api/v1/stores/${storeId}/action/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, quantity: qty, note: reason })
            });
            const result = await res.json();
            if (!res.ok) {
                showToast(result.error || "Giao dịch thất bại từ Server!");
                return;
            }

            const product = globalProducts.find(p => p.id === productId);
            const store = stores.find(s => s.id === storeId);
            
            setGlobalProducts(globalProducts.map(p => p.id === productId ? { ...p, warehouseStock: Number(p.warehouseStock) + qty } : p));
            setStores(stores.map(s => s.id === storeId ? { ...s, inventory: s.inventory.map(i => i.productId === productId ? { ...i, quantity: Number(i.quantity) - qty } : i) } : s));

            setWarehouseTransactions(prev => [...prev, {
                id: 'tx_' + crypto.randomUUID().replace(/-/g, ''), type: 'return', productId,
                productName: product?.name || 'N/A', storeId,
                storeName: store?.name || 'N/A', quantity: qty,
                date: new Date().toISOString(),
                note: `Hoàn kho: ${reason || 'Không xác định'}`
            }]);

            setShowModal(null);
            showToast(`Đã xuất trả ${qty} SP về kho tổng (An toàn từ Server).`);
        } catch (error) {
            showToast("Lỗi kết nối máy chủ!");
        }
    };

    const handleTransferStock = async (fromStoreId, toStoreId, productId, amount, note) => {
        const qty = Number(amount);
        if (qty <= 0 || fromStoreId === toStoreId) {
            showToast("Thông tin luân chuyển không hợp lệ!");
            return;
        }

        try {
            const res = await fetch(`/pos/api/v1/stores/${fromStoreId}/action/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toStoreId, productId, quantity: qty, note })
            });
            const result = await res.json();
            if (!res.ok) {
                showToast(result.error || "Giao dịch thất bại từ Server!");
                return;
            }

            const product = globalProducts.find(p => p.id === productId);
            const fromStore = stores.find(s => s.id === fromStoreId);
            const toStore = stores.find(s => s.id === toStoreId);

            setStores(stores.map(s => {
                if (s.id === fromStoreId) return { ...s, inventory: s.inventory.map(i => i.productId === productId ? { ...i, quantity: Number(i.quantity) - qty } : i) };
                if (s.id === toStoreId) {
                    const exist = s.inventory.find(i => i.productId === productId);
                    const inv = exist ? s.inventory.map(i => i.productId === productId ? { ...i, quantity: Number(i.quantity) + qty } : i) : [...s.inventory, { productId, quantity: qty, sold: 0 }];
                    return { ...s, inventory: inv };
                }
                return s;
            }));

            const now = new Date().toISOString();
            setWarehouseTransactions(prev => [
                ...prev,
                { id: 'tx_out_' + crypto.randomUUID().replace(/-/g, ''), type: 'transfer_out', productId, productName: product?.name || 'N/A', storeId: fromStoreId, storeName: fromStore?.name || 'N/A', quantity: qty, date: now, note: `Chuyển đến ${toStore?.name}: ${note || ''}` },
                { id: 'tx_in_' + crypto.randomUUID().replace(/-/g, ''), type: 'transfer_in', productId, productName: product?.name || 'N/A', storeId: toStoreId, storeName: toStore?.name || 'N/A', quantity: qty, date: now, note: `Nhận từ ${fromStore?.name}: ${note || ''}` }
            ]);

            setShowModal(null);
            showToast(`Đã luân chuyển ${qty} SP đến ${toStore?.name} (An toàn từ Server).`);
        } catch (error) {
            showToast("Lỗi kết nối máy chủ!");
        }
    };

    const handleSaveGlobalProduct = (productData) => {
        requestConfirm({
            type: 'add', title: 'Tạo sản phẩm',
            message: `Thêm "${productData.name}" vào danh mục?`,
            onConfirm: () => {
                setGlobalProducts([...globalProducts, {
                    ...productData, id: 'p_' + crypto.randomUUID().replace(/-/g, ''),
                    warehouseStock: Number(productData.initialStock || 0),
                    basePrice: Number(productData.basePrice)
                }]);
                setShowModal(null);
                showToast("Đã tạo sản phẩm.");
            }
        });
    };

    const handleImportToWarehouse = async (productId, amount) => {
        const qty = Number(amount);
        if (qty <= 0) return;

        try {
            const res = await fetch(`/pos/api/v1/products/${productId}/action/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: qty })
            });
            const result = await res.json();
            if (!res.ok) {
                showToast(result.error || "Giao dịch thất bại từ Server!");
                return;
            }

        const product = globalProducts.find(p => p.id === productId);
        setGlobalProducts(globalProducts.map(p => p.id === productId ? { ...p, warehouseStock: Number(p.warehouseStock) + qty } : p));
        setWarehouseTransactions(prev => [...prev, {
            id: 'tx_' + crypto.randomUUID().replace(/-/g, ''), type: 'import', productId,
            productName: product?.name || 'N/A', quantity: qty,
            date: new Date().toISOString(),
            note: `Nhập ${qty} ${product?.unit || 'cái'} vào kho tổng`
        }]);
        showToast(`Đã nhập ${qty} SP vào kho tổng (Xử lý an toàn bởi Server).`);
        } catch (error) {
            showToast("Lỗi kết nối máy chủ!");
        }
    };

    const handleDistribute = async (storeId, productId, amount) => {
        const qty = Number(amount);
        if (qty <= 0) return;

        try {
            const res = await fetch(`/pos/api/v1/stores/${storeId}/action/distribute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, quantity: qty })
            });
            const result = await res.json();
            if (!res.ok) {
                showToast(result.error || "Giao dịch thất bại từ Server!");
                return;
            }

        const product = globalProducts.find(p => p.id === productId);
        const store = stores.find(s => s.id === storeId);
        setGlobalProducts(globalProducts.map(p => p.id === productId ? { ...p, warehouseStock: Number(p.warehouseStock) - qty } : p));
        setStores(stores.map(s => {
            if (s.id === storeId) {
                const exist = s.inventory.find(i => i.productId === productId);
                const inv = exist
                    ? s.inventory.map(i => i.productId === productId ? { ...i, quantity: Number(i.quantity) + qty } : i)
                    : [...s.inventory, { productId, quantity: qty, sold: 0 }];
                return { ...s, inventory: inv };
            }
            return s;
        }));
        setWarehouseTransactions(prev => [...prev, {
            id: 'tx_' + crypto.randomUUID().replace(/-/g, ''), type: 'distribute', productId,
            productName: product?.name || 'N/A', storeId,
            storeName: store?.name || 'N/A', quantity: qty,
            date: new Date().toISOString(),
            note: `Phân phối ${qty} ${product?.unit || 'cái'} đến ${store?.name}`
        }]);
        setShowModal(null);
        showToast(`Đã phân phối ${qty} SP (Xử lý an toàn bởi Server).`);
        } catch (error) {
            showToast("Lỗi kết nối máy chủ!");
        }
    };

    const handleAddStore = (storeData) => {
        setStores([...stores, { ...storeData, id: 's_' + crypto.randomUUID().replace(/-/g, ''), employees: [], inventory: [], transactions: [] }]);
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

    const handleSellProduct = async (storeId, productId, amount) => {
        const qty = Number(amount);
        if (qty <= 0) return;

        try {
            // Yêu cầu Backend xử lý trực tiếp thay vì tự tính ở Frontend
            const res = await fetch(`/pos/api/v1/stores/${storeId}/action/sell`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, quantity: qty })
            });
            const result = await res.json();
            
            if (!res.ok) {
                showToast(result.error || "Giao dịch thất bại từ Server!");
                return;
            }

        const product = globalProducts.find(p => p.id === productId);
        const store = stores.find(s => s.id === storeId);
        
            // Thành công: Cập nhật đồng bộ lại giao diện mượt mà (Optimistic UI)
        setStores(stores.map(s => s.id === storeId ? {
            ...s, inventory: s.inventory.map(i => i.productId === productId
                ? { ...i, quantity: Number(i.quantity) - qty, sold: Number(i.sold || 0) + qty } : i)
        } : s));
        setWarehouseTransactions(prev => [...prev, {
            id: 'tx_' + crypto.randomUUID().replace(/-/g, ''), type: 'sell', productId,
            productName: product?.name || 'N/A', storeId,
            storeName: store?.name || 'N/A', quantity: qty,
            unitPrice: product?.basePrice || 0,
            date: new Date().toISOString(),
            note: `Bán ${qty} ${product?.unit || 'cái'} tại ${store?.name}`
        }]);
        setShowModal(null);
        setSellingItem(null);
        showToast(`Đã ghi nhận bán ${qty} SP (Xử lý an toàn bởi Server).`);
        } catch (error) {
            showToast("Lỗi kết nối máy chủ!");
        }
    };

    const getProductInfo = (pid) => globalProducts.find(p => p.id === pid) || { name: 'N/A', sku: 'N/A', category: 'N/A', unit: 'cái' };

    return {
        // State
        user, stores, globalProducts, warehouseTransactions, categories, shiftSlots, stockRequests,
        activeTab, selectedStore, storeSubTab, showModal, pendingAction,
        editingEmployee, editingStore, sellingItem, toast, showUserMenu, searchTerm, historyFilter, setUser,
        currentStore, allEmployees, totalValue,
        // Setters
        setCategories, setShiftSlots, setActiveTab, setSelectedStore, setStoreSubTab, setShowModal,
        setPendingAction, setEditingEmployee, setEditingStore, setSellingItem, setShowUserMenu,
        setSearchTerm, setHistoryFilter,
        // Handlers
        handleLogin, handleLogout, handleSaveEmployee, handleDeleteEmployee, handleAddExistingEmployee, handleUpdateEmployeeStatus,
        handleResetPassword, handleChangePassword, handleSaveGlobalProduct, handleImportToWarehouse, handleDistribute, handleAddStockRequest, handleProcessStockRequest, handleReceiveStockRequest, handleReturnStock, handleTransferStock,
        handleAddStore, handleEditStore, handleDeleteStore, handleSellProduct,
        getProductInfo, showToast,
    };
}
