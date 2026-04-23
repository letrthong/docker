const { useState, useEffect, useMemo, useRef } = React;

const NearByComponents = ({ hotels, onSelectHotel, setViewMode, isActive, onToast }) => {
    const [userLocation, setUserLocation] = useState(null);
    const [searchLocation, setSearchLocation] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [radius, setRadius] = useState(() => {
        const savedRadius = localStorage.getItem('luquan_nearby_radius');
        return savedRadius ? Number(savedRadius) : 2;
    });
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const userMarkerRef = useRef(null);
    const circleRef = useRef(null);
    const markersGroupRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('luquan_nearby_radius', radius);
    }, [radius]);

    const calculateDistance = (lat1, lng1, lat2, lng2) => {
        if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return 0;
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    useEffect(() => {
        if (!isActive) return;

        let watchId;
        if ("geolocation" in navigator) {
            // watchPosition tối ưu pin hơn và phản hồi theo thời gian thực thay vì polling 30s
            watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        setUserLocation({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        });
                        setIsLoading(false);
                        setError(null);
                    },
                    (err) => {
                        console.error("Error getting location:", err);
                        setError("Không thể lấy vị trí của bạn. Vui lòng bật định vị GPS.");
                        if (onToast) onToast("Không thể lấy vị trí của bạn. Vui lòng bật định vị GPS.");
                        setIsLoading(false);
                    },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
            );
        } else {
            setError("Trình duyệt của bạn không hỗ trợ GPS.");
            if (onToast) onToast("Trình duyệt của bạn không hỗ trợ GPS.");
            setIsLoading(false);
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [isActive]);

    const nearbyHotels = useMemo(() => {
        const center = searchLocation || userLocation;
        if (!center || !hotels) return [];
        
        const hotelsWithDistance = hotels.map(hotel => {
            const distance = calculateDistance(center.lat, center.lng, hotel.lat, hotel.lng);
            return { ...hotel, distance };
        });

        // Lọc các điểm bán kính tương ứng và xếp theo khoảng cách
        return hotelsWithDistance
            .filter(h => h.distance <= radius)
            .sort((a, b) => a.distance - b.distance);
    }, [searchLocation, userLocation, hotels, radius]);

    // Khởi tạo bản đồ Leaflet trong Tab NearBy
    useEffect(() => {
        if (!isActive || !userLocation || !mapRef.current) return;

        if (!mapInstance.current) {
            mapInstance.current = L.map(mapRef.current, { zoomControl: false }).setView([userLocation.lat, userLocation.lng], 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(mapInstance.current);

            markersGroupRef.current = L.layerGroup().addTo(mapInstance.current);

            // Icon GPS nhấp nháy cho người dùng
            const userIcon = L.divIcon({
                className: "",
                html: `<div class="relative flex items-center justify-center w-12 h-12 cursor-pointer group" title="Vị trí của bạn">
                        <div class="absolute w-full h-full bg-blue-500 rounded-full animate-ping opacity-30"></div>
                        <div class="absolute w-6 h-6 bg-white rounded-full shadow-md"></div>
                        <div class="relative w-4 h-4 bg-blue-500 rounded-full shadow-inner group-hover:scale-110 transition-transform"></div>
                       </div>`,
                iconSize: [48, 48],
                iconAnchor: [24, 24]
            });
            userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(mapInstance.current);
            
            // Cho phép user click trực tiếp vào chấm GPS để định tâm bản đồ mượt mà
            userMarkerRef.current.on('click', () => {
                const currentPos = userMarkerRef.current.getLatLng();
                if (circleRef.current) {
                    mapInstance.current?.fitBounds(circleRef.current.getBounds(), { padding: [20, 20], animate: true, duration: 0.5 });
                } else {
                    mapInstance.current?.flyTo(currentPos, 15, { animate: true, duration: 0.5 });
                }
            });

            // Vẽ vòng bán kính
            circleRef.current = L.circle([userLocation.lat, userLocation.lng], {
                radius: radius * 1000,
                color: '#36453b',
                fillColor: '#36453b',
                fillOpacity: 0.05,
                weight: 2,
                dashArray: '4, 4'
            }).addTo(mapInstance.current);

            // Cập nhật vị trí trung tâm tìm kiếm CHỈ khi người dùng chủ động kéo bản đồ
            mapInstance.current.on('dragend', () => {
                const center = mapInstance.current.getCenter();
                setSearchLocation({ lat: center.lat, lng: center.lng });
            });

            setTimeout(() => mapInstance.current.invalidateSize(), 200);
        } else {
            // Nếu đã có bản đồ, chỉ cập nhật lại marker điểm GPS
            userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        }
    }, [isActive, userLocation]);

    // Dời vòng tròn bán kính chạy theo điểm đang tìm kiếm HOẶC vị trí GPS hiện tại
    useEffect(() => {
        const center = searchLocation || userLocation;
        if (circleRef.current && center) {
            circleRef.current.setLatLng([center.lat, center.lng]);
            circleRef.current.setRadius(radius * 1000);
        }
    }, [searchLocation, userLocation, radius]);

    // Tự động điều chỉnh zoom bản đồ vừa vặn với vùng bán kính mới
    useEffect(() => {
        if (circleRef.current && mapInstance.current) {
            // Giới hạn mức zoom tối đa (maxZoom) khi chọn bán kính lớn để dễ quan sát tổng thể
            let newMaxZoom = 18; // Mặc định của OpenStreetMap
            if (radius >= 30) newMaxZoom = 12;
            else if (radius >= 20) newMaxZoom = 13;
            else if (radius >= 10) newMaxZoom = 14;
            
            mapInstance.current.setMaxZoom(newMaxZoom);
            mapInstance.current.fitBounds(circleRef.current.getBounds(), { padding: [20, 20], animate: true, duration: 0.5 });
        }
    }, [radius]);

    // Cập nhật marker các điểm gần đó
    useEffect(() => {
        if (!mapInstance.current || !markersGroupRef.current) return;

        markersGroupRef.current.clearLayers();

        nearbyHotels.forEach(hotel => {
            // Tái sử dụng hàm createHotelIcon từ MapComponents để hiển thị đúng màu/icon theo từng Loại hình
            const hotelIcon = createHotelIcon(hotel, false);

            const marker = L.marker([hotel.lat, hotel.lng], { icon: hotelIcon });
            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                onSelectHotel(hotel);
            });
            markersGroupRef.current.addLayer(marker);
        });

    }, [nearbyHotels, onSelectHotel]);

    if (isLoading && !userLocation) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center text-stone-500 bg-stone-50">
                <Icon name="loader" size={32} className="animate-spin mb-2 text-moss" />
                <p className="text-xs font-bold uppercase tracking-widest">Đang tìm vị trí của bạn...</p>
            </div>
        );
    }

    if (error && !userLocation) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center text-red-500 bg-stone-50">
                <Icon name="map-pin-off" size={32} className="mb-2" />
                <p className="text-xs font-bold">{error}</p>
                <button onClick={() => setViewMode('list')} className="mt-4 px-4 py-2 bg-stone-200 text-stone-700 rounded-lg text-xs font-bold active:scale-95 transition-all">Quay lại danh sách</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-stone-50 overflow-hidden relative">
            {/* Map Section */}
            <div className="flex-1 w-full h-full relative z-0 pb-safe">
                <div ref={mapRef} className="w-full h-full bg-stone-200"></div>
                
                {/* Panel thông tin Top Left */}
                <div className="absolute top-4 left-4 z-[1000] pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-lg border border-white/50 flex flex-col pointer-events-auto">
                        <div className="flex items-center gap-1">
                            <span className="text-[11px] font-black uppercase text-moss tracking-widest">Khu Vực</span>
                            <select 
                                value={radius} 
                                onChange={(e) => setRadius(Number(e.target.value))}
                                className="bg-white border border-stone-200 text-orange-700 text-[11px] font-black rounded-md outline-none focus:border-orange-700 focus:ring-1 focus:ring-orange-700 cursor-pointer mx-1 px-1.5 py-0.5 shadow-sm"
                            >
                                <option value={2}>2km</option>
                                <option value={5}>5km</option>
                                <option value={10}>10km</option>
                                <option value={20}>20km</option>
                                <option value={30}>30km</option>
                            </select>
                            <span className="text-[11px] font-black uppercase text-moss tracking-widest">: {nearbyHotels.length} Điểm</span>
                        </div>
                        <span className="text-[9px] font-bold text-stone-500 flex items-center gap-1 mt-0.5">
                            <Icon name="compass" size={10} className="text-blue-500 animate-pulse" /> GPS: 30s
                        </span>
                    </div>
                </div>

                {/* Nút bấm định tâm Center (Crosshair) - Đưa lên cao để không bị che bởi thanh điều hướng */}
                <div className="absolute bottom-28 right-4 z-[1000] pointer-events-none">
                    <button 
                        onClick={() => {
                            setSearchLocation(null); // Xóa tọa độ kéo thả, đưa trạng thái về bám GPS
                            if (circleRef.current && mapInstance.current) {
                                mapInstance.current.fitBounds(circleRef.current.getBounds(), { padding: [20, 20], animate: true, duration: 0.5 });
                            } else {
                                mapInstance.current?.flyTo([userLocation.lat, userLocation.lng], 15, { animate: true, duration: 0.5 });
                            }
                        }} 
                        className="w-12 h-12 bg-white text-stone-600 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-stone-100 pointer-events-auto cursor-pointer hover:text-blue-600 hover:bg-stone-50 active:scale-90 transition-all group"
                        title="Định tâm vị trí của bạn"
                    >
                        <Icon name="crosshair" size={24} className="group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};