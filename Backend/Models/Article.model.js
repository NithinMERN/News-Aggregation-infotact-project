const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your_jwt_secret_key'; // Replace with secure key in production

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/news-aggregator', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Article Schema
const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  source: { type: String, required: true },
  url: { type: String, required: true, unique: true },
  publishedAt: { type: Date, default: Date.now },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const Article = mongoose.model('Article', articleSchema);

// Annotation Schema
const annotationSchema = new mongoose.Schema({
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Annotation = mongoose.model('Annotation', annotationSchema);

// User Schema (basic, for authentication)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // In production, hash passwords
});

const User = mongoose.model('User', userSchema);

// Authentication Middleware
const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.userId);
    if (!req.user) return res.status(401).json({ error: 'Invalid token' });
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// API Endpoints

// Submit Article
app.post('/api/article/submit-article', authMiddleware, async (req, res) => {
  try {
    const { title, content, source, url } = req.body;
    if (!title || !content || !source || !url) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const article = new Article({
      title,
      content,
      source,
      url,
      author: req.user._id,
    });

    await article.save();
    res.status(201).json({ message: 'Article submitted successfully', article });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Article with this URL already exists' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// Create Annotation
app.post('/api/article/new-annotation', authMiddleware, async (req, res) => {
  try {
    const { articleId, content } = req.body;
    if (!articleId || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const annotation = new Annotation({
      article: articleId,
      user: req.user._id,
      content,
    });

    await annotation.save();
    res.status(201).json({ message: 'Annotation created successfully', annotation });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Annotations for an Article
app.get('/api/article/annotation/:articleId', async (req, res) => {
  try {
    const annotations = await Annotation.find({ article: req.params.articleId })
      .populate('user', 'username')
      .sort({ createdAt: -1 });
    res.json(annotations);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Like an Article
app.post('/api/article/like/:articleId', authMiddleware, async (req, res) => {
  try {
    const article = await Article.findById(req.params.articleId);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    if (article.likes.includes(req.user._id)) {
      return res.status(400).json({ error: 'Article already liked' });
    }

    article.likes.push(req.user._id);
    if (article.dislikes.includes(req.user._id)) {
      article.dislikes = article.dislikes.filter(
        id => id.toString() !== req.user._id.toString()
      );
    }

    await article.save();
    res.json({ message: 'Article liked', likes: article.likes.length, dislikes: article.dislikes.length });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Dislike an Article
app.post('/api/article/dislike/:articleId', authMiddleware, async (req, res) => {
  try {
    const article = await Article.findById(req.params.articleId);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    if (article.dislikes.includes(req.user._id)) {
      return res.status(400).json({ error: 'Article already disliked' });
    }

    article.dislikes.push(req.user._id);
    if (article.likes.includes(req.user._id)) {
      article.likes = article.likes.filter(
        id => id.toString() !== req.user._id.toString()
      );
    }

    await article.save();
    res.json({ message: 'Article disliked', likes: article.likes.length, dislikes: article.dislikes.length });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});