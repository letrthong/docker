import os
import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from pos_utils import read_config, write_stores, write_products, write_stock_requests, config_lock, read_transactions, write_transactions
from pos_utils import STORES_FILE, PRODUCTS_FILE, EMPLOYEES_FILE, STOCK_REQUESTS_FILE, CATEGORIES_FILE, SHIFT_SLOTS_FILE

pos_stores_bp = Blueprint('pos_stores_bp', __name__)

# --- CONFIG STATUS (Dùng để polling tối ưu băng thông) ---
@pos_stores_bp.route('/pos/api/v1/config/status', methods=['GET'])
def get_config_status():
    files = [STORES_FILE, PRODUCTS_FILE, EMPLOYEES_FILE, STOCK_REQUESTS_FILE, CATEGORIES_FILE, SHIFT_SLOTS_FILE]
    max_mtime = 0
    for f in files:
        if os.path.exists(f):
            mtime = os.path.getmtime(f)
            if mtime > max_mtime:
                max_mtime = mtime
    return jsonify({"lastModified": max_mtime})

# --- STORES ---
@pos_stores_bp.route('/pos/api/v1/stores', methods=['GET', 'PUT', 'POST'])
def handle_stores():
    config = read_config()
    if request.method == 'GET':
        return jsonify(config.get('stores', []))
    elif request.method == 'PUT':
        stores = request.get_json()
        config['stores'] = stores
        write_stores(config['stores'])
        return jsonify({"message": "Stores saved", "count": len(stores)})
    elif request.method == 'POST':
        store = request.get_json()
        store['id'] = store.get('id', f"s{uuid.uuid4().hex[:8]}")
        store['status'] = 'created'
        store.setdefault('employees', []); store.setdefault('inventory', []); store.setdefault('transactions', [])
        config['stores'].append(store)
        write_stores(config['stores'])
        return jsonify({"message": "Store added", "store": store}), 201

@pos_stores_bp.route('/pos/api/v1/stores/<store_id>', methods=['GET', 'PUT', 'DELETE'])
def modify_store(store_id):
    config = read_config()
    if request.method == 'DELETE':
        for s in config.get('stores', []):
            if s['id'] == store_id:
                s['status'] = 'deleted'
        write_stores(config['stores'])
        return jsonify({"message": f"Store {store_id} deleted"})
    for store in config.get('stores', []):
        if store['id'] == store_id:
            if request.method == 'GET': return jsonify(store)
            store.update(request.get_json())
            store['id'] = store_id
            write_stores(config['stores'])
            return jsonify({"message": f"Store updated", "store": store})
    return jsonify({"error": "Store not found"}), 404

# --- TRANSACTIONS ---
@pos_stores_bp.route('/pos/api/v1/stores/<store_id>/transactions', methods=['GET'])
def get_store_transactions(store_id):
    txs = read_transactions(store_id)
    return jsonify(txs)

@pos_stores_bp.route('/pos/api/v1/transactions/all', methods=['GET'])
def get_all_transactions():
    config = read_config()
    all_txs = []
    
    # 1. Lấy Lịch sử kho tổng
    wh_txs = read_transactions('warehouse')
    all_txs.extend(wh_txs)
    
    # 2. Lấy Lịch sử các chi nhánh (loại bỏ các giao dịch đã ghi nhận ở kho tổng để tránh tính đúp)
    for store in config.get('stores', []):
        st_txs = read_transactions(store['id'])
        for tx in st_txs:
            if tx.get('type') not in ['distribute', 'return']:
                all_txs.append(tx)
                
    sorted_txs = sorted(all_txs, key=lambda x: x.get('date', ''), reverse=True)
    return jsonify(sorted_txs)

