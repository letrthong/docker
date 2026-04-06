import os
import json
import threading
import base64
import time
import copy

# BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = "/app/config/pos_system"  # Đặt cố định để tránh lỗi đường dẫn khi chạy trong container
WEB_DIR = "/app"
SRC_DIR = os.path.join(WEB_DIR, 'src')
DIST_DIR = os.path.join(WEB_DIR, 'dist')
CONFIG_DIR = os.path.join(BASE_DIR, '')
PRODUCTS_LAST_UPDATE_FILE = os.path.join(CONFIG_DIR, 'products_last_update.txt')

# Các file cấu hình riêng lẻ
STORES_FILE = os.path.join(CONFIG_DIR, 'stores.json')
PRODUCTS_FILE = os.path.join(CONFIG_DIR, 'products.json')
EMPLOYEES_FILE = os.path.join(CONFIG_DIR, 'employees.json')
STOCK_REQUESTS_FILE = os.path.join(CONFIG_DIR, 'stock_requests.json')
CATEGORIES_FILE = os.path.join(CONFIG_DIR, 'categories.json')
SHIFT_SLOTS_FILE = os.path.join(CONFIG_DIR, 'shift_slots.json')
IMAGES_DIR = os.path.join(CONFIG_DIR, 'images')

# Đảm bảo các thư mục cấu hình và thư mục gốc tồn tại ngay khi khởi động
os.makedirs(BASE_DIR, exist_ok=True)
os.makedirs(CONFIG_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)

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
    """Hàm helper để ghi dữ liệu vào một file JSON an toàn (Atomic)."""
    tmp_path = file_path + '.tmp'
    with open(tmp_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp_path, file_path)

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
    with config_lock:
        # Đọc dữ liệu từ các file riêng lẻ
        stores = _read_json_file(STORES_FILE, [])
        all_employees = _read_json_file(EMPLOYEES_FILE, [])
        stock_requests = _read_json_file(STOCK_REQUESTS_FILE, [])
        
        # Giải mã các trường nhạy cảm
        STORE_FIELDS_TO_DECODE = ['name', 'location', 'website', 'hotline']
        EMP_FIELDS_TO_DECODE = ['name', 'cccd', 'phone']
        REQ_FIELDS_TO_DECODE = ['storeName', 'productName', 'note']

        for store in stores:
            for field in STORE_FIELDS_TO_DECODE:
                if field in store: store[field] = decode_b64_field(store[field])
                
            if store.get('hasImage'):
                img_path = os.path.join(IMAGES_DIR, f"store_{store.get('id')}.webp")
                if os.path.exists(img_path):
                    mtime = int(os.path.getmtime(img_path))
                    store['image'] = f"/pos/api/v1/stores/{store.get('id')}/image?t={mtime}"

        for emp in all_employees:
            for field in EMP_FIELDS_TO_DECODE:
                if field in emp: emp[field] = decode_b64_field(emp[field])
            
            # Phục hồi URL ảnh cho frontend để tránh gửi nguyên chuỗi base64 nặng nề
            if emp.get('hasImage'):
                img_path = os.path.join(IMAGES_DIR, f"{emp.get('id')}.jpg")
                if os.path.exists(img_path):
                    mtime = int(os.path.getmtime(img_path))
                    emp['cccdImage'] = f"/pos/api/v1/employees/{emp.get('id')}/image?t={mtime}"
            
        products = _read_json_file(PRODUCTS_FILE, [])
        for prod in products:
            if prod.get('hasImage'):
                img_path = os.path.join(IMAGES_DIR, f"prod_{prod.get('id')}.webp")
                if os.path.exists(img_path):
                    mtime = int(os.path.getmtime(img_path))
                    prod['image'] = f"/pos/api/v1/products/{prod.get('id')}/image?t={mtime}"

        for req in stock_requests:
            for field in REQ_FIELDS_TO_DECODE:
                if field in req: req[field] = decode_b64_field(req[field])

        # Tổng hợp lại thành object config cuối cùng
        return {
            "stores": stores,
            "products": products,
            "allEmployees": all_employees,
            "stockRequests": stock_requests,
            "categories": _read_json_file(CATEGORIES_FILE, []),
            "shiftSlots": _read_json_file(SHIFT_SLOTS_FILE, [])
        }

def write_products(products_data):
    """Hàm ghi độc lập chỉ dành cho Cấu hình Sản phẩm"""
    os.makedirs(CONFIG_DIR, exist_ok=True)
    os.makedirs(IMAGES_DIR, exist_ok=True)
    with config_lock:
        data_to_write = copy.deepcopy(products_data)
        for prod in data_to_write:
            img_data = prod.get('image')
            if img_data and isinstance(img_data, str) and img_data.startswith('data:image/'):
                try:
                    header, encoded = img_data.split(",", 1)
                    file_path = os.path.join(IMAGES_DIR, f"prod_{prod['id']}.webp")
                    with open(file_path, "wb") as fh:
                        fh.write(base64.b64decode(encoded))
                    prod['hasImage'] = True
                except Exception:
                    pass
            elif img_data and isinstance(img_data, str) and img_data.startswith('/pos/api/v1/products/'):
                prod['hasImage'] = True
            
            if 'image' in prod:
                del prod['image']
        _write_json_file(PRODUCTS_FILE, data_to_write)

