//necessary server items
const express = require("express"),
app = express();
app.set("view engine", "ejs");
app.use(express.static('public'));


/*
* environmental variables setup
* availavle variables: 
* to import a variable, use : process.env.{VARIABLENAME};
*/
const {loadEnvFile} = require("node:process");
loadEnvFile("./etc/secrets/secretData.env");
s = process.env.superVariable;
test = process.env.test;


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

app.get("/listings", function (req, res) {
    res.render("listings");
});

app.get("/message", function (req, res) {
    res.render("chat-page");
});


//TEMPORARY Post functionality, replace this later with checking account details from Database
app.post("/login", function(req,res){
    res.render("profile-page");
});

//start server. should be the last function/code in the whole script
app.listen(3000, function () {
    console.log("Server is running on port 3000");
    console.log(test);
});