import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from pos_utils import read_config, write_config, config_lock, read_transactions, write_transactions

pos_stores_bp = Blueprint('pos_stores_bp', __name__)

# --- STORES ---
@pos_stores_bp.route('/pos/api/v1/stores', methods=['GET', 'PUT', 'POST'])
def handle_stores():
    config = read_config()
    if request.method == 'GET':
        return jsonify(config.get('stores', []))
    elif request.method == 'PUT':
        stores = request.get_json()
        config['stores'] = stores
        write_config(config)
        return jsonify({"message": "Stores saved", "count": len(stores)})
    elif request.method == 'POST':
        store = request.get_json()
        store['id'] = store.get('id', f"s{uuid.uuid4().hex[:8]}")
        store.setdefault('employees', []); store.setdefault('inventory', []); store.setdefault('transactions', [])
        config['stores'].append(store)
        write_config(config)
        return jsonify({"message": "Store added", "store": store}), 201

@pos_stores_bp.route('/pos/api/v1/stores/<store_id>', methods=['GET', 'PUT', 'DELETE'])
def modify_store(store_id):
    config = read_config()
    if request.method == 'DELETE':
        config['stores'] = [s for s in config.get('stores', []) if s['id'] != store_id]
        write_config(config)
        return jsonify({"message": f"Store {store_id} deleted"})
    for store in config.get('stores', []):
        if store['id'] == store_id:
            if request.method == 'GET': return jsonify(store)
            store.update(request.get_json())
            store['id'] = store_id
            write_config(config)
            return jsonify({"message": f"Store updated", "store": store})
    return jsonify({"error": "Store not found"}), 404

# --- INVENTORY ---
@pos_stores_bp.route('/pos/api/v1/stores/<store_id>/inventory', methods=['GET', 'PUT', 'POST'])
def handle_inventory(store_id):
    config = read_config()
    for store in config.get('stores', []):
        if store['id'] == store_id:
            if request.method == 'GET': return jsonify(store.get('inventory', []))
            if request.method == 'PUT':
                store['inventory'] = request.get_json()
                write_config(config)
                return jsonify({"message": "Inventory updated"})
            if request.method == 'POST':
                item = request.get_json()
                store.setdefault('inventory', []).append(item)
                write_config(config)
                return jsonify({"message": "Item added", "item": item}), 201
    return jsonify({"error": "Store not found"}), 404

@pos_stores_bp.route('/pos/api/v1/stores/<store_id>/inventory/<product_id>', methods=['DELETE'])
def delete_inventory(store_id, product_id):
    config = read_config()
    for store in config.get('stores', []):
        if store['id'] == store_id:
            store['inventory'] = [i for i in store.get('inventory', []) if i['productId'] != product_id]
            write_config(config)
            return jsonify({"message": "Item deleted"})
    return jsonify({"error": "Store not found"}), 404

# --- EMPLOYEES ---
@pos_stores_bp.route('/pos/api/v1/employees', methods=['GET'])
def get_all_employees():
    config = read_config()
    employees = []
    for store in config.get('stores', []):
        for emp in store.get('employees', []):
            employees.append({**emp, 'storeId': store['id'], 'storeName': store['name']})
    return jsonify(employees)

@pos_stores_bp.route('/pos/api/v1/stores/<store_id>/employees', methods=['PUT', 'POST'])
def handle_employees(store_id):
    config = read_config()
    for store in config.get('stores', []):
        if store['id'] == store_id:
            if request.method == 'PUT':
                store['employees'] = request.get_json()
                write_config(config)
                return jsonify({"message": "Employees updated"})
            if request.method == 'POST':
                emp = request.get_json()
                emp['id'] = emp.get('id', f"e{uuid.uuid4().hex[:8]}")
                store.setdefault('employees', []).append(emp)
                write_config(config)
                return jsonify({"message": "Employee added", "employee": emp}), 201
    return jsonify({"error": "Store not found"}), 404