def write_categories(categories_data):
    """Hàm ghi độc lập chỉ dành cho Cấu hình Danh mục (Categories)"""
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with config_lock:
        _write_json_file(CATEGORIES_FILE, categories_data)

def write_stores(stores_data):
    """Hàm ghi độc lập chỉ dành cho Cấu hình Cửa hàng (Stores)"""
    os.makedirs(CONFIG_DIR, exist_ok=True)
    os.makedirs(IMAGES_DIR, exist_ok=True)
    with config_lock:
        data_to_write = copy.deepcopy(stores_data)
        for store in data_to_write:
            if 'name' in store: store['name'] = encode_b64_field(store['name'])
            if 'location' in store: store['location'] = encode_b64_field(store['location'])
            if 'website' in store: store['website'] = encode_b64_field(store['website'])
            if 'hotline' in store: store['hotline'] = encode_b64_field(store['hotline'])
            
            img_data = store.get('image')
            if img_data and isinstance(img_data, str) and img_data.startswith('data:image/'):
                try:
                    header, encoded = img_data.split(",", 1)
                    file_path = os.path.join(IMAGES_DIR, f"store_{store['id']}.webp")
                    with open(file_path, "wb") as fh:
                        fh.write(base64.b64decode(encoded))
                    store['hasImage'] = True
                except Exception:
                    pass
            elif img_data and isinstance(img_data, str) and img_data.startswith('/pos/api/v1/stores/'):
                store['hasImage'] = True
            
            if 'image' in store:
                del store['image']
        _write_json_file(STORES_FILE, data_to_write)

def write_employees(employees_data):
    """Hàm ghi độc lập chỉ dành cho Cấu hình Nhân sự (Employees)"""
    os.makedirs(CONFIG_DIR, exist_ok=True)
    os.makedirs(IMAGES_DIR, exist_ok=True)
    with config_lock:
        data_to_write = copy.deepcopy(employees_data)
        for emp in data_to_write:
            if 'name' in emp: emp['name'] = encode_b64_field(emp['name'])
            if 'cccd' in emp: emp['cccd'] = encode_b64_field(emp['cccd'])
            if 'phone' in emp: emp['phone'] = encode_b64_field(emp['phone'])
            
            img_data = emp.get('cccdImage')
            if img_data and isinstance(img_data, str) and img_data.startswith('data:image/'):
                try:
                    header, encoded = img_data.split(",", 1)
                    file_path = os.path.join(IMAGES_DIR, f"{emp['id']}.jpg")
                    with open(file_path, "wb") as fh:
                        fh.write(base64.b64decode(encoded))
                    emp['hasImage'] = True
                except Exception:
                    pass
            elif img_data and isinstance(img_data, str) and img_data.startswith('/pos/api/v1/employees/'):
                emp['hasImage'] = True
            
            if 'cccdImage' in emp:
                del emp['cccdImage']
        _write_json_file(EMPLOYEES_FILE, data_to_write)

def write_stock_requests(requests_data):
    """Hàm ghi độc lập chỉ dành cho Cấu hình Yêu cầu kho (Stock Requests)"""
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with config_lock:
        data_to_write = copy.deepcopy(requests_data)
        for req in data_to_write:
            if 'storeName' in req: req['storeName'] = encode_b64_field(req['storeName'])
            if 'productName' in req: req['productName'] = encode_b64_field(req['productName'])
            if 'note' in req: req['note'] = encode_b64_field(req['note'])
        _write_json_file(STOCK_REQUESTS_FILE, data_to_write)

def write_shift_slots(slots_data):
    """Hàm ghi độc lập chỉ dành cho Cấu hình Ca trực (Shift Slots)"""
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with config_lock:
        _write_json_file(SHIFT_SLOTS_FILE, slots_data)

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
    tmp_file = file + '.tmp'
    os.makedirs(CONFIG_DIR, exist_ok=True)
    data_to_write = []
    for tx in data:
        tx2 = dict(tx)
        if 'productName' in tx2: tx2['productName'] = encode_b64_field(tx2['productName'])
        if 'storeName' in tx2: tx2['storeName'] = encode_b64_field(tx2['storeName'])
        if 'note' in tx2: tx2['note'] = encode_b64_field(tx2['note'])
        data_to_write.append(tx2)
    with open(tmp_file, 'w', encoding='utf-8') as f:
        json.dump(data_to_write, f, ensure_ascii=False, indent=2)
    os.replace(tmp_file, file)