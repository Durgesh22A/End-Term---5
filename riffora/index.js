// Vercel detects this root Express application and serves it as one function.
// Local development continues to use server/index.js.
require('express');
module.exports = require('./server/app');
