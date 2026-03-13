
const map = L.map('map').setView([53.3498, -6.2603], 13);


L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);


const locations = [
    { name: "Temple Bar Meetup", lat: 53.3453, lng: -6.2641, desc: "Drinks and music with locals." },
    { name: "Dublin Castle Tour", lat: 53.3430, lng: -6.2673, desc: "Explore the historic castle." },
    { name: "River Liffey Walk", lat: 53.3478, lng: -6.2597, desc: "Casual evening walk." }
];

locations.forEach(loc => {
    L.marker([loc.lat, loc.lng])
        .addTo(map)
        .bindPopup(`<b>📍 ${loc.name}</b><br>${loc.desc}`);
});
