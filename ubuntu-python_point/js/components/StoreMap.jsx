import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function StoreMap({ stores, onSelectStore }) {
    const storesWithCoords = stores.filter(s => s.lat && s.lng);
    if (storesWithCoords.length === 0) return null;

    const centerLat = storesWithCoords.reduce((a, s) => a + s.lat, 0) / storesWithCoords.length;
    const centerLng = storesWithCoords.reduce((a, s) => a + s.lng, 0) / storesWithCoords.length;

    return (
        <div className="bg-white rounded-[40px] border p-10 shadow-sm text-left">
            <h3 className="text-2xl font-black tracking-tight mb-6">Bản đồ chi nhánh</h3>
            <div className="rounded-[30px] overflow-hidden border" style={{ height: 400 }}>
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
                    {storesWithCoords.map(store => (
                        <Marker key={store.id} position={[store.lat, store.lng]}>
                            <Popup>
                                <div className="text-center min-w-[160px]">
                                    <p className="font-bold text-sm mb-1">{store.name}</p>
                                    <p className="text-xs text-gray-500 mb-2">{store.location}</p>
                                    <p className="text-xs text-gray-400">{store.employees.length} nhân viên · {store.inventory.reduce((a, i) => a + i.quantity, 0)} SP</p>
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
