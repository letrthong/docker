const { useState, useMemo, useEffect, useRef } = React;

const FALLBACK_IMAGE_URL = "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600";
const handleImageError = (e) => {
    // Prevent infinite loop if fallback image is also broken
    e.target.onerror = null;
    e.target.src = FALLBACK_IMAGE_URL;
};

// Hàm tiện ích hỗ trợ loại bỏ dấu tiếng Việt để tìm kiếm
const removeVietnameseTones = (str) => {
    if (!str) return "";
    // Tách dấu, xóa dấu, đổi đ/Đ thành d/D, chuyển chữ thường và xóa khoảng trắng thừa
    return str.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd').replace(/Đ/g, 'D')
              .toLowerCase()
              .replace(/\s+/g, ' ').trim();
};

const App = () => {
    const [hotels, setHotels] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCity, setFilterCity] = useState(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('city') || localStorage.getItem('luquan_last_selected_city') || "";
    });
    const [selectedHotel, setSelectedHotel] = useState(null);
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [showSchemaManager, setShowSchemaManager] = useState(false);
    const [showAboutDialog, setShowAboutDialog] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
    const [isAdmin, setIsAdmin] = useState(false);
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [adminPass, setAdminPass] = useState("");
    const [adminError, setAdminError] = useState("");
    const [adminTab, setAdminTab] = useState('approved');
    const [reports, setReports] = useState([]);
    const [editingHotel, setEditingHotel] = useState(null);
    const [toastMessage, setToastMessage] = useState("");

    // Tự động Load dữ liệu từ Backend khi ứng dụng khởi chạy
    useEffect(() => {
        // Chỉ tải danh sách các tỉnh/thành phố khi khởi động
        HotelAPI.getSchemas()
            .then(provincesData => {
                setProvinces(provincesData);
            })
            .catch(error => {
                console.error("Lỗi khi tải danh sách tỉnh:", error);
                setProvinces([]);
            });
    }, []); // Chạy 1 lần duy nhất khi component mount

    // Nạp lại danh sách Tỉnh/Thành phố sau khi đóng Modal quản lý khu vực
    // (để đảm bảo dropdown filter lấy được dữ liệu mới nếu có thay đổi)
    useEffect(() => {
        if (!showSchemaManager) {
            HotelAPI.getSchemas()
                .then(provincesData => setProvinces(provincesData))
                .catch(console.error);
        }
    }, [showSchemaManager]);

    // Load danh sách Pending Requests khi đăng nhập bằng quyền Admin
    useEffect(() => {
        if (isAdmin) {
            HotelAPI.fetchPendingRequests()
                .then(data => setPendingRequests(data))
                .catch(err => console.error("Lỗi khi tải danh sách chờ duyệt:", err));
            HotelAPI.fetchReports()
                .then(data => setReports(data))
                .catch(err => {
                    console.error("Lỗi khi tải danh sách báo cáo:", err);
                    setToastMessage(err.message || "Không thể tải báo cáo.");
                });
        }
    }, [isAdmin]);

    // Tải dữ liệu khách sạn khi người dùng thay đổi bộ lọc thành phố
    useEffect(() => {
        // Lưu lựa chọn mới vào Local Storage để ghi nhớ cho lần sau
        localStorage.setItem('luquan_last_selected_city', filterCity);

        // Không chạy nếu chưa có danh sách tỉnh
        if (provinces.length === 0 && filterCity) return; // Chờ cho danh sách tỉnh được tải xong

        // Nếu không chọn thành phố nào, danh sách khách sạn sẽ rỗng
        if (!filterCity) {
            setHotels([]);
            setSelectedHotel(null);
            return;
        }

        setIsLoading(true);
        setHotels([]);

        const filePathsToFetch = filterCity === "all"
            ? provinces.map(p => p.filePathId)
            : [provinces.find(p => p.locationName === filterCity)?.filePathId].filter(Boolean);

        HotelAPI.fetchHotelsByFilePaths(filePathsToFetch)
            .then(hotelsData => {
                setHotels(hotelsData);

                // Lấy ID từ URL nếu có (ưu tiên), nếu không thì lấy từ localStorage
                const urlParams = new URLSearchParams(window.location.search);
                const savedHotelId = urlParams.get('hotel') || localStorage.getItem('luquan_last_selected_hotel_id');

                if (savedHotelId) {
                    const hotelToSelect = hotelsData.find(h => h.id === savedHotelId);
                    if (hotelToSelect) {
                        setSelectedHotel(hotelToSelect);
                    } else {
                        // Nếu không tìm thấy (VD: người dùng đã đổi sang tỉnh khác hoặc hotel đã bị xóa), 
                        // thì xóa ID đã lưu và đảm bảo không có hotel nào được chọn.
                        setSelectedHotel(null);
                        localStorage.removeItem('luquan_last_selected_hotel_id');
                    }
                } else {
                    // Nếu không có ID hotel nào được lưu, đảm bảo không có hotel nào được chọn.
                    setSelectedHotel(null);
                }
            })
            .catch(error => {
                console.error(`Lỗi khi tải dữ liệu cho ${filterCity}:`, error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [filterCity, provinces]);

    useEffect(() => {
        // Chạy lại sau mỗi lần render để đảm bảo mọi icon mới đều được hiển thị
        // Điều này cũng khắc phục lỗi thư viện lucide CDN tải chậm hơn React
        if (window.lucide) lucide.createIcons();
    });

    // Tự động cuộn danh sách đến khách sạn đang được chọn
    useEffect(() => {
        if (selectedHotel && viewMode === 'list') {
            const element = document.getElementById(`hotel-item-${selectedHotel.id}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        // Tự động cuộn khung chi tiết lên đầu khi chọn khách sạn mới
        const detailContent = document.getElementById('hotel-detail-content');
        if (detailContent) {
            detailContent.scrollTop = 0;
        }
    }, [selectedHotel, viewMode]);

    // Lưu lại khách sạn đang được chọn vào Local Storage
    const isInitialMountHotel = useRef(true);
    useEffect(() => {
        // Bỏ qua lần render đầu tiên để tránh việc vô tình xóa mất dữ liệu đã lưu
        if (isInitialMountHotel.current) {
            isInitialMountHotel.current = false;
            return;
        }
        
        const url = new URL(window.location);
        if (selectedHotel) {
            localStorage.setItem('luquan_last_selected_hotel_id', selectedHotel.id);
            url.searchParams.set('hotel', selectedHotel.id);
            if (filterCity) url.searchParams.set('city', filterCity);
        } else {
            // Nếu người dùng đóng cửa sổ chi tiết, ta cũng xóa thông tin đã lưu
            localStorage.removeItem('luquan_last_selected_hotel_id');
            url.searchParams.delete('hotel');
            url.searchParams.delete('city');
        }
        window.history.replaceState({}, '', url);
    }, [selectedHotel, filterCity]);

    const filteredHotels = useMemo(() => {
        const list = isAdmin && adminTab === 'pending' ? pendingRequests : (hotels || []);
        const normalizedSearchTerm = removeVietnameseTones(searchTerm); // Không cần toLowerCase() nữa vì hàm trên đã tự xử lý
        
        const searchResults = list.filter(hotel => {
            const matchSearch = removeVietnameseTones(hotel.name || "").includes(normalizedSearchTerm) ||
                                removeVietnameseTones(hotel.address || "").includes(normalizedSearchTerm);
                                
            // Việc lọc theo thành phố đã được xử lý ở bước tải dữ liệu
            return matchSearch;
        });

        // Đưa khách sạn đang được chọn lên đầu danh sách
        if (selectedHotel) {
            const selectedIndex = searchResults.findIndex(h => h.id === selectedHotel.id);
            if (selectedIndex > 0) { // Chỉ di chuyển nếu nó không phải là phần tử đầu tiên
                const [selectedItem] = searchResults.splice(selectedIndex, 1);
                searchResults.unshift(selectedItem);
            }
        }
        return searchResults;
    }, [hotels, pendingRequests, searchTerm, filterCity, isAdmin, adminTab, selectedHotel]);

    // Tự động ẩn Toast thông báo sau 3 giây
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(""), 3000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    const handleAdminLogin = (e) => {
        e.preventDefault();
        if (adminPass === "1234") {
            setIsAdmin(true);
            setShowAdminLogin(false);
            setAdminPass("");
            setAdminError("");
        } else {
            setAdminError("Mật mã không đúng!");
        }
    };

    const approveRequest = (hotel) => {
        HotelAPI.approveHotelRequest(hotel.id)
            .then(response => {
                setPendingRequests(prev => prev.filter(h => h.id !== hotel.id));
                // Nếu admin đang xem thành phố vừa được duyệt, thêm khách sạn vào danh sách để cập nhật UI
                if (response.data.locationName === filterCity) {
                    setHotels(prev => [...prev, response.data]);
                }
                setToastMessage(`Đã duyệt thành công "${hotel.name}"!`);
            })
            .catch(err => {
                console.error("Lỗi khi duyệt:", err);
                setToastMessage(err.message || "Có lỗi xảy ra khi duyệt.");
            });
    };

    const rejectRequest = (id, name) => {
        HotelAPI.rejectHotelRequest(id)
            .then(() => {
                setPendingRequests(prev => prev.filter(h => h.id !== id));
                setToastMessage(`Đã từ chối yêu cầu cho "${name}".`);
            })
            .catch(err => {
                console.error("Lỗi khi từ chối:", err);
                setToastMessage(err.message || "Có lỗi xảy ra khi từ chối.");
            });
    };

    const startEditHotel = (hotel, e) => {
        e.stopPropagation();
        setEditingHotel(hotel);
    };

    const handleEditSuccess = (updatedHotel) => {
        setHotels(prev => prev.map(h => h.id === updatedHotel.id ? updatedHotel : h));
        if (selectedHotel?.id === updatedHotel.id) {
            setSelectedHotel(updatedHotel);
        }
    };

    const deleteHotel = (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Bạn có chắc chắn muốn xóa khách sạn này khỏi hệ thống vĩnh viễn?")) {
            return;
        }
        
        HotelAPI.deleteHotel(id)
            .then(() => {
                setHotels(hotels.filter(h => h.id !== id));
                if (selectedHotel?.id === id) setSelectedHotel(null);
                setToastMessage("Đã xóa khách sạn thành công!");
            })
            .catch(err => {
                console.error("Lỗi khi xóa:", err);
                setToastMessage(err.message || "Có lỗi xảy ra khi xóa khách sạn.");
            });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "Chưa rõ";
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    const handleCloseHotelDetail = useCallback(() => {
        setSelectedHotel(null);
    }, []);

    const handleShare = async (hotel) => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Khách sạn: ${hotel.name}`,
                    url: window.location.href,
                });
            } catch (err) {
                console.error('Lỗi khi chia sẻ:', err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            setToastMessage("Đã sao chép đường dẫn vị trí khách sạn và bạn có thể chia sẻ!");
        }
    };

    return (
        <div className="absolute inset-0 flex flex-col bg-stone-50 text-stone-900 overflow-hidden font-sans select-none">
            {/* Header */}
            <header className={`shrink-0 px-4 md:px-8 lg:px-10 pt-[max(env(safe-area-inset-top),1.25rem)] pb-3 md:py-4 shadow-sm flex items-center justify-between z-30 transition-all duration-300 ${isAdmin ? 'bg-stone-800' : 'bg-moss'} text-white`}>
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md">
                        <Icon name="home" size={22} />
                    </div>
                    <div className="flex flex-col justify-center">
                        <h1 className="text-base md:text-xl lg:text-2xl font-black tracking-tight flex items-center gap-1.5 leading-normal py-0.5">
                            Lữ Quán {isAdmin && <span className="text-[8px] md:text-[10px] bg-red-500 px-1.5 py-0.5 rounded tracking-widest font-bold uppercase">Admin</span>}
                        </h1>
                        <p className="text-[7px] md:text-[10px] lg:text-xs opacity-80 font-bold uppercase tracking-widest mt-0.5 md:mt-1">Luquan.vn - Kết nối trực tiếp khách sạn</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-1.5 md:gap-3">
                    {isAdmin ? (
                        <>
                            <button onClick={() => setShowSchemaManager(true)} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 px-2 py-1.5 md:px-3 md:py-2 rounded-lg transition-all text-[9px] md:text-xs font-black uppercase tracking-wider shadow-sm text-white mr-1 sm:mr-0">
                                <Icon name="map" size={14} /> <span className="hidden sm:inline">Khu vực</span>
                            </button>
                            <div className="flex bg-white/10 p-0.5 rounded-lg mr-1 hidden sm:flex">
                                <button onClick={() => setAdminTab('approved')} className={`px-2 py-1 md:px-3 md:py-1.5 rounded text-[8px] md:text-[10px] lg:text-xs font-bold uppercase transition-all ${adminTab === 'approved' ? 'bg-white text-stone-900 shadow' : 'text-white/60 hover:text-white'}`}>Đã Duyệt</button>
                                <button onClick={() => setAdminTab('pending')} className={`px-2 py-1 md:px-3 md:py-1.5 rounded text-[8px] md:text-[10px] lg:text-xs font-bold uppercase transition-all relative ${adminTab === 'pending' ? 'bg-white text-stone-900 shadow' : 'text-white/60 hover:text-white'}`}>
                                    Chờ Duyệt {pendingRequests.length > 0 && <span className="ml-1 opacity-70">({pendingRequests.length})</span>}
                                </button>
                                <button onClick={() => setAdminTab('reports')} className={`px-2 py-1 md:px-3 md:py-1.5 rounded text-[8px] md:text-[10px] lg:text-xs font-bold uppercase transition-all relative ${adminTab === 'reports' ? 'bg-white text-stone-900 shadow' : 'text-white/60 hover:text-white'}`}>Báo cáo {reports.length > 0 && <span className="ml-1 opacity-70">({reports.length})</span>}</button>
                            </div>
                        </>
                    ) : (
                        <button onClick={() => setShowRequestForm(true)} className="flex items-center gap-1 bg-orange-700 hover:bg-orange-800 px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-all text-[9px] md:text-xs font-black uppercase tracking-wider">
                            <Icon name="plus" size={14} /> <span className="hidden sm:inline">Đăng ký khách sạn</span><span className="sm:hidden">Đăng ký</span>
                        </button>
                    )}

                    {isAdmin ? (
                        <button onClick={() => setIsAdmin(false)} className="p-1.5 md:p-2 bg-white/10 rounded-lg"><Icon name="unlock" size={18} /></button>
                    ) : (
                        <button onClick={() => setShowAdminLogin(true)} className="p-1.5 md:p-2 bg-white/10 rounded-lg"><Icon name="lock" size={18} /></button>
                    )}
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden relative min-h-0">
                {/* Sidebar / Danh sách: Fullscreen on mobile when active */}
                <div className={`
                    absolute md:relative z-10 w-full md:w-[400px] bg-white shadow-2xl transition-transform duration-300 h-full flex flex-col
                    ${viewMode === 'list' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}>
                    <div className="p-4 border-b bg-stone-50/50 space-y-2">
                        <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                                <Icon name="search" size={16} />
                            </div>
                            <input 
                                type="text"
                                placeholder="Tìm tên, địa chỉ, thành phố..."
                                className="w-full pl-10 pr-20 py-3 bg-white rounded-xl border-2 border-stone-100 focus:border-orange-700 outline-none transition-all font-bold text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button 
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-11 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors p-1"
                                >
                                    <Icon name="x" size={14} />
                                </button>
                            )}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-stone-100 text-stone-500 text-[10px] font-black px-2 py-1 rounded-md pointer-events-none shadow-sm">
                                {filteredHotels.length}
                            </div>
                        </div>
                        
                        {/* Dropdown Lọc Tỉnh/Thành */}
                        <div className="relative w-full">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-700">
                                <Icon name="map" size={14} />
                            </div>
                            <select 
                                value={filterCity} 
                                onChange={(e) => setFilterCity(e.target.value)}
                                className="w-full pl-10 pr-8 py-2.5 bg-white rounded-xl border-2 border-stone-100 focus:border-orange-700 outline-none transition-all font-bold text-xs text-stone-600 appearance-none cursor-pointer"
                            >
                                <option value="">-- Chọn khu vực --</option>
                                <option value="all">Tất cả khu vực</option>
                                {provinces.map(p => (
                                    <option key={p.id} value={p.locationName}>{p.locationName}</option>
                                ))}
                            </select>
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                                <Icon name="chevron-down" size={14} />
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="flex gap-2 mt-2 sm:hidden">
                                <button onClick={() => setAdminTab('approved')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${adminTab === 'approved' ? 'bg-moss text-white shadow' : 'bg-stone-200 text-stone-600'}`}>Đã Duyệt</button>
                                <button onClick={() => setAdminTab('pending')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${adminTab === 'pending' ? 'bg-orange-700 text-white shadow' : 'bg-stone-200 text-stone-600'}`}>Chờ Duyệt {pendingRequests.length > 0 && `(${pendingRequests.length})`}</button>
                                <button onClick={() => setAdminTab('reports')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${adminTab === 'reports' ? 'bg-red-700 text-white shadow' : 'bg-stone-200 text-stone-600'}`}>Báo cáo {reports.length > 0 && `(${reports.length})`}</button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto bg-stone-50 scrollbar-hide pb-24">
                        {isAdmin && adminTab === 'reports' ? (
                            <ReportManager reports={reports} setFilterCity={setFilterCity} onToast={setToastMessage} />
                        ) : (
                            <div className="p-3 space-y-3">
                                {isLoading ? (
                                    <div className="text-center py-20 opacity-50">
                                        <Icon name="loader" size={32} className="mx-auto mb-2 text-stone-400 animate-spin" />
                                        <p className="font-black uppercase text-[9px] tracking-widest italic">Đang tải dữ liệu...</p>
                                    </div>
                                ) : !filterCity ? (
                                    <div className="text-center py-20 opacity-40">
                                        <Icon name="map" size={32} className="mx-auto mb-2 text-stone-400" />
                                        <p className="font-black uppercase text-[9px] tracking-widest italic">Vui lòng chọn một khu vực để xem khách sạn</p>
                                    </div>
                                ) : filteredHotels.length > 0 ? (
                                    filteredHotels.map(hotel => (
                                        <div 
                                            key={hotel.id}
                                            id={`hotel-item-${hotel.id}`}
                                            onClick={() => {
                                                setSelectedHotel(hotel);
                                                setViewMode('map');
                                            }}
                                            className={`p-3 bg-white rounded-2xl cursor-pointer border-2 transition-all flex gap-3 relative group
                                                ${selectedHotel?.id === hotel.id ? 'border-red-600 ring-4 ring-red-100 shadow-lg' : 'border-transparent shadow-sm'}
                                            `}
                                        >
                                            <img src={hotel.image} onError={handleImageError} className="w-16 h-16 rounded-xl object-cover shrink-0 border border-stone-100 shadow-sm" />
                                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                                <div>
                                                    <h3 className="font-black text-stone-900 leading-tight truncate text-xs uppercase">{hotel.name}</h3>
                                                    <p className="text-[9px] text-stone-500 flex items-center gap-1 mt-0.5 font-bold truncate">
                                                        <Icon name="map-pin" size={10} className="text-orange-700" /> {hotel.address}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between mt-1">
                                                    <div className="flex items-center gap-1 text-[8px] text-stone-400 font-bold uppercase tracking-tight">
                                                        <Icon name="calendar" size={8} /> {formatDate(hotel.updatedAt)}
                                                    </div>
                                                    {hotel.website && <div className="text-moss"><Icon name="globe" size={12} /></div>}
                                                </div>
                                            </div>

                                            {isAdmin && adminTab === 'pending' && (
                                                <div className="absolute top-2 right-2 flex gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); approveRequest(hotel); }} className="bg-emerald-700 text-white p-2 rounded-lg shadow-lg"><Icon name="check" size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); rejectRequest(hotel.id, hotel.name); }} className="bg-red-700 text-white p-2 rounded-lg shadow-lg"><Icon name="trash-2" size={12} /></button>
                                                </div>
                                            )}
                                            {isAdmin && adminTab === 'approved' && (
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                                                    <button onClick={(e) => startEditHotel(hotel, e)} className="p-2 text-blue-600 bg-white rounded shadow hover:bg-stone-50"><Icon name="edit" size={14} /></button>
                                                    <button onClick={(e) => deleteHotel(hotel.id, e)} className="p-2 text-red-600 bg-white rounded shadow hover:bg-stone-50"><Icon name="trash-2" size={14} /></button>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-20 opacity-30">
                                        <Icon name="search-x" size={32} className="mx-auto mb-2 text-stone-400" />
                                        <p className="font-black uppercase text-[9px] tracking-widest italic">Không có kết quả tìm kiếm</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Map View: Visible or hidden depending on toggle */}
                <div className={`
                    absolute inset-0 md:relative md:inset-auto z-10 flex-1 bg-stone-200 overflow-hidden transition-transform duration-300
                    ${viewMode === 'map' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                `}>
                    <div className="w-full h-full relative z-0">
                        <MainLeafletMap hotels={filteredHotels} selectedHotel={selectedHotel} onSelectHotel={setSelectedHotel} filterCity={filterCity} viewMode={viewMode} />
                    </div>
                </div>

                {/* View Switcher: Mobile Only - Đưa ra ngoài Map để không bao giờ bị che khuất */}
                <div className="md:hidden absolute bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center bg-moss text-white p-1 rounded-2xl shadow-2xl border border-white/20">
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-white text-moss' : 'text-white/60'}`}
                    >
                        <Icon name="list" size={14} /> Danh Sách
                    </button>
                    <button 
                        onClick={() => setViewMode('map')}
                        className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase transition-all ${viewMode === 'map' ? 'bg-white text-moss' : 'text-white/60'}`}
                    >
                        <Icon name="navigation" size={14} /> Bản Đồ
                    </button>
                </div>

                {/* Detail Overlay (Bottom Sheet for Mobile, Floating Sidebar for PC) */}
                {selectedHotel && (
                    <HotelDetail
                        hotel={selectedHotel}
                        onClose={handleCloseHotelDetail}
                        onShare={handleShare}
                        formatDate={formatDate}
                        handleImageError={handleImageError}
                        onToast={setToastMessage} // setToastMessage is stable (React guarantees useState setters are stable)
                    />
                )}

                {/* Modals: Simplified for Mobile */}
                {showRequestForm && (
                    <HotelRequestForm 
                        provinces={provinces}
                        onClose={() => setShowRequestForm(false)}
                        onSubmitSuccess={(newRequest) => setPendingRequests(prev => [...prev, newRequest])}
                        onToast={setToastMessage}
                    />
                )}

                {editingHotel && (
                    <HotelEditForm
                        hotel={editingHotel}
                        onClose={() => setEditingHotel(null)}
                        onSaveSuccess={handleEditSuccess}
                        onToast={setToastMessage}
                    />
                )}

                {/* Modal Quản lý Khu vực (Schema Manager) */}
                {showSchemaManager && (
                    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-[100] flex items-center justify-center sm:p-6">
                        <div className="bg-white w-full h-full sm:h-auto sm:max-h-[95dvh] sm:max-w-5xl sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-stone-100">
                            <div className="p-4 sm:p-6 bg-blue-700 text-white flex justify-between items-center shrink-0">
                                <h3 className="text-sm sm:text-lg font-black flex items-center gap-2 uppercase tracking-widest">
                                    <Icon name="map" size={20} /> Quản lý Khu vực
                                </h3>
                                <button onClick={() => setShowSchemaManager(false)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"><Icon name="x" size={20} /></button>
                            </div>
                            
                            <div className="overflow-y-auto flex-1 scrollbar-hide bg-stone-50 pb-safe relative">
                                <SchemaManager api={HotelAPI} onToast={setToastMessage} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Admin Login Modal */}
                {showAdminLogin && (
                    <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
                        <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 bg-orange-50 text-orange-700 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-6">
                                <Icon name="lock" size={32} />
                            </div>
                            <h3 className="text-xl font-black text-stone-900 uppercase mb-2 tracking-tight">Xác thực Admin</h3>
                            <p className="text-[9px] text-stone-400 font-black uppercase tracking-[0.2em] mb-8 italic">Phê duyệt hệ thống Luquan.vn</p>
                            
                            <form onSubmit={handleAdminLogin} className="space-y-5">
                                <input 
                                    type="password" 
                                    placeholder="MẬT MÃ (1234)"
                                    className="w-full px-6 py-4 rounded-2xl bg-stone-50 border-2 border-stone-100 focus:border-orange-700 outline-none text-center font-black text-lg tracking-[0.5em]"
                                    value={adminPass}
                                    onChange={(e) => setAdminPass(e.target.value)}
                                    autoFocus
                                />
                                {adminError && <p className="text-red-600 text-[10px] font-black uppercase">{adminError}</p>}
                                <button type="submit" className="w-full py-4 bg-moss text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all uppercase text-[11px] tracking-widest">Đăng nhập</button>
                                <button type="button" onClick={() => setShowAdminLogin(false)} className="text-stone-400 font-black uppercase text-[9px] tracking-widest active:text-stone-700 py-2">Quay lại</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* About Dialog Modal */}
                {showAboutDialog && (
                    <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
                        <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                                <Icon name="info" size={32} />
                            </div>
                            <h3 className="text-xl font-black text-stone-900 uppercase mb-4 tracking-tight">Thông báo</h3>
                            <p className="text-sm text-stone-600 font-bold mb-8 leading-relaxed">
                                Website miễn phí, <br/> không chịu trách nhiệm chất lượng dịch vụ.
                            </p>
                            <button onClick={() => setShowAboutDialog(false)} className="w-full py-4 bg-stone-900 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all uppercase text-[11px] tracking-widest">
                                Đã hiểu
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer - Optimized for Desktop & Mobile */}
            <footer className="absolute bottom-0 left-0 w-full z-40 bg-white/80 backdrop-blur-md border-t border-white/50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="hidden md:flex py-3 px-6 md:px-8 lg:px-10 items-center justify-center gap-4">
                    <button onClick={() => setShowAboutDialog(true)} className="text-stone-500 hover:text-stone-800 p-1 transition-all duration-200 hover:-translate-y-1" title="Thông tin">
                        <Icon name="info" size={22} />
                    </button>
                    <a href="https://nongtrang.vn/" target="_blank" className="inline-flex items-center gap-1.5 px-2 py-0.5 md:px-3 md:py-1 bg-blue-50/90 backdrop-blur text-blue-700 rounded-md text-[10px] md:text-xs font-black hover:bg-blue-100 hover:text-blue-900 transition-colors border border-blue-200/50">
                        Vận hành bởi nongtrang.vn <Icon name="external-link" size={12} />
                    </a>
                    <a href="https://github.com/letrthong/telua_open_hotel_connect" target="_blank" className="text-stone-500 hover:text-stone-800 p-1 transition-all duration-200 hover:-translate-y-1" title="Mã nguồn mở">
                        <Icon name="github" size={22} />
                    </a>
                </div>

                {/* Mobile Footer Area (Always visible text) */}
                <div className="md:hidden px-3 py-2 pb-safe border-t border-white/30 flex justify-center items-center gap-4">
                    <button onClick={() => setShowAboutDialog(true)} className="text-stone-500 hover:text-stone-800 p-1 transition-all duration-200 hover:-translate-y-1" title="Thông tin">
                        <Icon name="info" size={24} />
                    </button>
                    <a href="https://nongtrang.vn/" target="_blank" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/90 backdrop-blur text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-tight hover:bg-blue-100 hover:text-blue-900 transition-colors shadow-sm border border-blue-200/50">
                        Vận hành bởi nongtrang.vn <Icon name="external-link" size={12} />
                    </a>
                    <a href="https://github.com/letrthong/telua_open_hotel_connect" target="_blank" className="text-stone-500 hover:text-stone-800 p-1 transition-all duration-200 hover:-translate-y-1" title="Mã nguồn mở">
                        <Icon name="github" size={24} />
                    </a>
                </div>
            </footer>

            {/* Global Toast Notification */}
            {toastMessage && (
                <div className="fixed top-6 md:top-10 left-1/2 -translate-x-1/2 z-[300] bg-stone-900/90 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-[10px] md:text-xs font-black uppercase tracking-widest border border-white/20 animate-in slide-in-from-top-4 fade-in duration-300 max-w-[90vw] text-center pointer-events-none">
                    <Icon name="bell-ring" size={18} className="text-orange-500 shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);