import { useState, useEffect, useMemo, useRef } from 'react';
import { initialGlobalProducts, initialStores } from '../constants';

const getCache = (key, fallback) => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
};

const setCache = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID().replace(/-/g, '');
    }
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
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
    const [storeTransactions, setStoreTransactions] = useState([]);
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
    const [importingItem, setImportingItem] = useState(null);
    const [toast, setToast] = useState(null);
    const [toastType, setToastType] = useState('success');
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [historyFilter, setHistoryFilter] = useState({ type: 'all', year: String(new Date().getFullYear()), viewMode: 'year' });

    const toastTimeoutRef = useRef(null);
    const lastModifiedRef = useRef(0); // Cờ lưu trữ timestamp để kiểm tra update

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

    // Đồng bộ độc lập: Cập nhật lại danh sách Nhân sự
    useEffect(() => {
        if (!isLoaded || allEmployees.length === 0) return;
        fetch('/pos/api/v1/employees/bulk', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(allEmployees)
        }).catch(err => console.error("Lỗi đồng bộ NV:", err));
    }, [allEmployees, isLoaded]);

    // Đồng bộ độc lập: Cập nhật lại Yêu cầu kho
    useEffect(() => {
        if (!isLoaded || stockRequests.length === 0) return;
        fetch('/pos/api/v1/requests/bulk', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stockRequests)
        }).catch(err => console.error("Lỗi đồng bộ Yêu cầu:", err));
    }, [stockRequests, isLoaded]);

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

    useEffect(() => {
        let ignore = false;
        if (currentStore && currentStore.id) {
            fetch(`/pos/api/v1/stores/${currentStore.id}/transactions`)
                .then(res => res.json())
                .then(data => {
                    if (!ignore && Array.isArray(data)) setStoreTransactions(data);
                })
                .catch(err => { if (!ignore) console.error("Lỗi lấy lịch sử giao dịch:", err) });
        } else {
            setStoreTransactions([]);
        }
        return () => { ignore = true; };
    }, [currentStore?.id]);

    // Tự động tải toàn bộ lịch sử giao dịch (Warehouse + Stores) khi là Admin
    useEffect(() => {
        if (user && user.role === 'admin') {
            fetch('/pos/api/v1/transactions/all')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setWarehouseTransactions(data);
                })
                .catch(err => console.error("Lỗi lấy lịch sử toàn hệ thống:", err));
        }
    }, [user?.role]);

    const showToast = (msg, type = 'success') => {
        setToast(msg);
        setToastType(type);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        };
    }, []);

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

    // =====================================================================
    // AUTO LOGOUT: Tự động đăng xuất sau 30 phút không có thao tác (Idle)
    // =====================================================================
    useEffect(() => {
        // Chỉ kích hoạt bộ đếm giờ khi người dùng ĐÃ đăng nhập
        if (!user) return;

        let timeoutId;
        const logoutTime = 30 * 60 * 1000; // 30 phút = 1,800,000 ms

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                handleLogout();
                showToast("Phiên làm việc đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.", 'error');
            }, logoutTime);
        };

        // Dùng Debounce/Throttle để không gọi resetTimer liên tục gây tốn CPU khi di chuột
        let throttleTimer;
        const handleActivity = () => {
            if (throttleTimer) return;
            throttleTimer = setTimeout(() => {
                resetTimer();
                throttleTimer = null;
            }, 1000); // Chỉ làm mới bộ đếm tối đa 1 lần mỗi giây
        };

        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, handleActivity));
        resetTimer(); // Khởi tạo đếm ngược ngay khi vừa đăng nhập xong

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (throttleTimer) clearTimeout(throttleTimer);
            events.forEach(e => window.removeEventListener(e, handleActivity));
        };
    }, [user]);

    const handleSaveEmployee = (storeId, employeeData) => {
        const isEdit = !!editingEmployee;

        const inputCccd = (employeeData.cccd || '').trim();
        if (!inputCccd) {
            showToast("Vui lòng nhập số CCCD/CMND!", 'error');
            return;
        }
        const isDuplicateCccd = allEmployees.some(e => e.cccd === inputCccd && (!isEdit || e.id !== editingEmployee?.id));
        if (isDuplicateCccd) {
            showToast("Số CCCD/CMND đã tồn tại trong hệ thống!", 'error');
            return;
        }

        const inputUsername = (employeeData.username || '').toLowerCase();
        const isDuplicate = allEmployees.some(e => e.username && e.username.toLowerCase() === inputUsername && (!isEdit || e.id !== editingEmployee?.id));
        if (isDuplicate) {
            showToast("Username đã tồn tại!", 'error');
            return;
        }
        setAllEmployees(prev => {
            if (isEdit) return prev.map(e => e.id === editingEmployee.id ? { ...employeeData, id: e.id } : e);
            return [...prev, { ...employeeData, id: 'e_' + generateId() }];
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
            showToast("Tài khoản Admin không thể đổi mật khẩu ở đây.", 'error');
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
            showToast(`Lỗi: Kho tổng chỉ còn ${product?.warehouseStock || 0} sản phẩm!`, 'error');
            return;
        }
        const store = stores.find(s => s.id === storeId);
        setStockRequests(prev => [{
            id: 'req_' + generateId(),
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

    const handleProcessStockRequest = async (requestId, status) => {
        const action = status === 'shipping' ? 'approve' : 'reject';
        try {
            const res = await fetch('/pos/api/v1/requests/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, action })
            });
            const result = await res.json();
            
            if (!res.ok) {
                showToast(result.error || "Giao dịch thất bại từ Server!", 'error');
                return;
            }

            const req = stockRequests.find(r => r.id === requestId);
            if (!req) return;

            if (action === 'approve') {
                const product = globalProducts.find(p => p.id === req.productId);
                setGlobalProducts(globalProducts.map(p => p.id === req.productId ? { ...p, warehouseStock: Number(p.warehouseStock) - req.quantity } : p));
                setWarehouseTransactions(prev => [...prev, {
                    id: 'tx_' + generateId(), type: 'distribute', productId: req.productId,
                    productName: product?.name || 'N/A', storeId: req.storeId,
                    storeName: req.storeName || 'N/A', quantity: req.quantity,
                    costPrice: product?.costPrice || 0, unitPrice: product?.basePrice || 0,
                    date: new Date().toISOString(),
                    note: `Xuất kho gửi đến ${req.storeName} (Đang giao)`
                }]);
            }
            
            setStockRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: result.request.status } : r));
            if (action === 'reject') showToast("Đã từ chối yêu cầu (Xử lý an toàn).", 'error');
            else showToast("Đã xuất kho, chờ chi nhánh nhận (Xử lý an toàn).");

        } catch (error) {
            console.error("Lỗi xử lý yêu cầu:", error);
            showToast("Lỗi kết nối máy chủ!", 'error');
        }
    };

    const handleReceiveStockRequest = async (requestId) => {
        try {
            const res = await fetch('/pos/api/v1/requests/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, action: 'receive' })
            });
            const result = await res.json();
            
            if (!res.ok) {
                showToast(result.error || "Giao dịch thất bại từ Server!", 'error');
                return;
            }

            const req = stockRequests.find(r => r.id === requestId);
            if (!req) return;

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

            const product = globalProducts.find(p => p.id === req.productId);
            const tx = {
                id: 'tx_in_' + generateId(), type: 'receive', productId: req.productId,
                productName: product?.name || req.productName || 'N/A', storeId: req.storeId,
                storeName: req.storeName || 'N/A', quantity: req.quantity,
                costPrice: product?.costPrice || 0, unitPrice: product?.basePrice || 0,
                date: new Date().toISOString(),
                note: `Nhận ${req.quantity} ${product?.unit || 'cái'} từ kho tổng`
            };
            setWarehouseTransactions(prev => [...prev, tx]);
            if (currentStore?.id === req.storeId) setStoreTransactions(prev => [...prev, tx]);

            setStockRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'completed' } : r));
            showToast("Đã xác nhận nhận hàng vào kho chi nhánh (Xử lý an toàn)!");

        } catch (error) {
            console.error("Lỗi nhận hàng:", error);
            showToast("Lỗi kết nối máy chủ!", 'error');
        }
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
                showToast(result.error || "Giao dịch thất bại từ Server!", 'error');
                return;
            }

            const product = globalProducts.find(p => p.id === productId);
            const store = stores.find(s => s.id === storeId);
            
            setGlobalProducts(globalProducts.map(p => p.id === productId ? { ...p, warehouseStock: Number(p.warehouseStock) + qty } : p));
            setStores(stores.map(s => s.id === storeId ? { ...s, inventory: s.inventory.map(i => i.productId === productId ? { ...i, quantity: Number(i.quantity) - qty } : i) } : s));

            const tx = {
                id: 'tx_' + generateId(), type: 'return', productId,
                productName: product?.name || 'N/A', storeId,
                storeName: store?.name || 'N/A', quantity: qty,
                costPrice: product?.costPrice || 0, unitPrice: product?.basePrice || 0,
                date: new Date().toISOString(),
                note: `Hoàn kho: ${reason || 'Không xác định'}`
            };
            setWarehouseTransactions(prev => [...prev, tx]);
            if (currentStore?.id === storeId) setStoreTransactions(prev => [...prev, tx]);

            setShowModal(null);
            showToast(`Đã xuất trả ${qty} SP về kho tổng (An toàn từ Server).`);
        } catch (error) {
            showToast("Lỗi kết nối máy chủ!", 'error');
        }
    };

    const handleTransferStock = async (fromStoreId, toStoreId, productId, amount, note) => {
        const qty = Number(amount);
        if (qty <= 0 || fromStoreId === toStoreId) {
            showToast("Thông tin luân chuyển không hợp lệ!", 'error');
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
                showToast(result.error || "Giao dịch thất bại từ Server!", 'error');
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
            const txOut = { id: 'tx_out_' + generateId(), type: 'transfer_out', productId, productName: product?.name || 'N/A', storeId: fromStoreId, storeName: fromStore?.name || 'N/A', quantity: qty, costPrice: product?.costPrice || 0, unitPrice: product?.basePrice || 0, date: now, note: `Chuyển đến ${toStore?.name}: ${note || ''}` };
            const txIn = { id: 'tx_in_' + generateId(), type: 'transfer_in', productId, productName: product?.name || 'N/A', storeId: toStoreId, storeName: toStore?.name || 'N/A', quantity: qty, costPrice: product?.costPrice || 0, unitPrice: product?.basePrice || 0, date: now, note: `Nhận từ ${fromStore?.name}: ${note || ''}` };
            setWarehouseTransactions(prev => [...prev, txOut, txIn]);
            if (currentStore?.id === fromStoreId) setStoreTransactions(prev => [...prev, txOut]);
            if (currentStore?.id === toStoreId) setStoreTransactions(prev => [...prev, txIn]);

            setShowModal(null);
            showToast(`Đã luân chuyển ${qty} SP đến ${toStore?.name} (An toàn từ Server).`);
        } catch (error) {
            showToast("Lỗi kết nối máy chủ!", 'error');
        }
    };

    const handleSaveGlobalProduct = (productData) => {
        requestConfirm({
            type: 'add', title: 'Tạo sản phẩm',
            message: `Thêm "${productData.name}" vào danh mục?`,
                onConfirm: async () => {
                    try {
                        const res = await fetch('/pos/api/v1/products', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                ...productData,
                                costPrice: Number(productData.costPrice || 0),
                                warehouseStock: Number(productData.initialStock || 0),
                                basePrice: Number(productData.basePrice)
                            })
                        });
                        if (res.ok) {
                            const result = await res.json();
                            setGlobalProducts([...globalProducts, result.product]);
                            setShowModal(null);
                            showToast("Đã tạo sản phẩm thành công.");
                        }
                    } catch (error) { showToast("Lỗi kết nối máy chủ", "error"); }
            }
        });
    };

    const handleDeleteGlobalProduct = (productId, productName) => {
        requestConfirm({
            type: 'delete', title: 'Xóa sản phẩm',
            message: `Xác nhận đánh dấu xóa sản phẩm "${productName}" khỏi hệ thống?`,
                onConfirm: async () => {
                    try {
                        const res = await fetch(`/pos/api/v1/products/${productId}`, { method: 'DELETE' });
                        if (res.ok) {
                            setGlobalProducts(globalProducts.map(p => p.id === productId ? { ...p, status: 'deleted' } : p));
                            setShowModal(null);
                            showToast("Đã xóa sản phẩm thành công.");
                        }
                    } catch (error) { showToast("Lỗi kết nối", "error"); }
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
                showToast(result.error || "Giao dịch thất bại từ Server!", 'error');
                return;
            }

        const product = globalProducts.find(p => p.id === productId);
        setGlobalProducts(globalProducts.map(p => p.id === productId ? { ...p, warehouseStock: Number(p.warehouseStock) + qty } : p));
        setWarehouseTransactions(prev => [...prev, {
            id: 'tx_' + generateId(), type: 'import', productId,
            productName: product?.name || 'N/A', quantity: qty,
            costPrice: product?.costPrice || 0, unitPrice: product?.basePrice || 0,
            date: new Date().toISOString(),
            note: `Nhập ${qty} ${product?.unit || 'cái'} vào kho tổng`
        }]);
        
        setImportingItem(null); // Đóng modal sau khi nhập thành công
        showToast(`Đã nhập ${qty} SP vào kho tổng (Xử lý an toàn bởi Server).`);
        } catch (error) {
            showToast("Lỗi kết nối máy chủ!", 'error');
        }
    };

    const handleDistribute = async (storeId, productId, amount) => {
        const qty = Number(amount);
        if (qty <= 0) return;
        if (!storeId || !productId) {
            showToast("Vui lòng chọn đầy đủ chi nhánh và mặt hàng!", 'error');
            return;
        }

        try {
            const res = await fetch(`/pos/api/v1/stores/${storeId}/action/distribute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, quantity: qty })
            });
            const result = await res.json();
            if (!res.ok) {
                showToast(result.error || "Giao dịch thất bại từ Server!", 'error');
                return;
            }

        const product = globalProducts.find(p => p.id === productId);
        const store = stores.find(s => s.id === storeId);
        setGlobalProducts(globalProducts.map(p => p.id === productId ? { ...p, warehouseStock: Number(p.warehouseStock) - qty } : p));
        if (result.request) {
            setStockRequests(prev => [result.request, ...prev]);
        } else {
            setStockRequests(prev => [{
                id: 'req_' + generateId(),
                storeId, storeName: store?.name,
                productId, productName: product?.name,
                quantity: qty,
                status: 'shipping',
                date: new Date().toISOString(),
                note: 'Admin điều phối (Chờ nhận)'
            }, ...prev]);
        }
        setWarehouseTransactions(prev => [...prev, {
            id: 'tx_' + generateId(), type: 'distribute', productId,
            productName: product?.name || 'N/A', storeId,
            storeName: store?.name || 'N/A', quantity: qty,
            costPrice: product?.costPrice || 0, unitPrice: product?.basePrice || 0,
            date: new Date().toISOString(),
            note: `Xuất kho ${qty} ${product?.unit || 'cái'} đến ${store?.name} (Đang giao)`
        }]);
        setShowModal(null);
        showToast(`Đã xuất kho ${qty} SP, chờ cửa hàng xác nhận.`);
        } catch (error) {
            console.error("Lỗi điều phối kho:", error);
            showToast(`Lỗi hệ thống: ${error.message || "Mất kết nối đến máy chủ!"}`, 'error');
        }
    };

    // VÍ DỤ: MẪU CÁC HÀM CRUD GỌI API ĐỘC LẬP TỪ NAY VỀ SAU
    const handleAddStore = async (storeData) => {
        try {
            const res = await fetch('/pos/api/v1/stores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(storeData)
            });
            if (res.ok) {
                const result = await res.json();
                setStores([...stores, result.store]); // Lấy Store với ID do Backend cấp
                setShowModal(null);
                showToast("Đã mở chi nhánh thành công.");
            } else {
                showToast("Lỗi từ hệ thống khi mở chi nhánh!", 'error');
            }
        } catch (error) {
            showToast("Lỗi kết nối máy chủ!", 'error');
        }
    };

    const handleEditStore = async (storeId, storeData) => {
        try {
            const res = await fetch(`/pos/api/v1/stores/${storeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(storeData)
            });
            if (res.ok) {
                setStores(stores.map(s => s.id === storeId ? { ...s, ...storeData } : s));
                setShowModal(null);
                setEditingStore(null);
                showToast("Đã cập nhật chi nhánh.");
            } else showToast("Lỗi hệ thống khi cập nhật!", 'error');
        } catch (error) {
            showToast("Lỗi kết nối!", 'error');
        }
    };

    const handleDeleteStore = (storeId, storeName) => {
        requestConfirm({
            type: 'delete', title: 'Xóa chi nhánh',
            message: `Xác nhận xóa hoàn toàn chi nhánh "${storeName}"?`,
                onConfirm: async () => {
                    try {
                        await fetch(`/pos/api/v1/stores/${storeId}`, { method: 'DELETE' });
                        setStores(stores.map(s => s.id === storeId ? { ...s, status: 'deleted' } : s));
                        setSelectedStore(null);
                        setShowModal(null);
                        showToast("Đã xóa chi nhánh.");
                    } catch (e) { showToast("Lỗi kết nối!", "error"); }
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
                showToast(result.error || "Giao dịch thất bại từ Server!", 'error');
                return;
            }

        const product = globalProducts.find(p => p.id === productId);
        const store = stores.find(s => s.id === storeId);
        
            // Thành công: Cập nhật đồng bộ lại giao diện mượt mà (Optimistic UI)
        setStores(stores.map(s => s.id === storeId ? {
            ...s, inventory: s.inventory.map(i => i.productId === productId
                ? { ...i, quantity: Number(i.quantity) - qty, sold: Number(i.sold || 0) + qty } : i)
        } : s));
        const tx = {
            id: 'tx_' + generateId(), type: 'sell', productId,
            productName: product?.name || 'N/A', storeId,
            storeName: store?.name || 'N/A', quantity: qty,
            costPrice: product?.costPrice || 0, 
            unitPrice: product?.basePrice || 0, 
            date: new Date().toISOString(),
            note: `Bán ${qty} ${product?.unit || 'cái'} tại ${store?.name}`
        };
        setWarehouseTransactions(prev => [...prev, tx]);
        if (currentStore?.id === storeId) setStoreTransactions(prev => [...prev, tx]);
        setShowModal(null);
        setSellingItem(null);
        showToast(`Đã ghi nhận bán ${qty} SP (Xử lý an toàn bởi Server).`);
        } catch (error) {
            showToast("Lỗi kết nối máy chủ!", 'error');
        }
    };

    const handleUpdateCategories = async (newCategories) => {
        try {
            const res = await fetch('/pos/api/v1/categories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCategories)
            });
            if (res.ok) {
                setCategories(newCategories);
                showToast("Đã cập nhật danh mục thành công.");
            } else {
                const result = await res.json();
                showToast(result.error || "Lỗi hệ thống khi cập nhật danh mục!", 'error');
            }
        } catch (error) {
            console.error("Lỗi cập nhật danh mục:", error);
            showToast("Lỗi kết nối máy chủ!", 'error');
        }
    };

    const handleUpdateShiftSlots = async (newShiftSlots) => {
        try {
            const res = await fetch('/pos/api/v1/shift-slots', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newShiftSlots)
            });
            if (res.ok) {
                setShiftSlots(newShiftSlots);
                showToast("Đã cập nhật ca làm việc thành công.");
            } else {
                const result = await res.json();
                showToast(result.error || "Lỗi hệ thống khi cập nhật ca làm việc!", 'error');
            }
        } catch (error) {
            console.error("Lỗi cập nhật ca làm việc:", error);
            showToast("Lỗi kết nối máy chủ!", 'error');
        }
    };

    const getProductInfo = (pid) => globalProducts.find(p => p.id === pid) || { name: 'N/A', sku: 'N/A', category: 'N/A', unit: 'cái' };

    return {
        // State
        user, stores, globalProducts, warehouseTransactions, storeTransactions, categories, shiftSlots, stockRequests,
        activeTab, selectedStore, storeSubTab, showModal, pendingAction,
        editingEmployee, editingStore, sellingItem, importingItem, toast, toastType, showUserMenu, searchTerm, historyFilter, setUser,
        currentStore, allEmployees, totalValue,
        // Setters
        setCategories, setShiftSlots, setActiveTab, setSelectedStore, setStoreSubTab, setShowModal,
        setPendingAction, setEditingEmployee, setEditingStore, setSellingItem, setImportingItem, setShowUserMenu,
        setSearchTerm, setHistoryFilter,
        // Handlers
        handleLogin, handleLogout, handleSaveEmployee, handleDeleteEmployee, handleAddExistingEmployee, handleUpdateEmployeeStatus, handleResetPassword, handleChangePassword, 
        handleSaveGlobalProduct, handleDeleteGlobalProduct, handleImportToWarehouse, handleDistribute, handleAddStockRequest, handleProcessStockRequest, handleReceiveStockRequest, handleReturnStock, handleTransferStock,
        handleAddStore, handleEditStore, handleDeleteStore, handleSellProduct,
        handleUpdateCategories, handleUpdateShiftSlots, getProductInfo, showToast,
    };
}
