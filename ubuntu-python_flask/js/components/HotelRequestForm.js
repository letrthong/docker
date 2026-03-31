const { useState } = React;

// Helper function to tính toán khoảng cách
const calculateDistance = (lat1, lng1, lat2, lng2) => {
    if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return 0;
    const R = 6371; // Bán kính trái đất (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const HotelRequestForm = ({ provinces, onClose, onSubmitSuccess, onToast }) => {
    // Quản lý vị trí bản đồ độc lập, không ảnh hưởng đến vị trí ở ngoài App chính
    const [pickerPos, setPickerPos] = useState({ lat: 11.9404, lng: 108.4583 });
    const [areaCenter, setAreaCenter] = useState(null);
    const [locationName, setLocationName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [websiteUrl, setWebsiteUrl] = useState("");

    const handleLocationChange = async (e) => {
        const locName = e.target.value;
        setLocationName(locName);
        if (locName) {
            const province = provinces.find(p => p.locationName === locName);
            if (province) {
                // Nếu dữ liệu tỉnh đã có sẵn tọa độ (từ Schema)
                if (province.lat !== undefined && province.lng !== undefined && province.lat !== "" && province.lng !== "") {
                    const lat = parseFloat(province.lat);
                    const lng = parseFloat(province.lng);
                    setPickerPos({ lat, lng });
                    setAreaCenter({ lat, lng });
                } else {
                    // Fallback: Tìm tọa độ tự động qua API nếu dữ liệu cũ chưa có lat/lng
                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locName + ', Vietnam')}&limit=1`);
                        const data = await response.json();
                        if (data && data.length > 0) {
                            const lat = parseFloat(data[0].lat);
                            const lng = parseFloat(data[0].lon);
                            setPickerPos({ lat, lng });
                            setAreaCenter({ lat, lng });
                        }
                    } catch (error) {
                        console.error("Lỗi tự động tìm tọa độ:", error);
                    }
                }
            }
        } else {
            setAreaCenter(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setApiError(null); // Xóa lỗi cũ khi submit lại

        const formData = new FormData(e.target);
        const name = formData.get('name').trim();
        const phone = formData.get('phone').trim();
        const website = formData.get('website').trim();
        const description = formData.get('description').trim();

        const bannedWords = await HotelAPI.getBannedWords();

        // --- START VALIDATION: Banned words in name and description ---
        const lowerName = name.toLowerCase();
        const lowerDescription = description.toLowerCase();
        if (bannedWords.some(word => lowerName.includes(word) || lowerDescription.includes(word))) {
            setApiError("Tên hoặc mô tả của lữ quán chứa từ khóa không cho phép.");
            setIsSubmitting(false);
            return;
        }
        // --- END VALIDATION ---

        // --- START VALIDATION: Description Min Length ---
        if (description.length < 20) {
            setApiError("Mô tả đặc điểm phải có ít nhất 20 ký tự.");
            setIsSubmitting(false);
            return;
        }
        // --- END VALIDATION ---

        // --- START VALIDATION: Kiểm tra số điện thoại hợp lệ của Việt Nam ---
        const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
        if (!phoneRegex.test(phone)) {
            setApiError("Số điện thoại không hợp lệ. Vui lòng kiểm tra lại (gồm 10 số, bắt đầu bằng 03, 05, 07, 08, 09).");
            setIsSubmitting(false);
            return;
        }
        // --- END VALIDATION ---

        // --- START VALIDATION: Kiểm tra định dạng Website ---
        let processedWebsite = website;
        if (processedWebsite) {
            // Tự động thêm https:// nếu người dùng quên
            if (!processedWebsite.startsWith('http://') && !processedWebsite.startsWith('https://')) {
                processedWebsite = 'https://' + processedWebsite;
            }

            // Kiểm tra từ khóa cấm
            const lowerWebsite = processedWebsite.toLowerCase();
            if (bannedWords.some(word => lowerWebsite.includes(word))) {
                setApiError("Website chứa từ khóa không cho phép.");
                setIsSubmitting(false);
                return;
            }

            try {
                new URL(processedWebsite);
            } catch (error) {
                setApiError("Website không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://");
                setIsSubmitting(false);
                return;
            }
        }
        // --- END VALIDATION ---

        const today = new Date().toISOString().split('T')[0];

        const newRequest = {
            id: crypto.randomUUID(),
            name: name,
            address: formData.get('address'),
            phone: phone,
            website: processedWebsite,
            locationName: formData.get('locationName'),
            status: 'pending',
            rating: 5.0,
            createdAt: today,
            updatedAt: today,
            description: description,
            image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600",
            lat: pickerPos.lat, 
            lng: pickerPos.lng  
        };
        
        // Gọi API Service để gửi dữ liệu
        HotelAPI.submitHotelRequest(newRequest)
            .then((response) => {
                onSubmitSuccess(response.data);
                onClose();
                onToast("Yêu cầu đã được gửi! Admin sẽ duyệt sớm nhất.");
            })
            .catch(err => {
                console.error("Lỗi khi gửi yêu cầu:", err);
                setApiError(err.message || "Có lỗi không xác định xảy ra khi gửi yêu cầu.");
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    // Kiểm tra khoảng cách để vô hiệu hóa nút Gửi yêu cầu
    let isOutside = false;
    if (areaCenter && pickerPos) {
        isOutside = calculateDistance(pickerPos.lat, pickerPos.lng, areaCenter.lat, areaCenter.lng) > 2;
    }

    return (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-[100] flex items-center justify-center sm:p-6">
            <div className="bg-white w-full h-full sm:h-auto sm:max-h-[95dvh] sm:max-w-xl sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-stone-100">
                <div className="p-6 bg-orange-700 text-white flex justify-between items-center shrink-0">
                    <h3 className="text-lg font-black flex items-center gap-2 uppercase tracking-widest">
                        <Icon name="plus-circle" size={20} /> Đăng ký khách sạn
                    </h3>
                    <button type="button" onClick={onClose} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"><Icon name="x" size={20} /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-white">
                        <div className="bg-amber-50 p-3 rounded-xl text-amber-900 text-[10px] font-bold border border-amber-100 mb-2">
                        Thông tin sẽ được chúng tôi phê duyệt thủ công để đảm bảo chất lượng lữ quán.
                        </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Tỉnh/Thành phố</label>
                            <select required name="locationName" onChange={handleLocationChange} className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-orange-700 outline-none font-bold text-sm appearance-none cursor-pointer">
                                <option value="">-- Chọn Tỉnh/Thành --</option>
                                {provinces.map(p => (
                                    <option key={p.id} value={p.locationName}>{p.locationName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-stone-400 mb-1 block tracking-widest"><span className="uppercase">Tên</span> Lữ Quán</label>
                            <input required name="name" className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-orange-700 outline-none font-bold text-sm" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Số điện thoại chính</label>
                            <input required name="phone" className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-orange-700 outline-none font-bold text-sm" placeholder="09xxxxxx" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-stone-400 uppercase mb-2 block tracking-widest">Chọn vị trí trên bản đồ (Kéo Marker hoặc Chạm)</label>
                        <div className="w-full h-64 sm:h-80 bg-stone-100 rounded-2xl border-2 border-stone-200 relative overflow-hidden shadow-inner z-0">
                            <LocationPickerMap 
                                position={pickerPos} 
                                onPositionChange={setPickerPos} 
                                areaCenter={areaCenter}
                                locationName={locationName}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Website (nếu có)</label>
                            <div className="flex gap-2">
                                <input 
                                    name="website" 
                                    value={websiteUrl}
                                    onChange={(e) => { setWebsiteUrl(e.target.value); setApiError(null); }}
                                    className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-orange-700 outline-none font-bold text-sm" 
                                    placeholder="https://..." 
                                />
                                <button 
                                    type="button" 
                                    onClick={async () => {
                                        if (!websiteUrl) { setApiError("Vui lòng nhập URL để kiểm tra."); return; }
                                        let urlToTest = websiteUrl;
                                        // Tự động thêm https:// nếu người dùng quên
                                        if (!urlToTest.startsWith('http://') && !urlToTest.startsWith('https://')) {
                                            urlToTest = 'https://' + urlToTest;
                                        }

                                        const bannedWords = await HotelAPI.getBannedWords();
                                        const lowerWebsiteToTest = urlToTest.toLowerCase();
                                        if (bannedWords.some(word => lowerWebsiteToTest.includes(word))) {
                                            setApiError("Website chứa từ khóa không cho phép.");
                                            return;
                                        }

                                        try {
                                            new URL(urlToTest);
                                            window.open(urlToTest, '_blank');
                                            setApiError(null);
                                            setWebsiteUrl(urlToTest); // Cập nhật state để hiển thị URL đã được sửa
                                        } catch (error) {
                                            setApiError("Website không hợp lệ. Vui lòng nhập URL bắt đầu bằng http:// hoặc https://");
                                        }
                                    }}
                                    className="px-4 py-3 bg-stone-200 text-stone-600 hover:bg-stone-300 hover:text-stone-900 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors shrink-0"
                                >
                                    Kiểm tra
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Địa chỉ chi tiết</label>
                            <input required name="address" className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-orange-700 outline-none font-bold text-sm" placeholder="VD: 45 Đường Y, Đà Lạt..." />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Mô tả đặc điểm</label>
                        <textarea required minLength="20" name="description" rows="2" className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-orange-700 outline-none font-bold text-sm" placeholder="Mô tả ít nhất 20 ký tự về lữ quán..."></textarea>
                    </div>
                    {/* Hiển thị lỗi từ API */}
                    {apiError && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-lg text-xs" role="alert">
                            <p className="font-bold">Không thể gửi yêu cầu</p>
                            <p>{apiError}</p>
                        </div>
                    )}
                    </div>
                    <div className="p-4 border-t border-stone-100 bg-white shrink-0 pb-safe">
                        <button 
                            type="submit" 
                            disabled={isOutside || isSubmitting}
                            className={`w-full py-4 rounded-2xl font-black shadow-xl uppercase tracking-widest text-[11px] transition-all ${(isOutside || isSubmitting) ? 'bg-stone-300 text-stone-500 cursor-not-allowed' : 'bg-orange-700 text-white active:scale-95'}`}
                        >
                            {isSubmitting ? 'Đang gửi...' : (isOutside ? 'Vị trí ngoài vùng cho phép' : 'Gửi yêu cầu đăng ký')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};