const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// Views engine
app.set('view engine', 'ejs');

// MongoDB connection
const dbURI = "mongodb+srv://Sean_DB:Stockholm29@cluster0.kunhm3i.mongodb.net/Fly-in-Friends?retryWrites=true&w=majority";

mongoose.connect(dbURI)
  .then(() => console.log("Connected to Fly-in-Friends database"))//display when connect
  .catch(err => console.error("Database connection error:", err));//displays when not connectd

// The db  structure
const User = mongoose.model('User', {
  username: String,
  email: String,  
  password: String,
  role: String
});

// landing page will open first
app.get('/', (req, res) => {
  res.render('landing'); 
});

// Shows the login page
app.get('/login', (req, res) => {
  res.render('login'); 
});
//register page
app.get('/register', (req, res) => {
  res.render('register'); 
});

app.post('/register', async (req, res) => {
  console.log('req.body:', req.body);

  const { name, email, password, confirm_password, role } = req.body;

  if (!name || !email || !password || !confirm_password || !role) {
    return res.status(400).send('All fields are required!');//will display when the text fields are not filled out 
  }

  if (password !== confirm_password) {
    return res.status(400).send('Passwords do not match!');//will display this when the passwrds dont match
  }

  const newUser = new User({ username: name, email, password, role });
  await newUser.save();

  res.redirect('/login');//will redirect the user tp the login page when the user submits their info
});

app.get('/test', (req, res) => res.send('Server is running!'));//testing the server to run 

// Handles login form submission
app.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const user = new User({ username, password, role });
    await user.save();

    // After login it will redirect to home page
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing login');
  }
});

// Starts the  server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

app.use(express.static('public'));

