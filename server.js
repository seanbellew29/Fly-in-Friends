
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const Listing = require("./models/Listings.js");
const convertLocationToCoords = require("./locationConversion");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
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

  // Using this function to parse the id from a query 
function parseUserId(id) {
  const num = parseInt(id);
  return isNaN(num) ? null : num;
}


// The db structure
const User = mongoose.model('User', {
  username: String,
  email: String,
  password: String,
  role: String,
  _id: Number
});

//db structure for profile
const profileSchema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true }, 
  age: { type: Number },
  location: { type: String, default: "" },
  interests: { type: [String], default: [] },
  plans: { type: [String], default: [] },
  joined: { type: String, default: new Date().toISOString() },
  avatar: { type: String, default: "" }
});

const Profile = mongoose.model("Profile", profileSchema);

//db message structure 
const messageSchema = new mongoose.Schema({
  sender: {
    type: Number, // matches the users id 
    required: true
  },
  receiver: {
    type: Number,
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

const Message = mongoose.model("Message", messageSchema);

function createNewToken(user, res) {
  let tokenPayload = { userId: user._id, "username": user.username };
  const token = jwt.sign(tokenPayload, tokenKey, { expiresIn: "20m" });
  res.cookie("session", token, { httpOnly: true });
}

function refreshToken(req,res){
  const token = req.cookies.session;
  const originalDecoded = jwt.decode(token, {complete: true});
  const id = originalDecoded.payload.userId;
  const username = originalDecoded.payload.username;
  const newToken = jwt.sign({userId:id,username},tokenKey,{expiresIn:"20m"});
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
    const decoded = jwt.verify(token, tokenKey);
    return decoded;
  } catch (err){
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

app.get("/profile-page", (req, res) => {
  if (!verifyToken(req)) 
    return res.redirect("/login");
  refreshToken(req, res);
  res.render("profile-page"); 
});

// getting the data from the json 

app.get("/profile", async (req, res) => {
  console.log("GET /profile route hit");
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: "Unauthorized" });

  refreshToken(req, res);

  try {
    let profile = await Profile.findOne({ userId: decoded.userId }); //profile details to match the user id
    if (!profile) {
      profile = new Profile({ userId: decoded.userId, joined: new Date().toISOString() }); 
      await profile.save();//toISOString fro date and time format using this easier to store in the db
    }
    const user = await User.findOne({ _id: decoded.userId });
    res.json({
      username: user ? user.username : "",
      age: profile.age || null,
      location: profile.location || "",
      interests: profile.interests || [],
      plans: profile.plans || [],
      joined: profile.joined,
       avatar: profile.avatar || ""
    });//combining the user and profile data into a json object 
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error loading profile" });
  }
});


app.get("/chat-page", async function (req, res) {
    if (!verifyToken(req)) 
      return res.render("403"); //verfies the users token

    refreshToken(req, res); //extends the session

    const otherUserId = parseInt(req.query.userId, 10);// had to parse the query 

    if (isNaN(otherUserId)) {
        return res.render("chat-page", { otherUserId: null, otherUsername: null });
    }

    let otherUsername = null;

    if (otherUserId !== null) {
        try {
            const user = await User.findOne({ _id: otherUserId });
            if (user) otherUsername = user.username;
        } catch (err) {
            console.error("Error fetching other user:", err);
        }
    }

    // Renders the chat-page 
    res.render("chat-page", { otherUserId, otherUsername });
}); 



//loads all saved lsitings from mongoDB and sends them to listings.ejs
//this allows users to view all currently available hangouts 
app.get("/listings", async function (req, res) {
  if (verifyToken(req)){
    refreshToken(req, res);
    try {
      const listings = await Listing.find();

      // add username of the creator for each listing
      const listingsWithUser = await Promise.all(listings.map(async (listing) => {
        const user = await User.findOne({ _id: listing.userId });
        return {
          ...listing._doc, 
          username: user ? user.username : "Unknown User"
        };
      }));

      res.render("listings", { listings: listingsWithUser });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error loading listings page");
    }
  } else {
    res.render("403")
  }
});//--look back at this//

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

// this is going to render the profile page -- issues with profile 



app.get("/message/:userId", async function (req, res) { //Loads the chat page
  const decoded = verifyToken(req); //takes the users logged in info
  if (!decoded) return res.render("403");
 
  refreshToken(req, res);
 
  const currentUserId = decoded.userId;
  const otherUserId = parseInt(req.params.userId, 10); //takes both users ids the logged in user and the other from url
  if (isNaN(otherUserId)) return res.status(400).send("Invalid user ID");
 
  try {
    const user = await User.findOne({ _id: otherUserId });
    if (!user) return res.status(404).send("User not found");
 
    const otherUsername = user.username;
    res.render("chat-page", { otherUserId, otherUsername, currentUserId }); //takes the other users username and renders the chat page
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading chat page");
  }
});


app.get("/messages/:userId", async (req, res) => {//fetches the chat history data
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).send("Unauthorized");
 
  const currentUserId = decoded.userId;
  const otherUserId = parseInt(req.params.userId, 10);
 
  if (isNaN(otherUserId)) return res.status(400).send("Invalid user ID");
 
  try {
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUserId }
      ]
    }).sort({ timestamp: 1 });//takes the two users messages from the db
 
    res.json(messages);//returns in json
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading messages");
  }
});


