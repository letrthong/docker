const API_BASE = '/pos/api/v1';

const json = (res) => res.json();
const postJson = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(json);
const putJson = (url, body) => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(json);
const del = (url) => fetch(url, { method: 'DELETE' }).then(json);

export const api = {
  // Config
  getConfig:  () => fetch(`${API_BASE}/config`).then(json),
  saveConfig: (data) => putJson(`${API_BASE}/config`, data),

  // Products (kho hàng)
  getProducts:    () => fetch(`${API_BASE}/products`).then(json),
  saveProducts:   (products) => putJson(`${API_BASE}/products`, products),
  addProduct:     (product) => postJson(`${API_BASE}/products`, product),
  editProduct:    (id, data) => putJson(`${API_BASE}/products/${id}`, data),
  deleteProduct:  (id) => del(`${API_BASE}/products/${id}`),

  // Stores (cửa hàng)
  getStores:    () => fetch(`${API_BASE}/stores`).then(json),
  saveStores:   (stores) => putJson(`${API_BASE}/stores`, stores),
  addStore:     (store) => postJson(`${API_BASE}/stores`, store),
  getStore:     (id) => fetch(`${API_BASE}/stores/${id}`).then(json),
  editStore:    (id, data) => putJson(`${API_BASE}/stores/${id}`, data),
  deleteStore:  (id) => del(`${API_BASE}/stores/${id}`),

  // Inventory (tồn kho từng store)
  getInventory:       (storeId) => fetch(`${API_BASE}/stores/${storeId}/inventory`).then(json),
  saveInventory:      (storeId, items) => putJson(`${API_BASE}/stores/${storeId}/inventory`, items),
  addInventoryItem:   (storeId, item) => postJson(`${API_BASE}/stores/${storeId}/inventory`, item),
  deleteInventoryItem:(storeId, productId) => del(`${API_BASE}/stores/${storeId}/inventory/${productId}`),

  // Employees (nhân viên)
  getEmployees:       () => fetch(`${API_BASE}/employees`).then(json),
  saveStoreEmployees: (storeId, emps) => putJson(`${API_BASE}/stores/${storeId}/employees`, emps),
  addEmployee:        (storeId, emp) => postJson(`${API_BASE}/stores/${storeId}/employees`, emp),
  editEmployee:       (storeId, empId, data) => putJson(`${API_BASE}/stores/${storeId}/employees/${empId}`, data),
  deleteEmployee:     (storeId, empId) => del(`${API_BASE}/stores/${storeId}/employees/${empId}`),

  // Transactions (lịch sử giao dịch) - theo từng store
  getTransactions:    (storeId, month, type) => {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    if (type && type !== 'all') params.set('type', type);
    return fetch(`${API_BASE}/transactions/${storeId}?${params}`).then(json);
  },
  addTransaction:     (storeId, tx) => postJson(`${API_BASE}/transactions/${storeId}`, tx),
  saveTransactions:   (storeId, txs) => putJson(`${API_BASE}/transactions/${storeId}`, txs),
};