# --- INVENTORY ---
@pos_stores_bp.route('/pos/api/v1/stores/<store_id>/inventory', methods=['GET', 'PUT', 'POST'])
def handle_inventory(store_id):
    config = read_config()
    for store in config.get('stores', []):
        if store['id'] == store_id:
            if request.method == 'GET': return jsonify(store.get('inventory', []))
            if request.method == 'PUT':
                store['inventory'] = request.get_json()
                write_stores(config['stores'])
                return jsonify({"message": "Inventory updated"})
            if request.method == 'POST':
                item = request.get_json()
                store.setdefault('inventory', []).append(item)
                write_stores(config['stores'])
                return jsonify({"message": "Item added", "item": item}), 201
    return jsonify({"error": "Store not found"}), 404

@pos_stores_bp.route('/pos/api/v1/stores/<store_id>/inventory/<product_id>', methods=['DELETE'])
def delete_inventory(store_id, product_id):
    config = read_config()
    for store in config.get('stores', []):
        if store['id'] == store_id:
            store['inventory'] = [i for i in store.get('inventory', []) if i['productId'] != product_id]
            write_stores(config['stores'])
            return jsonify({"message": "Item deleted"})
    return jsonify({"error": "Store not found"}), 404

# --- EMPLOYEES ---
@pos_stores_bp.route('/pos/api/v1/employees', methods=['GET'])
def get_all_employees():
    config = read_config()
    return jsonify(config.get('allEmployees', []))

# --- SECURE INVENTORY ACTIONS ---
@pos_stores_bp.route('/pos/api/v1/stores/<store_id>/action/sell', methods=['POST'])
def secure_sell(store_id):
    data = request.get_json()
    product_id = data.get('productId')
    qty = int(data.get('quantity', 1))
    
    with config_lock:  # Khóa chặn (Lock) các luồng khác không được can thiệp vào kho
        config = read_config()
        
        # 1. Tìm cửa hàng và kiểm tra tồn kho trực tiếp từ Database
        target_store = next((s for s in config.get('stores', []) if s['id'] == store_id), None)
        if not target_store: return jsonify({"error": "Không tìm thấy chi nhánh!"}), 404
        
        inventory_item = next((i for i in target_store.get('inventory', []) if i['productId'] == product_id), None)
        if not inventory_item or int(inventory_item.get('quantity', 0)) < qty:
            return jsonify({"error": "Lỗi Backend: Số lượng tồn kho không đủ để xuất bán!"}), 400
            
        # 2. Xử lý trừ kho an toàn trên server
        inventory_item['quantity'] = int(inventory_item['quantity']) - qty
        inventory_item['sold'] = int(inventory_item.get('sold', 0)) + qty
        
        # 3. Ghi đè lại cấu hình
        write_stores(config['stores'])
        
    # 4. Ghi lại luôn Lịch sử giao dịch (Log) vào Database
    product = next((p for p in config.get('products', []) if p['id'] == product_id), {})
    txs = read_transactions(store_id)
    txs.append({
        'id': f"tx{uuid.uuid4().hex[:8]}", 'type': 'sell', 'productId': product_id,
        'productName': product.get('name', 'N/A'), 'storeId': store_id,
        'storeName': target_store.get('name', 'N/A'), 'quantity': qty,
        'costPrice': product.get('costPrice', 0),
        'unitPrice': product.get('basePrice', 0), 'date': datetime.now(timezone.utc).isoformat(),
        'note': f"Bán {qty} {product.get('unit', 'cái')} tại {target_store.get('name', 'N/A')}"
    })
    write_transactions(store_id, txs)
    
    return jsonify({"message": "Bán hàng thành công", "newQuantity": inventory_item['quantity']})

