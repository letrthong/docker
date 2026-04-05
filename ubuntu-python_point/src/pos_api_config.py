from flask import Blueprint, jsonify, request
from pos_utils import read_config, write_config

pos_config_bp = Blueprint('pos_config_bp', __name__)

# Giữ lại GET API này để Frontend tải toàn bộ state 1 lần duy nhất lúc mở Web (Bootstrapping tối ưu tốc độ)
@pos_config_bp.route('/pos/api/v1/config', methods=['GET'])
def get_config():
    return jsonify(read_config())

@pos_config_bp.route('/pos/api/v1/categories', methods=['PUT'])
def update_categories():
    categories = request.get_json()
    if not isinstance(categories, list): return jsonify({"error": "Dữ liệu danh mục không hợp lệ"}), 400
    write_config({'categories': categories}) # write_config đã tự có lock và chỉ ghi đè file categories.json
    return jsonify({"message": "Đã lưu danh mục thành công"})

@pos_config_bp.route('/pos/api/v1/shift-slots', methods=['PUT'])
def update_shift_slots():
    slots = request.get_json()
    if not isinstance(slots, list): return jsonify({"error": "Dữ liệu ca trực không hợp lệ"}), 400
    write_config({'shiftSlots': slots}) # write_config đã tự có lock và chỉ ghi đè file shift_slots.json
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