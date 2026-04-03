import base64
# ==================== TRANSACTIONS / HISTORY API ====================

# Helper encode/decode base64 cho field nhạy cảm
def encode_b64_field(val):
    if val is None:
        return ""
    return base64.b64encode(val.encode('utf-8')).decode('utf-8')

def decode_b64_field(val):
    if not val:
        return ""
    return base64.b64decode(val.encode('utf-8')).decode('utf-8')

from operator import index
import os
import json
import logging
import sys
import threading
import uuid
import time
from datetime import datetime, timezone
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import cross_origin
# ==================== PRODUCTS API ====================

PRODUCTS_LAST_UPDATE_FILE = os.path.join(CONFIG_DIR, 'products_last_update.txt')

def get_products_last_update():
    if not os.path.exists(PRODUCTS_LAST_UPDATE_FILE):
        return 0
    with open(PRODUCTS_LAST_UPDATE_FILE, 'r') as f:
        return int(f.read())

def set_products_last_update():
    with open(PRODUCTS_LAST_UPDATE_FILE, 'w') as f:
        f.write(str(int(time.time())))

# Flask app - serve SPA từ dist/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(BASE_DIR, 'dist')
CONFIG_DIR = os.path.join(BASE_DIR, 'config')
CONFIG_FILE = os.path.join(CONFIG_DIR, 'config.json')

app = Flask(__name__, static_folder=DIST_DIR, static_url_path='')

# --- Helper: đọc/ghi config ---
config_lock = threading.Lock()

def read_config():
    if not os.path.exists(CONFIG_FILE):
        return {"stores": [], "products": []}
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_config(data):
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with config_lock:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

# --- SPA ---
@app.route('/')
def serve_index():
    return send_from_directory(DIST_DIR, 'index.html')

# ==================== CONFIG API ====================

# GET toàn bộ config (stores + products)
@app.route('/pos/api/v1/config', methods=['GET'])
@cross_origin()
def get_config():
    return jsonify(read_config())

# PUT cập nhật toàn bộ config
@app.route('/pos/api/v1/config', methods=['PUT'])
@cross_origin()
def update_config():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400
    write_config(data)
    return jsonify({"message": "Config saved"})

# ==================== PRODUCTS API ====================

@app.route('/pos/api/v1/products', methods=['GET'])
@cross_origin()
def get_products():
    since = int(request.args.get('since', 0))
    last_update = get_products_last_update()
    if since >= last_update:
        return jsonify({'hasUpdate': False, 'lastUpdate': last_update})
    config = read_config()
    return jsonify({'hasUpdate': True, 'lastUpdate': last_update, 'products': config.get('products', [])})

@app.route('/pos/api/v1/products', methods=['PUT'])
@cross_origin()
def update_products():
    products = request.get_json()
    if not isinstance(products, list):
        return jsonify({"error": "Expected array"}), 400
    config = read_config()
    config['products'] = products
    write_config(config)
    set_products_last_update()
    return jsonify({"message": "Products saved", "count": len(products)})

# POST thêm 1 sản phẩm kho
@app.route('/pos/api/v1/products', methods=['POST'])
@cross_origin()
def add_product():
    product = request.get_json()
    if not product or not product.get('name'):
        return jsonify({"error": "Product name required"}), 400
    config = read_config()
    product['id'] = product.get('id', f"p{uuid.uuid4().hex[:8]}")
    config['products'].append(product)
    write_config(config)
    set_products_last_update()
    return jsonify({"message": "Product added", "product": product}), 201

# PUT sửa 1 sản phẩm kho
@app.route('/pos/api/v1/products/<product_id>', methods=['PUT'])
@cross_origin()
def edit_product(product_id):
    updates = request.get_json()
    if not updates:
        return jsonify({"error": "Invalid JSON"}), 400
    config = read_config()
    for prod in config.get('products', []):
        if prod['id'] == product_id:
            prod.update(updates)
            prod['id'] = product_id
            write_config(config)
            set_products_last_update()
            return jsonify({"message": f"Product {product_id} updated", "product": prod})
    return jsonify({"error": "Product not found"}), 404

