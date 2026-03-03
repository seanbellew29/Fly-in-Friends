//necessary server items
const express = require("express"),
app = express();
app.set("view engine", "ejs");


/*
* environmental variables setup
* availavle variables: 
* to import a variable, use : process.env.{VARIABLENAME};
*/
//const {loadEnvFile} = require("node:process");
//loadEnvFile("secretData.env");


//routing blocks
app.get("/", function (req, res) {
    res.render("index");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/chat-page", function (req, res) {
    res.render("chat-page");
});

app.get("/test", function (req, res) {
    res.render("test");
});

//start server. should be the last function/code in the whole script
app.listen(3000, function () {
    console.log("Server is running on port 3000");
});