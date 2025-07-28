const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

const app = express();
app.use(cors());

// Set up Google Cloud Storage
const storage = new Storage();
const bucketName = 'YOUR_BUCKET_NAME'; // 🔁 Replace this
const bucket = storage.bucket(bucketName);

// Configure multer for in-memory upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Upload endpoint
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filename = `${Date.now()}-${req.file.originalname}`;
    const blob = bucket.file(filename);

    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    blobStream.on('error', (err) => {
      console.error(err);
      res.status(500).json({ error: 'Upload error' });
    });

    blobStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      res.status(200).json({ url: publicUrl });
    });

    blobStream.end(req.file.buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List images endpoint
app.get('/images', async (req, res) => {
  try {
    const [files] = await bucket.getFiles();
    const urls = files.map(
      (file) => `https://storage.googleapis.com/${bucket.name}/${file.name}`
    );
    res.status(200).json(urls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not list images' });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
