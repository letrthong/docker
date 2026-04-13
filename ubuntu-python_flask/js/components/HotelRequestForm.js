const { useState } = React;

const HotelRequestForm = ({ provinces, onClose, onSubmitSuccess, onToast }) => {
    // Quản lý vị trí bản đồ độc lập, không ảnh hưởng đến vị trí ở ngoài App chính
    const [pickerPos, setPickerPos] = useState({ lat: 11.9404, lng: 108.4583 });
    const [areaCenter, setAreaCenter] = useState(null);
    const [areaRadius, setAreaRadius] = useState(2);
    const [locationId, setLocationId] = useState("");
    const [locationName, setLocationName] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [imageBase64, setImageBase64] = useState("");

    const handleLocationChange = async (e) => {
        const locId = e.target.value;
        setLocationId(locId);
        if (locId) {
            const province = provinces.find(p => p.id === locId);
            if (province) {
                setLocationName(province.locationName);
                setAreaRadius(province.radius ? parseFloat(province.radius) : 2);
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

    const handleImageUpload = async (e) => {
        try {
            const base64 = await processImageUpload(e.target.files[0]);
            setImageBase64(base64);
            setApiError(null);
        } catch (err) {
            setApiError(err);
        }
        e.target.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setApiError(null); // Xóa lỗi cũ khi submit lại

        const formData = new FormData(e.target);
        const name = formData.get('name').trim();
        const type = formData.get('type');
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
        if ((type !== 'entertainment' || phone) && !isValidPhoneNumber(phone)) {
            setApiError("Số điện thoại không hợp lệ. Vui lòng kiểm tra lại (gồm 10-11 số).");
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

        const base64Description = encodeBase64(description);
        const base64Phone = encodeBase64(phone);
        const base64Address = encodeBase64(formData.get('address').trim());
        const base64Website = encodeBase64(processedWebsite);

        const newRequest = {
            id: crypto.randomUUID(),
            name: name,
            type: type,
            address: base64Address,
            phone: base64Phone,
            website: base64Website,
            locationId: formData.get('locationId'),
            status: 'pending',
            rating: 5.0,
            createdAt: today,
            updatedAt: today,
            description: base64Description,
            image: imageBase64 || "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=600",
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
        isOutside = haversine(pickerPos.lat, pickerPos.lng, areaCenter.lat, areaCenter.lng) > areaRadius;
    }

    return (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-[100] flex items-center justify-center sm:p-6">
            <div className="bg-white w-full h-full sm:h-auto sm:max-h-[95dvh] sm:max-w-xl sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-stone-100">
                <div className="p-6 bg-orange-700 text-white flex justify-between items-center shrink-0">
                    <h3 className="text-lg font-black flex items-center gap-2 uppercase tracking-widest">
                        <Icon name="plus-circle" size={20} /> Đăng ký Một Địa Điểm
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
                            <select required name="locationId" onChange={handleLocationChange} className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-orange-700 outline-none font-bold text-sm appearance-none cursor-pointer">
                                <option value="">-- Chọn Tỉnh/Thành --</option>
                                {provinces.map(p => (
                                    <option key={p.id} value={p.id}>{p.locationName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-stone-400 mb-1 block tracking-widest"><span className="uppercase">Tên</span> Địa Điểm</label>
                            <input required name="name" className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-orange-700 outline-none font-bold text-sm" />
                        </div>
                        <div className="col-span-1">
                            <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Loại hình</label>
                            <select
                                required
                                name="type"
                                value={selectedType}
                                onChange={(e) => {
                                    setSelectedType(e.target.value);
                                    setApiError(null);
                                }}
                                className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-orange-700 outline-none font-bold text-sm appearance-none cursor-pointer"
                            >
                                <option value="">-- Chọn --</option>
                                {HOTEL_TYPES.map(t => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-1">
                            <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">
                                Số điện thoại {selectedType === 'entertainment' && <span className="normal-case tracking-normal lowercase opacity-70">(Tùy chọn)</span>}
                            </label>
                            <input
                                name="phone"
                                required={selectedType !== 'entertainment'}
                                className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-orange-700 outline-none font-bold text-sm"
                                placeholder="09xxxxxx"
                            />
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
                                areaRadius={areaRadius}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Website hay link facebook (nếu có)</label>
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
                    <div>
                        <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Ảnh đại diện</label>
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-stone-100 rounded-xl border-2 border-dashed border-stone-300 flex items-center justify-center overflow-hidden shrink-0 relative hover:bg-stone-200 transition-colors">
                                {imageBase64 ? (
                                    <img src={imageBase64} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center w-full h-full">
                                        <Icon name="image-plus" size={24} className="text-stone-400" />
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" title="Chọn ảnh tải lên" />
                            </div>
                            <div className="text-[10px] text-stone-500 font-bold leading-relaxed">
                                Nhấn vào khung bên cạnh để tải ảnh lên. Ảnh sẽ tự động được nén và tối ưu hóa để tiết kiệm dung lượng lưu trữ.
                            </div>
                        </div>
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