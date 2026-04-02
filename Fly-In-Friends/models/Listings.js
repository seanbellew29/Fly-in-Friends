const mongoose = require("mongoose");
//schema for users hangoutlistings
//stores the text/ coordinats for the map
const listingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    activity:{
        type: String,
        required: true
    },
    latitude:{
        type: Number,
        required: true
    },
    longitude:{
        type: Number,
        requiured:true
    },
    createdAt:{
        type: Date,
        default: Date.now
    },
    userId: {
        type: Number,
        required:true
    }

});
module.exports = mongoose.model("Listings", listingSchema);