# DELETE xóa 1 sản phẩm kho
@app.route('/pos/api/v1/products/<product_id>', methods=['DELETE'])
@cross_origin()
def delete_product(product_id):
    config = read_config()
    before = len(config.get('products', []))
    config['products'] = [p for p in config.get('products', []) if p['id'] != product_id]
    if len(config['products']) < before:
        write_config(config)
        return jsonify({"message": f"Product {product_id} deleted"})
    return jsonify({"error": "Product not found"}), 404

# ==================== STORES API ====================

@app.route('/pos/api/v1/stores', methods=['GET'])
@cross_origin()
def get_stores():
    config = read_config()
    return jsonify(config.get('stores', []))

@app.route('/pos/api/v1/stores', methods=['PUT'])
@cross_origin()
def update_stores():
    stores = request.get_json()
    if not isinstance(stores, list):
        return jsonify({"error": "Expected array"}), 400
    config = read_config()
    config['stores'] = stores
    write_config(config)
    return jsonify({"message": "Stores saved", "count": len(stores)})

# POST thêm 1 store mới
@app.route('/pos/api/v1/stores', methods=['POST'])
@cross_origin()
def add_store():
    store = request.get_json()
    if not store or not store.get('name'):
        return jsonify({"error": "Store name required"}), 400
    config = read_config()
    store['id'] = store.get('id', f"s{uuid.uuid4().hex[:8]}")
    store.setdefault('employees', [])
    store.setdefault('inventory', [])
    store.setdefault('transactions', [])
    config['stores'].append(store)
    write_config(config)
    return jsonify({"message": "Store added", "store": store}), 201

# GET 1 store theo id
@app.route('/pos/api/v1/stores/<store_id>', methods=['GET'])
@cross_origin()
def get_store(store_id):
    config = read_config()
    for store in config.get('stores', []):
        if store['id'] == store_id:
            return jsonify(store)
    return jsonify({"error": "Store not found"}), 404

# PUT sửa 1 store
@app.route('/pos/api/v1/stores/<store_id>', methods=['PUT'])
@cross_origin()
def edit_store(store_id):
    updates = request.get_json()
    if not updates:
        return jsonify({"error": "Invalid JSON"}), 400
    config = read_config()
    for store in config.get('stores', []):
        if store['id'] == store_id:
            store.update(updates)
            store['id'] = store_id
            write_config(config)
            return jsonify({"message": f"Store {store_id} updated", "store": store})
    return jsonify({"error": "Store not found"}), 404

# DELETE xóa 1 store
@app.route('/pos/api/v1/stores/<store_id>', methods=['DELETE'])
@cross_origin()
def delete_store(store_id):
    config = read_config()
    before = len(config.get('stores', []))
    config['stores'] = [s for s in config.get('stores', []) if s['id'] != store_id]
    if len(config['stores']) < before:
        write_config(config)
        return jsonify({"message": f"Store {store_id} deleted"})
    return jsonify({"error": "Store not found"}), 404

# ==================== INVENTORY API ====================

# GET inventory của 1 store
@app.route('/pos/api/v1/stores/<store_id>/inventory', methods=['GET'])
@cross_origin()
def get_inventory(store_id):
    config = read_config()
    for store in config.get('stores', []):
        if store['id'] == store_id:
            return jsonify(store.get('inventory', []))
    return jsonify({"error": "Store not found"}), 404

# PUT cập nhật inventory của 1 store
@app.route('/pos/api/v1/stores/<store_id>/inventory', methods=['PUT'])
@cross_origin()
def update_inventory(store_id):
    inventory = request.get_json()
    if not isinstance(inventory, list):
        return jsonify({"error": "Expected array"}), 400
    config = read_config()
    for store in config.get('stores', []):
        if store['id'] == store_id:
            store['inventory'] = inventory
            write_config(config)
            return jsonify({"message": f"Inventory updated for store {store_id}", "count": len(inventory)})
    return jsonify({"error": "Store not found"}), 404