app.get("/conversations", async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).send("Unauthorized");

  const currentUserId = decoded.userId;

  try {
    const messages = await Message.find({
      $or: [
        { sender: currentUserId },
        { receiver: currentUserId }
      ]
    }).sort({ timestamp: -1 });//going to sort it fisrt to last

   
    const seenIds = new Set();//this is going to make sure the user will display once on the sidebar
    const conversations = [];

    for (const msg of messages) {
      const otherId = msg.sender === currentUserId ? msg.receiver : msg.sender;

      if (!seenIds.has(otherId)) {
        seenIds.add(otherId);
        const user = await User.findOne({ _id: otherId });
        if (user) {
          conversations.push({ userId: otherId, username: user.username, lastMessage: msg.content });
        }//takes the username from the db and makes a convo object with id username contents
      }
    }

    res.json(conversations);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading conversations");
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
    const newUser = new User({ username: name, email, password: hash, role, _id: userId, interests: [], plans: []  });
    await newUser.save();

    const newProfile = new Profile({
     userId: userId,
     joined: new Date().toISOString()
    });
    await newProfile.save();

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

//Hndles messages from users
app.post("/send-message", async (req, res) => {
 
  const decoded = verifyToken(req);
  if (!decoded)
     return res.status(401).send("Unauthorized");
 
  try {
    const { receiverId, content } = req.body;
 
    const receiverIdNum = parseInt(receiverId, 10);
    if (isNaN(receiverIdNum) || !content || content.trim() === "") { //takes receiver and content to validate
      return res.status(400).send("Invalid or missing fields");
    }
 
    const senderId = decoded.userId; //this is going to take the users id who sends message from token
 
    const newMessage = new Message({
      sender: senderId,
      receiver: receiverIdNum,
      content
    });
 
    await newMessage.save(); //saves to db
    res.status(200).json({ message: "Message sent" });
 
  } catch (err) {
    console.error("Error sending the message:", err);
    res.status(500).send(err.message);
  }
});


app.post("/profile", async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: "Unauthorized" });

  refreshToken(req, res);

  const { age, location, interests, plans } = req.body;
  const updates = {};
  if (age !== undefined) updates.age = age;
  if (location !== undefined) updates.location = location;
  if (interests !== undefined) updates.interests = interests;
  if (plans !== undefined) updates.plans = plans;
  if (req.body.avatar !== undefined) updates.avatar = req.body.avatar; //the profiles updates

  try {
    const updated = await Profile.findOneAndUpdate( //updates db
      { userId: decoded.userId },
      { $set: updates },
      { new: true, upsert: true } // createing the profile if it doesn't exist
    );
     console.log("Profile updated:", updated);
    res.json({ success: true, profile: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error saving profile" });
  }
});

// Starts the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});


