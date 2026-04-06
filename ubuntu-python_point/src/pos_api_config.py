import json
import base64
import hmac
import hashlib
from flask import Blueprint, jsonify, request
from pos_utils import read_config, write_config
from pos_api_auth import SECRET_KEY

pos_config_bp = Blueprint('pos_config_bp', __name__)

def is_admin_request(req):
    auth_header = req.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return False
    token = auth_header.split(' ')[1]
    try:
        parts = token.split('.')
        if len(parts) != 3: return False
        
        # Xác thực chữ ký bảo mật
        sig_msg = f"{parts[0]}.{parts[1]}"
        sig = hmac.new(SECRET_KEY.encode('utf-8'), sig_msg.encode('utf-8'), hashlib.sha256).digest()
        sig_b64 = base64.urlsafe_b64encode(sig).decode('utf-8').rstrip('=')
        if sig_b64 != parts[2]: return False
        
        # Đọc dữ liệu payload để check quyền
        payload_padded = parts[1] + '=' * (-len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_padded).decode('utf-8'))
        return payload.get('role') == 'admin'
    except Exception:
        return False

# Giữ lại GET API này để Frontend tải toàn bộ state 1 lần duy nhất lúc mở Web (Bootstrapping tối ưu tốc độ)
@pos_config_bp.route('/pos/api/v1/config', methods=['GET'])
def get_config():
    return jsonify(read_config())

@pos_config_bp.route('/pos/api/v1/categories', methods=['GET', 'POST', 'PUT'])
def handle_categories():
    config = read_config()
    current_categories = config.get('categories', [])

    if request.method == 'GET':
        return jsonify(current_categories)

    # Chặn quyền với POST và PUT
    if not is_admin_request(request):
        return jsonify({"error": "Từ chối truy cập: Chỉ Admin mới có quyền chỉnh sửa danh mục!"}), 403

    if request.method == 'POST':
        new_cat = request.get_json()
        if not isinstance(new_cat, dict): return jsonify({"error": "Dữ liệu không hợp lệ"}), 400
        current_categories.append(new_cat)
        write_config({'categories': current_categories})
        return jsonify({"message": "Đã thêm danh mục thành công", "category": new_cat}), 201

    if request.method == 'PUT':
        categories = request.get_json()
        if not isinstance(categories, list): return jsonify({"error": "Dữ liệu danh mục không hợp lệ"}), 400
        
        # Kiểm tra không cho phép xóa item: Mọi ID đang có đều phải tồn tại trong dữ liệu mới gửi lên
        current_ids = {cat.get('id') for cat in current_categories if isinstance(cat, dict) and cat.get('id')}
        incoming_ids = {cat.get('id') for cat in categories if isinstance(cat, dict) and cat.get('id')}
        
        if not current_ids.issubset(incoming_ids):
            return jsonify({"error": "Từ chối cập nhật: Hệ thống không cho phép xóa danh mục, chỉ có thể chỉnh sửa hoặc ẩn!"}), 400

        write_config({'categories': categories})
        return jsonify({"message": "Đã lưu danh mục thành công"})

@pos_config_bp.route('/pos/api/v1/shift-slots', methods=['GET', 'POST', 'PUT'])
def handle_shift_slots():
    config = read_config()
    current_slots = config.get('shiftSlots', [])

    if request.method == 'GET':
        return jsonify(current_slots)

    if not is_admin_request(request):
        return jsonify({"error": "Từ chối truy cập: Chỉ Admin mới có quyền chỉnh sửa ca trực!"}), 403

    if request.method == 'POST':
        new_slot = request.get_json()
        if not isinstance(new_slot, dict): return jsonify({"error": "Dữ liệu không hợp lệ"}), 400
        current_slots.append(new_slot)
        write_config({'shiftSlots': current_slots})
        return jsonify({"message": "Đã thêm ca trực thành công", "shiftSlot": new_slot}), 201

    if request.method == 'PUT':
        slots = request.get_json()
        if not isinstance(slots, list): return jsonify({"error": "Dữ liệu ca trực không hợp lệ"}), 400
        
        # Từ chối tuyệt đối việc lưu mảng rỗng
        if len(slots) == 0:
            return jsonify({"error": "Từ chối cập nhật: Không được phép lưu danh sách ca trực rỗng!"}), 400

        write_config({'shiftSlots': slots})
        return jsonify({"message": "Đã lưu ca làm việc thành công"})

@pos_config_bp.route('/pos/api/v1/employees/bulk', methods=['PUT'])
def update_all_employees():
    employees = request.get_json()
    write_config({'allEmployees': employees})
    return jsonify({"message": "Đã lưu danh sách nhân sự"})

@pos_config_bp.route('/pos/api/v1/requests/bulk', methods=['PUT'])
def update_all_requests():
    requests_data = request.get_json()
    write_config({'stockRequests': requests_data})
    return jsonify({"message": "Đã lưu yêu cầu kho"})