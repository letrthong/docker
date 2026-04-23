const HOTEL_TYPES = [
    { id: 'hotel', label: 'Khách sạn' },
    { id: 'restaurant', label: 'Nhà hàng - Quán ăn' },
    { id: 'entertainment', label: 'Điểm tham quan' },
    { id: 'homestay', label: 'Ở tại nhà người dân' },
    { id: 'resort', label: 'Khu nghỉ dưỡng' },
    { id: 'villa', label: 'Biệt thự' },
    { id: 'motel', label: 'Nhà nghỉ' },
    { id: 'shop', label: 'Cửa hàng' },
    { id: 'transport', label: 'Phương tiện di chuyển' },
    { id: 'local_food', label: 'Quán ăn địa phương' },
    { id: 'car', label: 'Taxi' },
    { id: 'medical', label: 'Cơ sở y tế' },
    { id: 'religion', label: 'Cơ sở tôn giáo' },
    { id: 'other', label: 'Khác' }
];

const getIconForHotelType = (type) => {
    switch (type) {
        case 'restaurant': return 'utensils';
        case 'entertainment': return 'ticket';
        case 'resort': return 'umbrella';
        case 'villa': return 'home';
        case 'homestay': return 'heart';
        case 'shop': return 'store';
        case 'car': return 'car-taxi';
        case 'medical': return 'activity';
        case 'religion': return 'landmark';
        case 'motel': return 'bed-double';
        case 'hotel': return 'building';
        case 'transport': return 'bus';
        case 'local_food': return 'coffee';
        default: return 'map-pin';
    }
};