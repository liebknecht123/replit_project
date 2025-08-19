const express = require('express');
const router = express.Router();
const mainRoutes = require('../index');

router.use('/', mainRoutes);

module.exports = router;