@pos_stores_bp.route('/pos/api/v1/stores/<store_id>/action/distribute', methods=['POST'])
def secure_distribute(store_id):
    data = request.get_json()
    product_id = data.get('productId')
    qty = int(data.get('quantity', 1))
    if qty <= 0: return jsonify({"error": "Số lượng không hợp lệ"}), 400
    
    with config_lock:
        config = read_config()
        product = next((p for p in config.get('products', []) if p['id'] == product_id), None)
        if not product: return jsonify({"error": "Không tìm thấy sản phẩm!"}), 404
        if int(product.get('warehouseStock', 0)) < qty:
            return jsonify({"error": "Lỗi Backend: Kho tổng không đủ hàng!"}), 400
            
        target_store = next((s for s in config.get('stores', []) if s['id'] == store_id), None)
        if not target_store: return jsonify({"error": "Không tìm thấy chi nhánh!"}), 404
        
        product['warehouseStock'] = int(product.get('warehouseStock', 0)) - qty
        
        new_req = {
            'id': f"req_{uuid.uuid4().hex[:8]}",
            'storeId': store_id,
            'storeName': target_store.get('name', 'N/A'),
            'productId': product_id,
            'productName': product.get('name', 'N/A'),
            'quantity': qty,
            'status': 'shipping',
            'date': datetime.now(timezone.utc).isoformat(),
            'note': "Admin điều phối (Chờ nhận)"
        }
        config.setdefault('stockRequests', []).append(new_req)
            
        write_products(config['products'])
        write_stock_requests(config['stockRequests'])
        
    txs = read_transactions(store_id)
    txs.append({
        'id': f"tx{uuid.uuid4().hex[:8]}", 'type': 'distribute', 'productId': product_id,
        'productName': product.get('name', 'N/A'), 'storeId': store_id,
        'storeName': target_store.get('name', 'N/A'), 'quantity': qty,
        'costPrice': product.get('costPrice', 0),
        'unitPrice': product.get('basePrice', 0),
        'date': datetime.now(timezone.utc).isoformat(),
        'note': f"Chờ nhận {qty} {product.get('unit', 'cái')} từ kho tổng"
    })
    write_transactions(store_id, txs)
    
    warehouse_txs = read_transactions('warehouse')
    warehouse_txs.append({
        'id': f"tx_out_{uuid.uuid4().hex[:8]}", 'type': 'distribute', 'productId': product_id,
        'productName': product.get('name', 'N/A'), 'storeId': store_id,
        'costPrice': product.get('costPrice', 0),
        'unitPrice': product.get('basePrice', 0),
        'storeName': target_store.get('name', 'N/A'), 'quantity': qty,
        'date': datetime.now(timezone.utc).isoformat(),
        'note': f"Xuất kho tổng {qty} {product.get('unit', 'cái')} cho {target_store.get('name', 'N/A')} (Đang giao)"
    })
    write_transactions('warehouse', warehouse_txs)
    
    return jsonify({"message": "Phân phối thành công", "request": new_req})

@pos_stores_bp.route('/pos/api/v1/stores/<store_id>/action/return', methods=['POST'])
def secure_return(store_id):
    data = request.get_json()
    product_id = data.get('productId')
    qty = int(data.get('quantity', 1))
    note = data.get('note', '')
    if qty <= 0: return jsonify({"error": "Số lượng không hợp lệ"}), 400
    
    with config_lock:
        config = read_config()
        product = next((p for p in config.get('products', []) if p['id'] == product_id), None)
        if not product: return jsonify({"error": "Không tìm thấy sản phẩm!"}), 404
            
        store = next((s for s in config.get('stores', []) if s['id'] == store_id), None)
        if not store: return jsonify({"error": "Không tìm thấy chi nhánh!"}), 404
        
        inventory_item = next((i for i in store.get('inventory', []) if i['productId'] == product_id), None)
        if not inventory_item or int(inventory_item.get('quantity', 0)) < qty:
            return jsonify({"error": "Lỗi Backend: Số lượng tồn kho không đủ để hoàn trả!"}), 400
            
        inventory_item['quantity'] = int(inventory_item['quantity']) - qty
        product['warehouseStock'] = int(product.get('warehouseStock', 0)) + qty
            
        write_stores(config['stores'])
        write_products(config['products'])
        
    txs = read_transactions(store_id)
    txs.append({
        'id': f"tx{uuid.uuid4().hex[:8]}", 'type': 'return', 'productId': product_id,
        'productName': product.get('name', 'N/A'), 'storeId': store_id,
        'storeName': store.get('name', 'N/A'), 'quantity': qty,
        'costPrice': product.get('costPrice', 0),
        'unitPrice': product.get('basePrice', 0),
        'date': datetime.now(timezone.utc).isoformat(),
        'note': f"Hoàn kho: {note or 'Không xác định'}"
    })
    write_transactions(store_id, txs)
    
    warehouse_txs = read_transactions('warehouse')
    warehouse_txs.append({
        'id': f"tx_in_{uuid.uuid4().hex[:8]}", 'type': 'return', 'productId': product_id,
        'productName': product.get('name', 'N/A'), 'storeId': store_id,
        'storeName': store.get('name', 'N/A'), 'quantity': qty,
        'costPrice': product.get('costPrice', 0),
        'unitPrice': product.get('basePrice', 0),
        'date': datetime.now(timezone.utc).isoformat(),
        'note': f"Nhận hoàn trả từ {store.get('name', 'N/A')}: {note or 'Không xác định'}"
    })
    write_transactions('warehouse', warehouse_txs)
    
    return jsonify({"message": "Hoàn trả kho thành công"})