@pos_stores_bp.route('/pos/api/v1/stores/<store_id>/employees/<emp_id>', methods=['PUT', 'DELETE'])
def modify_employee(store_id, emp_id):
    config = read_config()
    for store in config.get('stores', []):
        if store['id'] == store_id:
            if request.method == 'DELETE':
                for emp in store.get('employees', []):
                    if emp['id'] == emp_id:
                        emp['status'] = 'disable'
                        write_config(config)
                        return jsonify({"message": "Employee disabled"})
                return jsonify({"error": "Employee not found"}), 404
            for emp in store.get('employees', []):
                if emp['id'] == emp_id:
                    emp.update(request.get_json())
                    emp['id'] = emp_id
                    write_config(config)
                    return jsonify({"message": "Employee updated"})
    return jsonify({"error": "Store not found"}), 404

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
        write_config(config)
        
    # 4. Ghi lại luôn Lịch sử giao dịch (Log) vào Database
    product = next((p for p in config.get('products', []) if p['id'] == product_id), {})
    txs = read_transactions(store_id)
    txs.append({
        'id': f"tx{uuid.uuid4().hex[:8]}", 'type': 'sell', 'productId': product_id,
        'productName': product.get('name', 'N/A'), 'storeId': store_id,
        'storeName': target_store.get('name', 'N/A'), 'quantity': qty,
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
        inventory_item = next((i for i in target_store.get('inventory', []) if i['productId'] == product_id), None)
        if inventory_item:
            inventory_item['quantity'] = int(inventory_item['quantity']) + qty
        else:
            target_store.setdefault('inventory', []).append({'productId': product_id, 'quantity': qty, 'sold': 0})
            
        write_config(config)
        
    txs = read_transactions(store_id)
    txs.append({
        'id': f"tx{uuid.uuid4().hex[:8]}", 'type': 'distribute', 'productId': product_id,
        'productName': product.get('name', 'N/A'), 'storeId': store_id,
        'storeName': target_store.get('name', 'N/A'), 'quantity': qty,
        'date': datetime.now(timezone.utc).isoformat(),
        'note': f"Phân phối {qty} {product.get('unit', 'cái')} đến {target_store.get('name', 'N/A')}"
    })
    write_transactions(store_id, txs)
    
    return jsonify({"message": "Phân phối thành công"})

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
            
        write_config(config)
        
    txs = read_transactions(store_id)
    txs.append({
        'id': f"tx{uuid.uuid4().hex[:8]}", 'type': 'return', 'productId': product_id,
        'productName': product.get('name', 'N/A'), 'storeId': store_id,
        'storeName': store.get('name', 'N/A'), 'quantity': qty,
        'date': datetime.now(timezone.utc).isoformat(),
        'note': f"Hoàn kho: {note or 'Không xác định'}"
    })
    write_transactions(store_id, txs)
    
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
            
        write_config(config)
        
    now = datetime.now(timezone.utc).isoformat()
    
    from_txs = read_transactions(store_id)
    from_txs.append({
        'id': f"tx_out_{uuid.uuid4().hex[:8]}", 'type': 'transfer_out', 'productId': product_id,
        'productName': product.get('name', 'N/A'), 'storeId': store_id,
        'storeName': from_store.get('name', 'N/A'), 'quantity': qty,
        'date': now, 'note': f"Chuyển đến {to_store.get('name', 'N/A')}: {note}"
    })
    write_transactions(store_id, from_txs)
    
    to_txs = read_transactions(to_store_id)
    to_txs.append({
        'id': f"tx_in_{uuid.uuid4().hex[:8]}", 'type': 'transfer_in', 'productId': product_id,
        'productName': product.get('name', 'N/A'), 'storeId': to_store_id,
        'storeName': to_store.get('name', 'N/A'), 'quantity': qty,
        'date': now, 'note': f"Nhận từ {from_store.get('name', 'N/A')}: {note}"
    })
    write_transactions(to_store_id, to_txs)
    
    return jsonify({"message": "Luân chuyển thành công"})