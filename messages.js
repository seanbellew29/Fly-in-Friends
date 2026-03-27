// routes
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Message structure for the database
const Message = mongoose.model('Message', {
    sender: String,
    receiver: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
});

// Send a message
router.post("/send-message", async (req, res) => {
    try {
        const { sender, receiver, text } = req.body;

        const newMessage = new Message({ sender, receiver, text });
        await newMessage.save();

        res.json({ success: true, message: newMessage });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error sending message");
    }
});

// Gets the messages between the two users
router.get("/messages", async (req, res) => {
    try {
        const { user1, user2 } = req.query;

        const messages = await Message.find({
            $or: [
                { sender: user1, receiver: user2 },
                { sender: user2, receiver: user1 }
            ]
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (err) {
        res.status(500).send("Error fetching messages");
    }
});

module.exports = router;