@pos_stores_bp.route('/pos/api/v1/stores/<store_id>/action/transfer', methods=['POST'])
def secure_transfer(store_id):
    data = request.get_json()
    to_store_id = data.get('toStoreId')
    product_id = data.get('productId')
    qty = int(data.get('quantity', 1))
    note = data.get('note', '')
    
    if qty <= 0 or store_id == to_store_id: return jsonify({"error": "Thông tin luân chuyển không hợp lệ!"}), 400
    
    with config_lock:
        config = read_config()
        product = next((p for p in config.get('products', []) if p['id'] == product_id), None)
        if not product: return jsonify({"error": "Không tìm thấy sản phẩm!"}), 404
            
        from_store = next((s for s in config.get('stores', []) if s['id'] == store_id), None)
        to_store = next((s for s in config.get('stores', []) if s['id'] == to_store_id), None)
        if not from_store or not to_store: return jsonify({"error": "Không tìm thấy chi nhánh gửi/nhận!"}), 404
        
        from_item = next((i for i in from_store.get('inventory', []) if i['productId'] == product_id), None)
        if not from_item or int(from_item.get('quantity', 0)) < qty:
            return jsonify({"error": "Lỗi Backend: Số lượng tồn kho không đủ để luân chuyển!"}), 400
            
        from_item['quantity'] = int(from_item['quantity']) - qty
        to_item = next((i for i in to_store.get('inventory', []) if i['productId'] == product_id), None)
        if to_item:
            to_item['quantity'] = int(to_item['quantity']) + qty
        else:
            to_store.setdefault('inventory', []).append({'productId': product_id, 'quantity': qty, 'sold': 0})
            
        write_stores(config['stores'])
        
    now = datetime.now(timezone.utc).isoformat()
    
    from_txs = read_transactions(store_id)
    from_txs.append({
        'id': f"tx_out_{uuid.uuid4().hex[:8]}", 'type': 'transfer_out', 'productId': product_id,
        'productName': product.get('name', 'N/A'), 'storeId': store_id,
        'storeName': from_store.get('name', 'N/A'), 'quantity': qty,
        'costPrice': product.get('costPrice', 0), 'unitPrice': product.get('basePrice', 0),
        'date': now, 'note': f"Chuyển đến {to_store.get('name', 'N/A')}: {note}"
    })
    write_transactions(store_id, from_txs)
    
    to_txs = read_transactions(to_store_id)
    to_txs.append({
        'id': f"tx_in_{uuid.uuid4().hex[:8]}", 'type': 'transfer_in', 'productId': product_id,
        'productName': product.get('name', 'N/A'), 'storeId': to_store_id,
        'costPrice': product.get('costPrice', 0), 'unitPrice': product.get('basePrice', 0),
        'storeName': to_store.get('name', 'N/A'), 'quantity': qty,
        'date': now, 'note': f"Nhận từ {from_store.get('name', 'N/A')}: {note}"
    })
    write_transactions(to_store_id, to_txs)
    
    return jsonify({"message": "Luân chuyển thành công"})

