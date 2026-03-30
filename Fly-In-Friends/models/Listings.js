const mongoose = require("mongoose");

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
    }

});
module.exports = mongoose.model("Listings", listingSchema);
