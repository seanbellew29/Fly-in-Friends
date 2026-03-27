const express = require('express');
const mongoose = require('mongoose');
const Listing = require("./models/Listing");
const convertLocationToCoords = require("./locationConversion");

const app = express();
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
const {loadEnvFile} = require("node:process");
loadEnvFile("secretData.env");
const dbURI = process.env.APIK;

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

app.get("/chat-page", function (req, res) {
    res.render("chat-page");
});

app.get("/map", function (req, res) {
    res.render("map");
});

app.get("/profile-page", function (req, res) {
    console.log("pass");
    res.render("profile-page");
});

app.get("/listings", async (req, res) => {
    try {
        const listings = await Listing.find();
        res.render("listings", { listings });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading listings page");
    }
});

app.get("/message", function (req, res) {
    res.render("chat-page");
});

//register page
app.get('/register', (req, res) => {
  res.render('register'); 
});


//POST functions
app.post('/register', async (req, res) => {
  console.log('req.body:', req.body);

//add listing 
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

  
//The users credentials requirements
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
    const { username, password} = req.body;

    const foundUser = await User.findOne({username:username});
    if (foundUser.password == password){
      res.redirect('/map');
    }else{
      res.status(500).send('could not log in');
    }

  } catch (err) {
    console.error(err);
    res.status(500).send('could not log in');
  }
});

// Starts the  server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

app.use(express.static('public'));

