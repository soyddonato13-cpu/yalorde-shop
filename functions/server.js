const serverless = require('serverless-http');
const app = require('../server'); // Import app from root

module.exports.handler = serverless(app);
