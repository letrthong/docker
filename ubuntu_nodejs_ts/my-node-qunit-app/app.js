require('ts-node').register();

// Bây giờ bạn có thể require file .ts trực tiếp
const { add, subtract } = require('./app.ts');

module.exports = { add, subtract };
