require('dotenv').config();

const cloudinary = require('cloudinary').v2;

const CLOUD_BASE_URL = process.env.CLOUD_BASE_URL;
const CLOUD_NAME = process.env.CLOUD_NAME;
const CLOUD_API_KEY = process.env.CLOUD_API_KEY;
const CLOUD_API_SECRET = process.env.CLOUD_API_SECRET;

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: CLOUD_API_KEY,
  api_secret: CLOUD_API_SECRET
});

const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;

const formidable = require('formidable');

const fs = require('fs');
const os = require('os');

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/myapp', { useNewUrlParser: true })
  .then(_ => {
    console.log('DB connected');
  });

// Model
const Image = require('./Models/Image');

app.use(express.static(path.join(__dirname, '/public')));
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

app.get('/', async (req, res, next) => {
  try {
    const images = await Image.find({});
    res.render('images', { images, baseUrl: CLOUD_BASE_URL, imgSetting: 'c_fill,w_500,h_500' });
  } catch (error) {
    next(error);
  }
});

app.post('/upload', (req, res, next) => {
  const form = formidable();
  form.parse(req, async (err, fields, files) => {
    if (err) return next(err);

    const file = files.upfile;

    const isValid = isFileValid(file);
    if (!isValid) return next(new Error('File type error'));

    console.log(file);

    // create a file name
    const fileName = encodeURIComponent(file.name.replace(/\s/g, "-"));
    const oldName = file.path;
    const newName = path.join(os.tmpdir(), fileName);

    try {
      fs.renameSync(oldName, newName);
      const img = await cloudinary.uploader.upload(newName, {
        folder: "basic",
        unique_filename: true,
        use_filename: true
      });
      const image = new Image({
        url: img.public_id
      });
      await image.save();
      console.log(image);
      res.redirect('/');
    } catch (error) {
      next(error);
    }
  })
});

app.post('/:imgId', async (req, res, next) => {
  try {
    const { imgId } = req.params;
    const img = await Image.findByIdAndDelete(imgId);
    console.log(img);
    cloudinary.uploader.destroy(img.url, {
      type: 'upload'
    }, (err, result) => {
      if (err) next(err)
      res.redirect('/');
      console.log(result);
    });
  } catch (error) {
    next(error)
  }
})

app.use((err, req, res, next) => {
  res.json({ err });
});

app.listen(PORT, () => {
  console.log(`App running on port: ${PORT}`);
});

const isFileValid = (file) => {
  const type = file.type.split("/").pop();
  const validTypes = ["jpg", "jpeg", "png"];
  if (validTypes.indexOf(type) === -1) {
    return false;
  }
  return true;
};