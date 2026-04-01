//creates the leaflet map and centers it on dublin
const map = L.map('map').setView([53.3498, -6.2603], 13);

//loads the openStreetMap tiles ontot the map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

console.log("window.listings:", window.listings);

//checks that listings were pssed from map.ejs into browser javascript
if (Array.isArray(window.listings)) {
    window.listings.forEach((listing) => {
        console.log("Single listing:", listing);
        console.log("Lat:", listing.latitude, "Lng:", listing.longitude);

        //only creates a marker if valid coordinates actually exists
        if (listing.latitude != null && listing.longitude != null) {
            L.marker([Number(listing.latitude), Number(listing.longitude)])
                .addTo(map)
                .bindPopup(`
                    <b>${listing.title}</b><br>
                    Location: ${listing.location}<br>
                    Activity: ${listing.activity}
                `);
        }
    });
}