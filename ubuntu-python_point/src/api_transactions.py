import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from utils import read_transactions, write_transactions

pos_transactions_bp = Blueprint('pos_transactions_bp', __name__)

@pos_transactions_bp.route('/pos/api/v1/transactions/<store_id>', methods=['GET', 'POST', 'PUT'])
def handle_transactions(store_id):
    if request.method == 'GET':
        txs = read_transactions(store_id)
        month = request.args.get('month')
        tx_type = request.args.get('type')
        if month: txs = [t for t in txs if t.get('date', '').startswith(month)]
        if tx_type and tx_type != 'all': txs = [t for t in txs if t.get('type') == tx_type]
        return jsonify(txs)
    elif request.method == 'POST':
        tx = request.get_json()
        txs = read_transactions(store_id)
        tx['id'] = tx.get('id', f"tx{uuid.uuid4().hex[:8]}")
        tx.setdefault('date', datetime.now(timezone.utc).isoformat())
        txs.append(tx)
        write_transactions(store_id, txs)
        return jsonify({"message": "Transaction recorded", "transaction": tx}), 201
    elif request.method == 'PUT':
        txs = request.get_json()
        write_transactions(store_id, txs)
        return jsonify({"message": "Transactions saved", "count": len(txs)})