# POST thêm sản phẩm vào inventory store
@app.route('/pos/api/v1/stores/<store_id>/inventory', methods=['POST'])
@cross_origin()
def add_inventory_item(store_id):
    item = request.get_json()
    if not item or not item.get('productId'):
        return jsonify({"error": "productId required"}), 400
    config = read_config()
    for store in config.get('stores', []):
        if store['id'] == store_id:
            store.setdefault('inventory', []).append(item)
            write_config(config)
            return jsonify({"message": "Inventory item added", "item": item}), 201
    return jsonify({"error": "Store not found"}), 404

# DELETE xóa sản phẩm khỏi inventory store
@app.route('/pos/api/v1/stores/<store_id>/inventory/<product_id>', methods=['DELETE'])
@cross_origin()
def delete_inventory_item(store_id, product_id):
    config = read_config()
    for store in config.get('stores', []):
        if store['id'] == store_id:
            before = len(store.get('inventory', []))
            store['inventory'] = [i for i in store.get('inventory', []) if i['productId'] != product_id]
            if len(store['inventory']) < before:
                write_config(config)
                return jsonify({"message": f"Product {product_id} removed from store {store_id}"})
            return jsonify({"error": "Product not in inventory"}), 404
    return jsonify({"error": "Store not found"}), 404

# ==================== EMPLOYEES API ====================

# GET tất cả nhân viên từ tất cả stores
@app.route('/pos/api/v1/employees', methods=['GET'])
@cross_origin()
def get_all_employees():
    config = read_config()
    employees = []
    for store in config.get('stores', []):
        for emp in store.get('employees', []):
            employees.append({**emp, 'storeId': store['id'], 'storeName': store['name']})
    return jsonify(employees)

# PUT cập nhật nhân viên của 1 store
@app.route('/pos/api/v1/stores/<store_id>/employees', methods=['PUT'])
@cross_origin()
def update_store_employees(store_id):
    employees = request.get_json()
    if not isinstance(employees, list):
        return jsonify({"error": "Expected array"}), 400
    config = read_config()
    for store in config.get('stores', []):
        if store['id'] == store_id:
            store['employees'] = employees
            write_config(config)
            return jsonify({"message": f"Employees updated for store {store_id}", "count": len(employees)})
    return jsonify({"error": "Store not found"}), 404

# POST thêm nhân viên vào store
@app.route('/pos/api/v1/stores/<store_id>/employees', methods=['POST'])
@cross_origin()
def add_employee(store_id):
    emp = request.get_json()
    if not emp or not emp.get('name'):
        return jsonify({"error": "Employee name required"}), 400
    config = read_config()
    for store in config.get('stores', []):
        if store['id'] == store_id:
            emp['id'] = emp.get('id', f"e{uuid.uuid4().hex[:8]}")
            store.setdefault('employees', []).append(emp)
            write_config(config)
            return jsonify({"message": "Employee added", "employee": emp}), 201
    return jsonify({"error": "Store not found"}), 404

# DELETE xóa nhân viên
@app.route('/pos/api/v1/stores/<store_id>/employees/<emp_id>', methods=['DELETE'])
@cross_origin()
def delete_employee(store_id, emp_id):
    config = read_config()
    for store in config.get('stores', []):
        if store['id'] == store_id:
            before = len(store.get('employees', []))
            store['employees'] = [e for e in store.get('employees', []) if e['id'] != emp_id]
            if len(store['employees']) < before:
                write_config(config)
                return jsonify({"message": f"Employee {emp_id} deleted"})
            return jsonify({"error": "Employee not found"}), 404
    return jsonify({"error": "Store not found"}), 404

