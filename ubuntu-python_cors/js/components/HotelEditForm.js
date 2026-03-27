const { useState } = React;

const HotelEditForm = ({ hotel, onClose, onSaveSuccess, onToast }) => {
    // Quản lý vị trí bản đồ độc lập, khởi tạo với tọa độ hiện tại của khách sạn
    const [pickerPos, setPickerPos] = useState({ lat: hotel.lat || 11.9404, lng: hotel.lng || 108.4583 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [websiteUrl, setWebsiteUrl] = useState(hotel.website || "");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setApiError(null);

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
        
        const updatedData = {
            name: name,
            address: formData.get('address'),
            phone: phone,
            website: processedWebsite,
            description: description,
            lat: pickerPos.lat, 
            lng: pickerPos.lng
        };

        HotelAPI.updateHotel(hotel.id, updatedData)
            .then(response => {
                onSaveSuccess(response.data);
                onClose();
                onToast("Cập nhật thông tin thành công!");
            })
            .catch(err => {
                console.error("Lỗi khi cập nhật:", err);
                setApiError(err.message || "Có lỗi xảy ra khi cập nhật.");
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    return (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-[100] flex items-center justify-center sm:p-6">
            <div className="bg-white w-full h-full sm:h-auto sm:max-h-[95dvh] sm:max-w-xl sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-stone-100">
                <div className="p-6 bg-blue-700 text-white flex justify-between items-center shrink-0">
                    <h3 className="text-lg font-black flex items-center gap-2 uppercase tracking-widest">
                        <Icon name="edit-3" size={20} /> Sửa thông tin khách sạn
                    </h3>
                    <button type="button" onClick={onClose} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"><Icon name="x" size={20} /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-hide bg-white pb-safe">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-stone-400 mb-1 block tracking-widest"><span className="uppercase">Tên</span> Lữ Quán</label>
                            <input required name="name" defaultValue={hotel.name} className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-blue-700 outline-none font-bold text-sm" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Số điện thoại chính</label>
                            <input required name="phone" defaultValue={hotel.phone} className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-blue-700 outline-none font-bold text-sm" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-stone-400 uppercase mb-2 block tracking-widest">Vị trí (Kéo Marker hoặc Chạm)</label>
                        <div className="w-full h-64 sm:h-80 bg-stone-100 rounded-2xl border-2 border-stone-200 relative overflow-hidden shadow-inner z-0">
                            <LocationPickerMap position={pickerPos} onPositionChange={setPickerPos} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Website</label>
                            <div className="flex gap-2">
                                <input 
                                    name="website" 
                                    value={websiteUrl}
                                    onChange={(e) => { setWebsiteUrl(e.target.value); setApiError(null); }}
                                    className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-blue-700 outline-none font-bold text-sm" 
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
                            <input required name="address" defaultValue={hotel.address} className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-blue-700 outline-none font-bold text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-stone-400 uppercase mb-1 block tracking-widest">Mô tả đặc điểm</label>
                        <textarea required minLength="20" name="description" defaultValue={hotel.description} rows="2" className="w-full px-4 py-3 rounded-xl bg-stone-100 border-2 border-transparent focus:border-blue-700 outline-none font-bold text-sm" placeholder="Mô tả ít nhất 20 ký tự về lữ quán..."></textarea>
                    </div>
                    {/* Hiển thị lỗi từ API */}
                    {apiError && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-lg text-xs" role="alert">
                            <p className="font-bold">Không thể lưu thay đổi</p>
                            <p>{apiError}</p>
                        </div>
                    )}
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className={`w-full py-4 rounded-2xl font-black shadow-xl uppercase tracking-widest text-[11px] transition-all ${isSubmitting ? 'bg-stone-300 text-stone-500 cursor-not-allowed' : 'bg-blue-700 text-white active:scale-95'}`}
                    >
                        {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                    </button>
                </form>
            </div>
        </div>
    );
};