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
  let tokenPayload = { userId: user._id, "username": user.username };
  const token = jwt.sign(tokenPayload, tokenKey, { expiresIn: "5m" });
  res.cookie("session", token, { httpOnly: true });
}

function refreshToken(req,res){
  const token = req.cookies.session;
  const originalDecoded = jwt.decode(token, {complete: true});
  const id = originalDecoded.payload.userId;
  const username = originalDecoded.payload.username;
  const newToken = jwt.sign({userId:id,username},tokenKey,{expiresIn:"5m"});
  res.cookie("session", newToken, { httpOnly: true });
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
    refreshToken(req, res);
    res.render("chat-page");
  }else{
    res.render("403");
  }
});

//loads all saved lsitings from mongoDB and sends them to listings.ejs
//this allows users to view all currently available hangouts 
app.get("/listings", async function (req, res) {
  if (verifyToken(req,res)){
    refreshToken(req, res);
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

//loads all the listinngs and passes them into the map page 
//the data is used in map.ejs / Sc riupt.js to generate Leaflet markers
app.get("/map", async function (req, res) {
  if (verifyToken(req, res)) {
    refreshToken(req,res);
    try {
      const listings = await Listing.find();
      res.render("map", { listings });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error loading map page");
    }
  } else {
    res.render("403");
  }
});

//API route returns all listings as JSON
//this can be used for frotnnds map features or future async loading
app.get("/api/listings" , async function(req,res){
  if(verifyToken(req, res)){
    refreshToken(req,res);
    try{
      const listings = await Listing.find();
      res.json(listings);

    }catch(error){
      console.error(error);
      res.status(500).json({error: "Error loading listings"});

    }
  }else {
      res.status(403).json({error: "Forbidden"});
    }

});

app.get("/profile-page", function (req, res) {
    if (verifyToken(req)){
      refreshToken(req, res);
      res.render("profile-page");
  }else{
    res.render("403");
  }
});

app.get("/listings", function (req, res) {
    if (verifyToken(req)){
      refreshToken(req, res);
      res.render("listings");
  }else{
    res.render("403");
  }
});

app.get("/message", function (req, res) {
    if (verifyToken(req)){
      refreshToken(req, res);
      res.render("chat-page");
  }else{
    res.render("403");
  }
});

/****************************** POST FUNCTIONS BELOW **************************/
app.post('/register', async (req, res) => {

  // The users credentials requirements
  const { name, email, password, confirm_password, role } = req.body;

  if (!name || !email || !password || !confirm_password || !role) {
    return res.status(400).send('All fields are required!');
  }

  if (password !== confirm_password) {
    return res.status(400).send('Passwords do not match!');
  }

  try {
    //generate unique User ID
    var userId = Math.floor(Math.random() * 10000);
    while (await User.findOne({ userId })){
      userId = Math.floor(Math.random() * 10000);
    }

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
//checks that all the feilds are filled amd prevents duplicates
//converts the users input into long/lat
//saves the completed listings to ongoDB for list and map dispolay
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

    const token = req.cookies.session;
    const originalDecoded = jwt.decode(token, {complete: true});
    const Uid = originalDecoded.payload.userId;
    //creates  a new lsiting document including both text details and coordinates
    const newListing = new Listing({
      title,
      location,
      activity,
      latitude: coords.latitude,
      longitude: coords.longitude,
      userId: Uid
    });

    await newListing.save();

      //after saving it brings the yser tot thre listing page so the new entry is visible 
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
