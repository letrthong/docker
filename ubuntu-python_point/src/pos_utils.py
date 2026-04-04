import os
import json
import threading
import base64
import time
import copy

# BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = "/app"
SRC_DIR = os.path.join(BASE_DIR, 'src')
DIST_DIR = os.path.join(BASE_DIR, 'dist')
CONFIG_DIR = os.path.join(BASE_DIR, 'config')
# CONFIG_FILE = os.path.join(CONFIG_DIR, 'config.json') # Đã được thay thế bằng các file riêng lẻ
PRODUCTS_LAST_UPDATE_FILE = os.path.join(CONFIG_DIR, 'products_last_update.txt')

# Các file cấu hình riêng lẻ
STORES_FILE = os.path.join(CONFIG_DIR, 'stores.json')
PRODUCTS_FILE = os.path.join(CONFIG_DIR, 'products.json')
EMPLOYEES_FILE = os.path.join(CONFIG_DIR, 'employees.json')
STOCK_REQUESTS_FILE = os.path.join(CONFIG_DIR, 'stock_requests.json')
CATEGORIES_FILE = os.path.join(CONFIG_DIR, 'categories.json')
SHIFT_SLOTS_FILE = os.path.join(CONFIG_DIR, 'shift_slots.json')

# Đổi sang RLock để cho phép khóa lồng nhau (vừa đọc vừa ghi an toàn)
config_lock = threading.RLock()

def _read_json_file(file_path, default_value):
    """Hàm helper để đọc một file JSON, trả về giá trị mặc định nếu file không tồn tại hoặc lỗi."""
    if not os.path.exists(file_path):
        return default_value
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        # Nếu file bị lỗi, trả về giá trị mặc định để tránh sập ứng dụng
        return default_value

def _write_json_file(file_path, data):
    """Hàm helper để ghi dữ liệu vào một file JSON."""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

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
    """
    Đọc cấu hình từ nhiều file JSON khác nhau và tổng hợp lại thành một object config.
    Hàm này cũng đảm nhiệm việc giải mã các trường dữ liệu nhạy cảm.
    """
    # Đọc dữ liệu từ các file riêng lẻ
    stores = _read_json_file(STORES_FILE, [])
    all_employees = _read_json_file(EMPLOYEES_FILE, [])
    stock_requests = _read_json_file(STOCK_REQUESTS_FILE, [])
    
    # Giải mã các trường nhạy cảm
    for store in stores:
        if 'name' in store: store['name'] = decode_b64_field(store['name'])
        if 'location' in store: store['location'] = decode_b64_field(store['location'])
            
    for emp in all_employees:
        if 'name' in emp: emp['name'] = decode_b64_field(emp['name'])
        if 'cccd' in emp: emp['cccd'] = decode_b64_field(emp['cccd'])
        if 'phone' in emp: emp['phone'] = decode_b64_field(emp['phone'])
        
    for req in stock_requests:
        if 'storeName' in req: req['storeName'] = decode_b64_field(req['storeName'])
        if 'productName' in req: req['productName'] = decode_b64_field(req['productName'])
        if 'note' in req: req['note'] = decode_b64_field(req['note'])

    # Tổng hợp lại thành object config cuối cùng
    return {
        "stores": stores,
        "products": _read_json_file(PRODUCTS_FILE, []),
        "allEmployees": all_employees,
        "stockRequests": stock_requests,
        "categories": _read_json_file(CATEGORIES_FILE, []),
        "shiftSlots": _read_json_file(SHIFT_SLOTS_FILE, [])
    }

def write_config(data):
    """
    Nhận vào một object config lớn, sau đó tách và ghi ra nhiều file JSON riêng lẻ.
    Hàm này cũng đảm nhiệm việc mã hóa các trường dữ liệu nhạy cảm trước khi ghi.
    """
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with config_lock:
        # Copy ra một bản sao để tránh làm thay đổi data trên RAM (tránh lỗi hiển thị API)
        data_to_write = copy.deepcopy(data)

        # Xử lý và ghi từng phần của config nếu có
        if 'stores' in data_to_write:
            for store in data_to_write['stores']:
                if 'name' in store: store['name'] = encode_b64_field(store['name'])
                if 'location' in store: store['location'] = encode_b64_field(store['location'])
            _write_json_file(STORES_FILE, data_to_write['stores'])

        if 'allEmployees' in data_to_write:
            for emp in data_to_write['allEmployees']:
                if 'name' in emp: emp['name'] = encode_b64_field(emp['name'])
                if 'cccd' in emp: emp['cccd'] = encode_b64_field(emp['cccd'])
                if 'phone' in emp: emp['phone'] = encode_b64_field(emp['phone'])
            _write_json_file(EMPLOYEES_FILE, data_to_write['allEmployees'])

        if 'stockRequests' in data_to_write:
            for req in data_to_write['stockRequests']:
                if 'storeName' in req: req['storeName'] = encode_b64_field(req['storeName'])
                if 'productName' in req: req['productName'] = encode_b64_field(req['productName'])
                if 'note' in req: req['note'] = encode_b64_field(req['note'])
            _write_json_file(STOCK_REQUESTS_FILE, data_to_write['stockRequests'])

        if 'products' in data_to_write:
            _write_json_file(PRODUCTS_FILE, data_to_write['products'])
        
        if 'categories' in data_to_write:
            _write_json_file(CATEGORIES_FILE, data_to_write['categories'])

        if 'shiftSlots' in data_to_write:
            _write_json_file(SHIFT_SLOTS_FILE, data_to_write['shiftSlots'])

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