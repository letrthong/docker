import os
import json
import threading
import base64
import time
import copy

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(BASE_DIR, 'src')
DIST_DIR = os.path.join(BASE_DIR, 'dist')
CONFIG_DIR = os.path.join(BASE_DIR, 'config')
CONFIG_FILE = os.path.join(CONFIG_DIR, 'config.json')
PRODUCTS_LAST_UPDATE_FILE = os.path.join(CONFIG_DIR, 'products_last_update.txt')

config_lock = threading.Lock()

def encode_b64_field(val):
    if not val:
        return ""
    encoded = base64.b64encode(str(val).encode('utf-8')).decode('utf-8')
    return f"b64:{encoded}"

def decode_b64_field(val):
    if not val:
        return ""
    val_str = str(val)
    if val_str.startswith("b64:"):
        try:
            return base64.b64decode(val_str[4:].encode('utf-8')).decode('utf-8')
        except Exception:
            return val_str[4:]
    try:
        return base64.b64decode(val_str.encode('utf-8'), validate=True).decode('utf-8')
    except Exception:
        return val_str

def get_products_last_update():
    if not os.path.exists(PRODUCTS_LAST_UPDATE_FILE):
        return 0
    with open(PRODUCTS_LAST_UPDATE_FILE, 'r') as f:
        return int(f.read())

def set_products_last_update():
    with open(PRODUCTS_LAST_UPDATE_FILE, 'w') as f:
        f.write(str(int(time.time())))

def read_config():
    if not os.path.exists(CONFIG_FILE):
        return {"stores": [], "products": []}
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    # Giải mã các trường nhạy cảm khi đọc lên RAM
    for store in data.get('stores', []):
        if 'name' in store: store['name'] = decode_b64_field(store['name'])
        if 'location' in store: store['location'] = decode_b64_field(store['location'])
        for emp in store.get('employees', []):
            if 'name' in emp: emp['name'] = decode_b64_field(emp['name'])
            if 'cccd' in emp: emp['cccd'] = decode_b64_field(emp['cccd'])
            if 'phone' in emp: emp['phone'] = decode_b64_field(emp['phone'])
        for tx in store.get('transactions', []):
            if 'note' in tx: tx['note'] = decode_b64_field(tx['note'])
            if 'productName' in tx: tx['productName'] = decode_b64_field(tx['productName'])
            if 'storeName' in tx: tx['storeName'] = decode_b64_field(tx['storeName'])
    return data

def write_config(data):
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with config_lock:
        # Copy ra một bản sao để tránh làm thay đổi data trên RAM (tránh lỗi hiển thị API)
        data_to_write = copy.deepcopy(data)
        for store in data_to_write.get('stores', []):
            if 'name' in store: store['name'] = encode_b64_field(store['name'])
            if 'location' in store: store['location'] = encode_b64_field(store['location'])
            for emp in store.get('employees', []):
                if 'name' in emp: emp['name'] = encode_b64_field(emp['name'])
                if 'cccd' in emp: emp['cccd'] = encode_b64_field(emp['cccd'])
                if 'phone' in emp: emp['phone'] = encode_b64_field(emp['phone'])
            for tx in store.get('transactions', []):
                if 'note' in tx: tx['note'] = encode_b64_field(tx['note'])
                if 'productName' in tx: tx['productName'] = encode_b64_field(tx['productName'])
                if 'storeName' in tx: tx['storeName'] = encode_b64_field(tx['storeName'])
                    
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(data_to_write, f, ensure_ascii=False, indent=2)

def get_transactions_file(store_id):
    return os.path.join(CONFIG_DIR, f'transactions_{store_id}.json')

def read_transactions(store_id):
    file = get_transactions_file(store_id)
    if not os.path.exists(file):
        return []
    with open(file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for tx in data:
        if 'productName' in tx: tx['productName'] = decode_b64_field(tx['productName'])
        if 'storeName' in tx: tx['storeName'] = decode_b64_field(tx['storeName'])
        if 'note' in tx: tx['note'] = decode_b64_field(tx['note'])
    return data

def write_transactions(store_id, data):
    file = get_transactions_file(store_id)
    os.makedirs(CONFIG_DIR, exist_ok=True)
    data_to_write = []
    for tx in data:
        tx2 = dict(tx)
        if 'productName' in tx2: tx2['productName'] = encode_b64_field(tx2['productName'])
        if 'storeName' in tx2: tx2['storeName'] = encode_b64_field(tx2['storeName'])
        if 'note' in tx2: tx2['note'] = encode_b64_field(tx2['note'])
        data_to_write.append(tx2)
    with open(file, 'w', encoding='utf-8') as f:
        json.dump(data_to_write, f, ensure_ascii=False, indent=2)