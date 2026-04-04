from flask import Blueprint, jsonify, request
from pos_utils import read_config, write_config

pos_config_bp = Blueprint('pos_config_bp', __name__)

@pos_config_bp.route('/pos/api/v1/config', methods=['GET'])
def get_config():
    return jsonify(read_config())

@pos_config_bp.route('/pos/api/v1/config', methods=['PUT'])
def update_config():
    data = request.get_json()
    if not data: return jsonify({"error": "Invalid JSON"}), 400
    write_config(data)
    return jsonify({"message": "Config saved"})