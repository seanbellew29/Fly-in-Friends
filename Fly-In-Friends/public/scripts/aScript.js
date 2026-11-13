// create the map centered on Dublin
const map = L.map('map').setView([53.3498, -6.2603], 13);

// loads the openStreetMap tiles onto the map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

console.log("window.listings:", window.listings);

// store all markers so we can access them later when clicking listings
const markers = [];

// checks that listings were passed from map.ejs into browser javascript
if (Array.isArray(window.listings)) {
    window.listings.forEach((listing, index) => {
        console.log("Single listing:", listing);
        console.log("Lat:", listing.latitude, "Lng:", listing.longitude);

        // only creates a marker if valid coordinates actually exist
        const lat = Number(listing.latitude);
        const lng = Number(listing.longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
            const marker = L.marker([lat, lng])
                .addTo(map)
                .bindPopup(`
                    <b>${listing.title}</b><br>
                    Location: ${listing.location}<br>
                    Activity: ${listing.activity}
                `);

            // save marker in array using same index as listing
            markers[index] = marker;
        }
    });
}

// selects all listing elements on the right-hand side
const listingElements = document.querySelectorAll(".listing");

// adds click event so when user clicks a listing, map moves to that marker
listingElements.forEach((element) => {
    element.addEventListener("click", () => {

        // get the index of the clicked listing
        const index = Number(element.dataset.index);

        // find corresponding marker
        const marker = markers[index];

        if (marker) {
            const latLng = marker.getLatLng();

            // move map to marker location (smooth animation)
            map.flyTo(latLng, 16, {
                animate: true,
                duration: 1.5
            });

            // open popup for that marker
            marker.openPopup();
        }
    });
});