// routes
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");
const tokenKey = process.env.tokenKey;



function getUserFromToken(req) {
    try {
        const token = req.cookies.session;
        return jwt.verify(token, tokenKey); 
    } catch {
        return null;
    }
}



// Sends a message
router.get("/messages", async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) return res.status(401).send("Unauthorized");

        const user1 = user.userId;  //the user id of the logged in user
        const { user2 } = req.query;    //id of the other user taken from a query string

        if (!user2) return res.status(400).send("Missing user2");//if no second user

        const messages = await Message.find({
            $or: [
                { sender: user1, receiver: user2 },
                { sender: user2, receiver: user1 } // ensures all messages from users are recieved 
            ]
        }).sort({ createdAt: 1 });  //sorts the messages by time 

        res.json(messages); //json strcutures
    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching messages"); //error
    }
});


// Gets the messages between the two users
router.post("/send-message", async (req, res) => {
    try {
        const user = getUserFromToken(req);
        if (!user) return res.status(401).send("Unauthorized"); //if the jwt is missing this display 

        const { receiver, text } = req.body;
        if (!receiver || !text) return res.status(400).send("Missing fields"); //if the fields are missing 

        const newMessage = new Message({
            sender: user.userId, // safe from jwt
            receiver,   //id of recipient 
            text        //message
        });

        await newMessage.save();    //saves to db 

        res.json({ success: true, message: newMessage });       //works
    } catch (err) {
        console.error(err);
        res.status(500).send("Error sending message");          //error
    }
});

module.exports = router;



