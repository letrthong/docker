import uuid
from flask import Blueprint, jsonify, request
from utils import read_config, write_config

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