@pos_stores_bp.route('/pos/api/v1/requests/action', methods=['POST'])
def secure_request_action():
    data = request.get_json()
    req_id = data.get('requestId')
    action = data.get('action') # 'approve', 'reject', 'receive'
    
    with config_lock:
        config = read_config()
        req = next((r for r in config.get('stockRequests', []) if r['id'] == req_id), None)
        if not req: return jsonify({"error": "Không tìm thấy yêu cầu!"}), 404
        
        qty = int(req.get('quantity', 0))
        
        if action == 'approve':
            if req.get('status') != 'pending': return jsonify({"error": "Yêu cầu không ở trạng thái chờ duyệt!"}), 400
            product = next((p for p in config.get('products', []) if p['id'] == req['productId']), None)
            if not product or int(product.get('warehouseStock', 0)) < qty:
                return jsonify({"error": "Kho tổng không đủ hàng để duyệt xuất!"}), 400
            
            product['warehouseStock'] = int(product.get('warehouseStock', 0)) - qty
            req['status'] = 'shipping'
            
            # Ghi log kho tổng
            warehouse_txs = read_transactions('warehouse')
            warehouse_txs.append({
                'id': f"tx_out_{uuid.uuid4().hex[:8]}", 'type': 'distribute', 'productId': req['productId'],
                'productName': product.get('name', 'N/A'), 'storeId': req['storeId'],
                'costPrice': product.get('costPrice', 0), 'unitPrice': product.get('basePrice', 0),
                'storeName': req.get('storeName', 'N/A'), 'quantity': qty,
                'date': datetime.now(timezone.utc).isoformat(),
                'note': f"Xuất kho gửi đến {req.get('storeName', 'N/A')} (Đang giao)"
            })
            write_transactions('warehouse', warehouse_txs)
            
        elif action == 'reject':
            if req.get('status') != 'pending': return jsonify({"error": "Yêu cầu không ở trạng thái chờ duyệt!"}), 400
            req['status'] = 'rejected'
            
        elif action == 'receive':
            if req.get('status') != 'shipping': return jsonify({"error": "Yêu cầu không ở trạng thái đang giao!"}), 400
            target_store = next((s for s in config.get('stores', []) if s['id'] == req['storeId']), None)
            if not target_store: return jsonify({"error": "Không tìm thấy chi nhánh!"}), 404
            
            inventory_item = next((i for i in target_store.get('inventory', []) if i['productId'] == req['productId']), None)
            if inventory_item:
                inventory_item['quantity'] = int(inventory_item['quantity']) + qty
            else:
                target_store.setdefault('inventory', []).append({'productId': req['productId'], 'quantity': qty, 'sold': 0})
                
            req['status'] = 'completed'
            
            # Ghi lại lịch sử giao dịch cho Chi nhánh
            product = next((p for p in config.get('products', []) if p['id'] == req['productId']), {})
            txs = read_transactions(req['storeId'])
            txs.append({
                'id': f"tx_in_{uuid.uuid4().hex[:8]}", 'type': 'receive', 'productId': req['productId'],
                'productName': product.get('name', req.get('productName', 'N/A')), 'storeId': req['storeId'],
                'storeName': target_store.get('name', 'N/A'), 'quantity': qty,
                'costPrice': product.get('costPrice', 0), 'unitPrice': product.get('basePrice', 0),
                'date': datetime.now(timezone.utc).isoformat(),
                'note': f"Nhận {qty} {product.get('unit', 'cái')} từ kho tổng"
            })
            write_transactions(req['storeId'], txs)
            
        if config.get('stores'): write_stores(config['stores'])
        if config.get('products'): write_products(config['products'])
        if config.get('stockRequests'): write_stock_requests(config['stockRequests'])
        
    return jsonify({"message": "Xử lý yêu cầu thành công!", "request": req})