# PUT sửa thông tin 1 nhân viên
@app.route('/pos/api/v1/stores/<store_id>/employees/<emp_id>', methods=['PUT'])
@cross_origin()
def edit_employee(store_id, emp_id):
    updates = request.get_json()
    if not updates:
        return jsonify({"error": "Invalid JSON"}), 400
    config = read_config()
    for store in config.get('stores', []):
        if store['id'] == store_id:
            for emp in store.get('employees', []):
                if emp['id'] == emp_id:
                    emp.update(updates)
                    emp['id'] = emp_id  # giữ nguyên id
                    write_config(config)
                    return jsonify({"message": f"Employee {emp_id} updated", "employee": emp})
            return jsonify({"error": "Employee not found"}), 404
    return jsonify({"error": "Store not found"}), 404

# ==================== TRANSACTIONS / HISTORY API ====================

def get_transactions_file(store_id):
    return os.path.join(CONFIG_DIR, f'transactions_{store_id}.json')

def read_transactions(store_id):
    file = get_transactions_file(store_id)
    if not os.path.exists(file):
        return []
    with open(file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    # decode các field nhạy cảm
    for tx in data:
        if 'productName' in tx:
            tx['productName'] = decode_b64_field(tx['productName'])
        if 'storeName' in tx:
            tx['storeName'] = decode_b64_field(tx['storeName'])
        if 'note' in tx:
            tx['note'] = decode_b64_field(tx['note'])
    return data

def write_transactions(store_id, data):
    file = get_transactions_file(store_id)
    os.makedirs(CONFIG_DIR, exist_ok=True)
    # encode các field nhạy cảm
    data_to_write = []
    for tx in data:
        tx2 = dict(tx)
        if 'productName' in tx2:
            tx2['productName'] = encode_b64_field(tx2['productName'])
        if 'storeName' in tx2:
            tx2['storeName'] = encode_b64_field(tx2['storeName'])
        if 'note' in tx2:
            tx2['note'] = encode_b64_field(tx2['note'])
        data_to_write.append(tx2)
    with open(file, 'w', encoding='utf-8') as f:
        json.dump(data_to_write, f, ensure_ascii=False, indent=2)

# GET/POST transactions for a store
@app.route('/pos/api/v1/transactions/<store_id>', methods=['GET', 'POST'])
@cross_origin()
def transactions_by_store(store_id):
    if request.method == 'GET':
        txs = read_transactions(store_id)
        month = request.args.get('month')
        tx_type = request.args.get('type')
        if month:
            txs = [t for t in txs if t.get('date', '').startswith(month)]
        if tx_type and tx_type != 'all':
            txs = [t for t in txs if t.get('type') == tx_type]
        return jsonify(txs)
    elif request.method == 'POST':
        tx = request.get_json()
        if not tx or not tx.get('type'):
            return jsonify({"error": "Transaction type required"}), 400
        txs = read_transactions(store_id)
        tx['id'] = tx.get('id', f"tx{uuid.uuid4().hex[:8]}")
        tx.setdefault('date', datetime.now(timezone.utc).isoformat())
        txs.append(tx)
        write_transactions(store_id, txs)
        return jsonify({"message": "Transaction recorded", "transaction": tx}), 201

# PUT replace all transactions for a store
@app.route('/pos/api/v1/transactions/<store_id>', methods=['PUT'])
@cross_origin()
def update_transactions_by_store(store_id):
    txs = request.get_json()
    if not isinstance(txs, list):
        return jsonify({"error": "Expected array"}), 400
    write_transactions(store_id, txs)
    return jsonify({"message": "Transactions saved", "count": len(txs)})

# ==================== 404 fallback for SPA ====================
@app.errorhandler(404)
def fallback(e):
    return send_from_directory(DIST_DIR, 'index.html')

if __name__ == "__main__":
    # Tắt debug để tránh Werkzeug Reloader quét file liên tục gây tràn RAM
    app.run(host="0.0.0.0", port=5000, threaded=True)
