const axios = require("axios");

async function convertLocationToCoords(location) {
    try {
        const apiKey = process.env.GEOAPIFY_KEY;

        const response = await axios.get("https://api.geoapify.com/v1/geocode/search", {
            params: {
                text: location,
                format: "json",
                limit: 1,
                filter: "countrycode:ie",
                apiKey: apiKey
            }
        });

        if (!response.data || response.data.results.length === 0) {
            return null;
        }

        const result = response.data.results[0];

        console.log("User entered:", location);
        console.log("Geoapify result:", result);

        return {
            latitude: result.lat,
            longitude: result.lon
        };

    } catch (error) {
        console.error("Error converting location:", error.message);
        return null;
    }
}

module.exports = convertLocationToCoords;