// routes/fileRoutes.js
const express = require('express');
const multer = require('multer');
const { uploadFile, getFile } = require('../utils/supabaseHandler');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), uploadFile);
router.get('/:id', getFile);

module.exports = router;
