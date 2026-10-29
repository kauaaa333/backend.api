const { createHash } = require('node:crypto');
module.exports = (hash) => createHash('sha256').update(hash).digest('hex');
