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
  role: String,
  _id: Number
});

//db message structure 
const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Message", messageSchema);

const messageRoutes = require("./messages.js");
app.use("/", messageRoutes);

function createNewToken(user, res) {
  const token = jwt.sign({ userId: user._id, username: user.username }, tokenKey, { expiresIn: "5m" });
  res.cookie("session", token, { httpOnly: true });
}

function refreshToken(req,res){
  const token = req.cookies.session;
  const originalDecoded = jwt.decode(token, {complete: true});
  const refreshed = jwt.refresh(originalDecoded, "5m", tokenKey);
  res.cookie("session", refreshed, { httpOnly: true });
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
    return true;
  } catch {
    return false;
  }
}

/************************* GET FUNCTIONS, ROUTING ***********************************/
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
  if (verifyToken(req)){
    //refresh here
    res.render("chat-page");
  }else{
    res.render("403");
  }
});

app.get("/listings", async function (req, res) {
  if (verifyToken(req,res)){
    //refresh here
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
    if (verifyToken(req)){
      refreshToken(req, res);
      res.render("map");
  }else{
    res.render("403");
  }
});

app.get("/profile-page", function (req, res) {
    if (verifyToken(req)){
      //refresh here
      res.render("profile-page");
  }else{
    res.render("403");
  }
});

app.get("/listings", function (req, res) {
    if (verifyToken(req)){
      //refresh here
      res.render("listings");
  }else{
    res.render("403");
  }
});

app.get("/message", function (req, res) {
    if (verifyToken(req)){
      //refresh here
      res.render("chat-page");
  }else{
    res.render("403");
  }
});

/****************************** POST FUNCTIONS BELOW **************************/
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
    const userId = Math.floor(Math.random() * 10000);
    console.log(userId);
    const hash = await bcrypt.hash(password, 10);
    const newUser = new User({ username: name, email, password: hash, role, _id: userId });
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
    const { username, password } = req.body;
    const foundUser = await User.findOne({ username });

    if (!foundUser) return res.status(400).send("User was not found");

    const match = await bcrypt.compare(password, foundUser.password);

    if (match) {
        createNewToken(foundUser, res); //passwords match
        res.redirect('/map');         
    } else {
        res.status(400).send("Invalid credentials");
    }
  } catch (err) {
    //passwords dont match
    console.error(err);
    res.status(500).send("could not log in");
  }
});

  

// Starts the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
