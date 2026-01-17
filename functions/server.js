const app = require('../server');
// Since server.js exports { handler }, we can just re-export it.
// Actually, server.js exports handler which IS the serverless wrapped app.

module.exports.handler = app.handler;
