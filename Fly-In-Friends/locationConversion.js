const axios = require("axios");
//converts the users iput eircode into lattitude and longitude
//uses the openStreetMap geocoding service
async function convertLocationToCoords(location){
    try{
        const response = await axios.get("https://nominatim.openstreetmap.org/search",{
            params: {
                q: `${location}, Dublin, Ireland`,
                format: "json",
                limit: 1
            },
            headers:{
                "User-Agent": "FlyInFriendsApp"
            }
        });
        //if there isnt any matching location it will return null
        if (!response.data || response.data.length === 0){
            return null;
        }
        //return latitude and longitude as numbers
        return{
            latitude: parseFloat(response.data[0].lat),
            longitude: parseFloat(response.data[0].lon)
        };
    }catch(error){
        console.error("Error converting location", error.message);
        return null;
    }

}
module.exports = convertLocationToCoords;