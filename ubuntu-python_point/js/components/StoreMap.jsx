import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Icon, StoreStatusBadge } from './UI';

// Fix default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function StoreMap({ stores, onSelectStore }) {
    const [searchTerm, setSearchTerm] = useState('');
    const storesWithCoords = stores.filter(s => s.lat && s.lng);
    if (storesWithCoords.length === 0) return null;

    // Lọc chi nhánh theo từ khóa tìm kiếm (theo tên hoặc địa chỉ)
    const filteredStores = storesWithCoords.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const centerLat = storesWithCoords.reduce((a, s) => a + s.lat, 0) / storesWithCoords.length;
    const centerLng = storesWithCoords.reduce((a, s) => a + s.lng, 0) / storesWithCoords.length;

    return (
        <div className="bg-white rounded-[40px] border p-10 shadow-sm text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-2xl font-black tracking-tight">Bản đồ chi nhánh</h3>
                <div className="relative w-full sm:w-64">
                    <Icon name="search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input 
                        type="text" 
                        placeholder="Tìm chi nhánh hoặc địa chỉ..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-100 text-sm font-bold transition-all" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                    />
                </div>
            </div>
            <div className="rounded-[30px] overflow-hidden border relative z-0" style={{ height: 400 }}>
                <MapContainer
                    center={[centerLat, centerLng]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {filteredStores.map(store => (
                        <Marker key={store.id} position={[store.lat, store.lng]}>
                            <Popup>
                                <div className="text-center min-w-[160px]">
                                    <p className="font-bold text-sm mb-1">{store.name}</p>
                                    <p className="text-xs text-gray-500 mb-1">{store.location}</p>
                                    {store.hotline && <p className="text-xs text-rose-500 font-bold mb-1 flex items-center justify-center"><Icon name="phone" size={12} className="mr-1"/> <a href={`tel:${store.hotline}`} className="hover:underline">{store.hotline}</a></p>}
                                    {store.website && <p className="text-xs text-emerald-500 font-bold mb-2 flex items-center justify-center"><Icon name="globe" size={12} className="mr-1"/> <a href={store.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[120px]">{store.website}</a></p>}
                                    {(store.openTime || store.closeTime) && <p className="text-xs text-orange-600 font-bold mb-2 flex items-center justify-center gap-1"><Icon name="clock" size={12}/>{store.openTime || '08:00'} - {store.closeTime || '22:00'} <StoreStatusBadge openTime={store.openTime} closeTime={store.closeTime} /></p>}
                                    <p className="text-xs text-gray-400">{store.employees.length} nhân viên · {store.inventory.reduce((a, i) => a + Number(i.quantity), 0)} SP</p>
                                    {onSelectStore && (
                                        <button
                                            onClick={() => onSelectStore(store)}
                                            className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg font-bold hover:bg-blue-700"
                                        >
                                            Xem chi tiết
                                        </button>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}
