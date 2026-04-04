import uuid
from flask import Blueprint, jsonify, request
from utils import read_config, write_config, get_products_last_update, set_products_last_update, config_lock

pos_products_bp = Blueprint('pos_products_bp', __name__)

@pos_products_bp.route('/pos/api/v1/products', methods=['GET'])
def get_products():
    since = int(request.args.get('since', 0))
    last_update = get_products_last_update()
    if since >= last_update: return jsonify({'hasUpdate': False, 'lastUpdate': last_update})
    config = read_config()
    return jsonify({'hasUpdate': True, 'lastUpdate': last_update, 'products': config.get('products', [])})

@pos_products_bp.route('/pos/api/v1/products', methods=['PUT'])
def update_products():
    products = request.get_json()
    if not isinstance(products, list): return jsonify({"error": "Expected array"}), 400
    config = read_config()
    config['products'] = products
    write_config(config)
    set_products_last_update()
    return jsonify({"message": "Products saved", "count": len(products)})

@pos_products_bp.route('/pos/api/v1/products', methods=['POST'])
def add_product():
    product = request.get_json()
    if not product or not product.get('name'): return jsonify({"error": "Product name required"}), 400
    config = read_config()
    product['id'] = product.get('id', f"p{uuid.uuid4().hex[:8]}")
    product['status'] = 'created'
    config['products'].append(product)
    write_config(config)
    set_products_last_update()
    return jsonify({"message": "Product added", "product": product}), 201

@pos_products_bp.route('/pos/api/v1/products/<product_id>', methods=['PUT', 'DELETE'])
def modify_product(product_id):
    config = read_config()
    if request.method == 'DELETE':
        for p in config.get('products', []):
            if p['id'] == product_id:
                p['status'] = 'deleted'
        write_config(config)
        return jsonify({"message": f"Product {product_id} deleted"})
    
    for prod in config.get('products', []):
        if prod['id'] == product_id:
            prod.update(request.get_json())
            prod['id'] = product_id
            write_config(config)
            set_products_last_update()
            return jsonify({"message": f"Product {product_id} updated", "product": prod})
    return jsonify({"error": "Product not found"}), 404

@pos_products_bp.route('/pos/api/v1/products/<product_id>/action/import', methods=['POST'])
def secure_import(product_id):
    data = request.get_json()
    qty = int(data.get('quantity', 1))
    if qty <= 0: return jsonify({"error": "Số lượng không hợp lệ"}), 400
    
    with config_lock:
        config = read_config()
        product = next((p for p in config.get('products', []) if p['id'] == product_id), None)
        if not product: return jsonify({"error": "Không tìm thấy sản phẩm!"}), 404
        
        product['warehouseStock'] = int(product.get('warehouseStock', 0)) + qty
        write_config(config)
        set_products_last_update()
        
    return jsonify({"message": "Nhập kho thành công", "newStock": product['warehouseStock']})