const ReportManager = ({ reports, setFilterCity, onToast }) => {

    const handleGoToHotel = (locationName) => {
        if (locationName && locationName !== "Không rõ") {
            setFilterCity(locationName);
            onToast(`Đã chuyển đến khu vực "${locationName}".`);
        } else {
            onToast("Không thể xác định khu vực của lữ quán này.");
        }
    };

    const getReasonText = (reason) => {
        const reasons = {
            "wrong_phone": "Số điện thoại sai",
            "wrong_hotel_name": "Tên lữ quán sai",
            "wrong_map_location": "Vị trí trên bản đồ sai",
            "wrong_address": "Địa chỉ không đúng",
            "website_broken": "Website không hoạt động",
            "hotel_closed": "Lữ quán đã đóng cửa",
            "spam_or_fake": "Thông tin giả mạo/Spam",
            "other": "Lý do khác"
        };
        return reasons[reason] || reason;
    };

    if (!reports || reports.length === 0) {
        return <div className="p-8 text-center text-stone-500 italic">Chưa có báo cáo nào.</div>;
    }

    return (
        <div className="p-3 space-y-3">
            {reports.map(report => (
                <div key={report.reportId} className="bg-white p-4 rounded-xl shadow-sm border border-red-200/50">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Lữ quán: <span className="text-red-700">{report.hotelName}</span></p>
                            <p className="text-sm font-black text-stone-800 mt-1">{getReasonText(report.reason)}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-[9px] text-stone-500 font-bold">{new Date(report.reportedAt).toLocaleString('vi-VN')}</p>
                            <button onClick={() => handleGoToHotel(report.locationName)} className="text-[10px] text-blue-600 hover:underline mt-1 font-bold">Xem khu vực</button>
                        </div>
                    </div>
                    {report.details && (
                        <div className="mt-3 pt-3 border-t border-dashed border-stone-200">
                            <p className="text-xs text-stone-600 italic">"{report.details}"</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};