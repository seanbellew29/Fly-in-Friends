const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const Listing = require("./models/Listings.js");
const convertLocationToCoords = require("./locationConversion");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
require("node:dns/promises").setServers(["1.1.1.1", "8.8.8.8"]);

// Views engine
app.set('view engine', 'ejs');

/*
* environmental variables setup and MONGODB API KEY
* available variables: 
* to import a variable from .env file, use     x = process.env.{VARIABLENAME};
*/
const { loadEnvFile } = require("node:process");
loadEnvFile("secretData.env");
const dbURI = process.env.APIK;
const tokenKey = process.env.tokenKey;

mongoose.connect(dbURI)
  .then(() => console.log("Connected to Fly-in-Friends database"))
  .catch(err => console.error("Database connection error:", err));

// The db structure
const User = mongoose.model('User', {
  username: String,
  email: String,
  password: String,
  role: String
});

function createToken(username,res){
  const token = jwt.sign({ user: username }, tokenKey, { expiresIn: "5m" });
  res.cookie("session", token, { httpOnly: true });
}

function verifyToken(req,res){
  const token = req.cookies.session;
  if (!token){
    //missing token
    return false;
  }
  try {
    //if this verify doesnt pass(token isnt valid), code goes straight to catch case.
    jwt.verify(token, tokenKey);

    //two lines below refresh the token to stay fresh when user is navigating or reloading pages
    const userName = jwt.decode(token,{complete: true}).payload.user;
    createToken(userName,res);
    //sends user to desired page
    return true;
  } catch {
    return false;
  }
}

function verifyTokenAndLoadPage(redirect, req,res){
  const token = req.cookies.session;
  if (!token){
    //missing token
    res.render("403");
  }
  try {
    //if this verify doesnt pass(token isnt valid), code goes straight to catch case.
    jwt.verify(token, tokenKey);

    //two lines below refresh the token to stay fresh when user is navigating or reloading pages
    const userName = jwt.decode(token,{complete: true}).payload.user;
    createToken(userName,res);
    //sends user to desired page
    res.render(redirect);
  } catch {
    res.render("403");
  }
}

//routing blocks
app.get("/", function (req, res) {
  res.render("landing");
});

app.get("/landing", function (req, res) {
  res.render("landing");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get('/register', (req, res) => {
  res.render('register'); 
});

app.get("/chat-page", function (req, res) {
  verifyTokenAndLoadPage("chat-page",req,res);
});

app.get("/listings", async function (req, res) {
  if (verifyToken(req,res)){
    
    try {
      const listings = await Listing.find();
      res.render("listings", { listings });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error loading listings page");
    }
    
  }else{
    res.render("403")
  }
});

app.get("/map", function (req, res) {
    verifyTokenAndLoadPage("map",req,res);
});

app.get("/profile-page", function (req, res) {
    verifyTokenAndLoadPage("profile-page",req,res);
});

app.get("/listings", function (req, res) {
    verifyTokenAndLoadPage("listings",req,res);
});

app.get("/message", function (req, res) {
    verifyTokenAndLoadPage("chat-page",req,res);
});

// POST functions
app.post('/register', async (req, res) => {
  //test
  console.log('req.body:', req.body);

  // The users credentials requirements
  const { name, email, password, confirm_password, role } = req.body;

  if (!name || !email || !password || !confirm_password || !role) {
    return res.status(400).send('All fields are required!');
  }

  if (password !== confirm_password) {
    return res.status(400).send('Passwords do not match!');
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const newUser = new User({ username: name, email, password: hash, role });
    await newUser.save();

    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.status(500).send("Could not register user");
  }
});

// ADD LISTING
app.post("/add-listing", async (req, res) => {
  const { title, location, activity } = req.body;

  if (!title || !location || !activity) {
    return res.status(400).send("All fields are required");
  }

  try {
    const existing = await Listing.findOne({ title, location });

    if (existing) {
      return res.status(400).send("Listing already exists");
    }

    const coords = await convertLocationToCoords(location);

    if (!coords) {
      return res.status(400).send("Location not found");
    }

    const newListing = new Listing({
      title,
      location,
      activity,
      latitude: coords.latitude,
      longitude: coords.longitude
    });

    await newListing.save();

    res.redirect("/listings");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving listing");
  }
});

// Handles login form submission
app.post('/login', async (req, res) => {
  try {
    const { username, password} = req.body;
    const foundUser = await User.findOne({username:username});

    bcrypt.compare(password, foundUser.password, function(err, result) {
        if (err) throw err;

        if (result === true) {
            //passwords match
            createToken(username,res);

            res.redirect('/map');
        }else{
            //passwords do not match
            res.status(500).send('could not log in');
        }
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('could not log in');
  }
});

// Starts the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
