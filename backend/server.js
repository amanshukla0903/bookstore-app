const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// In-memory book database
let books = [
  { id: 1, title: "The DevOps Handbook", author: "Gene Kim", price: 35.99, rating: 4.8 },
  { id: 2, title: "Kubernetes Up & Running", author: "Kelsey Hightower", price: 45.99, rating: 4.7 },
  { id: 3, title: "Terraform Up & Running", author: "Yevgeniy Brikman", price: 39.99, rating: 4.6 },
  { id: 4, title: "The Phoenix Project", author: "Gene Kim", price: 24.99, rating: 4.9 },
  { id: 5, title: "Site Reliability Engineering", author: "Google", price: 42.99, rating: 4.5 }
];

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'bookstore-backend',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0'
  });
});

// Get all books
app.get('/api/books', (req, res) => {
  res.json({
    success: true,
    count: books.length,
    data: books
  });
});

// Get single book
app.get('/api/books/:id', (req, res) => {
  const book = books.find(b => b.id === parseInt(req.params.id));
  if (!book) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }
  res.json({ success: true, data: book });
});

// Add a book
app.post('/api/books', (req, res) => {
  const newBook = {
    id: books.length + 1,
    title: req.body.title,
    author: req.body.author,
    price: req.body.price,
    rating: req.body.rating || 0
  };
  books.push(newBook);
  res.status(201).json({ success: true, data: newBook });
});

// Delete a book
app.delete('/api/books/:id', (req, res) => {
  const index = books.findIndex(b => b.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Book not found' });
  }
  books.splice(index, 1);
  res.json({ success: true, message: 'Book deleted' });
});

// Info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    app: 'BookStore API',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.APP_ENV || 'development',
    pod: process.env.HOSTNAME || 'local',
    nodeInfo: 'Running on ' + process.platform
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('BookStore Backend running on port ' + PORT);
});
