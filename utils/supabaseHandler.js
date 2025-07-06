// utils/supabaseHandler.js
const supabase = require('./supabaseClient');
const File = require('../models/File');

exports.uploadFile = async (req, res) => {
  try {
    const { originalname, buffer } = req.file;
    const path = `uploads/${Date.now()}_${originalname}`;

    const { error: uploadError } = await supabase
      .storage
      .from('institutelogo')
      .upload(path, buffer, {
        contentType: req.file.mimetype
      });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: publicUrlData } = supabase
      .storage
      .from('institutelogo')
      .getPublicUrl(path);

    const file = await File.create({
      name: originalname,
      supabasePath: path,
      publicUrl: publicUrlData.publicUrl
    });

    res.status(201).json({ message: 'File uploaded', file });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const { data, error } = await supabase
      .storage
      .from('institutelogo')
      .download(file.supabasePath);

    if (error) return res.status(500).json({ error: error.message });

    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    data.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
