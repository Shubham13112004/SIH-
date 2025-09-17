// // Initialize Leaflet map
// var map = L.map('map').setView([18.5204, 73.8567], 10); // Default: Pune

// L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     attribution: '© OpenStreetMap'
// }).addTo(map);

// // Function for manual input location
// function setManualLocation() {
//     let location = document.getElementById("manualLocation").value;
//     if (!location) {
//         alert("Please enter a location!");
//         return;
//     }

//     // Use Nominatim (free geocoding API)
//     fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${location}`)
//         .then(res => res.json())
//         .then(data => {
//             if (data.length > 0) {
//                 let lat = data[0].lat;
//                 let lon = data[0].lon;

//                 map.setView([lat, lon], 13);
//                 L.marker([lat, lon]).addTo(map)
//                     .bindPopup(`<b>${location}</b>`).openPopup();
//             } else {
//                 alert("Location not found!");
//             }
//         })
//         .catch(err => console.error(err));
// }

// // Function for live location
// function getLiveLocation() {
//     if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//             position => {
//                 let lat = position.coords.latitude;
//                 let lon = position.coords.longitude;

//                 map.setView([lat, lon], 13);
//                 L.marker([lat, lon]).addTo(map)
//                     .bindPopup("<b>You are here!</b>").openPopup();
//             },
//             error => {
//                 alert("Error fetching live location!");
//                 console.error(error);
//             }
//         );
//     } else {
//         alert("Geolocation not supported by this browser.");
//     }
// }




document.addEventListener('DOMContentLoaded', function() {


// --- I18N (Internationalization) Logic ---

const langDropdown = document.getElementById('lang-dropdown');

const langSelectorBtn = document.getElementById('lang-selector-btn');



const setLanguage = (lang) => {

// Find all elements with the data-i18n-key attribute

const elements = document.querySelectorAll('[data-i18n-key]');


elements.forEach(element => {

const key = element.getAttribute('data-i18n-key');

if (translations[lang] && translations[lang][key]) {

// For elements with children (like the navbar brand), we need to be careful

// not to overwrite icons. We target the last text node.

if (element.children.length > 0 && element.lastChild.nodeType === Node.TEXT_NODE) {

element.lastChild.textContent = ' ' + translations[lang][key];

} else {

element.innerText = translations[lang][key];

}

}

});



// Handle placeholders specifically

const placeholderElements = document.querySelectorAll('[data-i18n-key-placeholder]');

placeholderElements.forEach(element => {

const key = element.getAttribute('data-i18n-key-placeholder');

if (translations[lang] && translations[lang][key]) {

element.placeholder = translations[lang][key];

}

});



// Update the language selector button text

const selectedLangText = langDropdown.querySelector(`[data-lang="${lang}"]`).textContent;

langSelectorBtn.innerHTML = `<i class="fas fa-language me-1"></i> ${selectedLangText}`;


// Save the selected language to local storage

localStorage.setItem('selectedLanguage', lang);


// Set the HTML lang attribute for accessibility

document.documentElement.lang = lang;

};



langDropdown.addEventListener('click', (event) => {

const lang = event.target.getAttribute('data-lang');

if (lang) {

event.preventDefault(); // Prevent the link from navigating

setLanguage(lang);

}

});



// --- On Page Load: Set initial language ---

// Check local storage first, then browser default, then fallback to 'en'

const savedLang = localStorage.getItem('selectedLanguage');

const browserLang = navigator.language.split('-')[0];


// Determine the initial language

let initialLang = 'en'; // Default

if (savedLang) {

initialLang = savedLang;

} else if (translations[browserLang]) {

initialLang = browserLang;

}


setLanguage(initialLang);

// --- End of I18N Logic ---





// ... YOUR EXISTING SCRIPT.JS CODE GOES HERE ...

// e.g., const getLocationBtn = document.getElementById('getLocationBtn'); etc.

// ...



});



document.addEventListener('DOMContentLoaded', function() {


// --- Element Selectors ---

const getLocationBtn = document.getElementById('getLocationBtn');

const drawOpenSpaceBtn = document.getElementById('drawOpenSpaceBtn');

const userLocationInput = document.getElementById('userLocation');

const mapContainer = document.getElementById('map');

const roofAreaInput = document.getElementById('roofArea');

const openSpaceInput = document.getElementById('openSpace');

const areaDisplay = document.getElementById('area-display');

const calculatedAreaSpan = document.getElementById('calculated-area');

const annualRainfallInput = document.getElementById('annualRainfall');

const annualRainfallText = document.querySelector('#annualRainfall + .form-text');
const searchLocationBtn = document.getElementById('searchLocationBtn');



// --- App State & Map Variables ---

let map;

let drawnItems;

let drawControl;

let rainwaterChart;

let savingsChart;

let currentDrawingMode = 'roof'; // Tracks what the user is drawing: 'roof' or 'openSpace'

let locationMarker; // To hold the draggable marker

let accuracyCircle; // To show the accuracy radius
let siteHydroData = null; // To hold data from hydro_data.json



// --- Main Event Listeners ---

getLocationBtn.addEventListener('click', function() {

currentDrawingMode = 'roof'; // Set mode to 'roof'

if (navigator.geolocation) {

userLocationInput.placeholder = "Fetching location...";

navigator.geolocation.getCurrentPosition(showPosition, showError, { enableHighAccuracy: true });

} else {

alert("Geolocation is not supported by this browser.");

}

});



drawOpenSpaceBtn.addEventListener('click', function() {

if (!map) {

alert("Please use the 'Use My Location' button first to initialize the map.");

return;

}

currentDrawingMode = 'openSpace'; // Set mode to 'openSpace'

alert("Drawing mode set to 'Open Space'. Please go to the 'Basic Info & Map' tab to draw the area.");

const basicTab = new bootstrap.Tab(document.getElementById('basic-tab'));

basicTab.show(); // Switch to the map tab

});

// --- Manual Location Search Logic ---
searchLocationBtn.addEventListener('click', manualLocationSearch);
userLocationInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        manualLocationSearch();
    }
});

function manualLocationSearch() {
    const locationQuery = userLocationInput.value;
    if (!locationQuery) {
        alert("Please enter a location to search.");
        return;
    }

    userLocationInput.placeholder = "Searching...";
    searchLocationBtn.disabled = true;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${locationQuery}`)
        .then(res => res.json())
        .then(data => {
            if (data.length > 0) {
                const lat = data[0].lat;
                const lon = data[0].lon;
                const displayName = data[0].display_name;
                
                // This function is the same one used by Geolocation
                showPosition({ 
                    coords: { 
                        latitude: lat, 
                        longitude: lon, 
                        accuracy: 500 // Assume a larger accuracy for searched locations
                    } 
                }, displayName);

            } else {
                alert("Location not found. Please try a different search term.");
                userLocationInput.placeholder = "Enter your location";
            }
        })
        .catch(err => {
            console.error("Error fetching manual location:", err);
            alert("An error occurred while searching for the location.");
        })
        .finally(() => {
            searchLocationBtn.disabled = false;
        });
}

// --- Geolocation and Map Initialization ---
function showPosition(position, manualLocationName = null) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const accuracy = position.coords.accuracy;
    mapContainer.style.display = 'block';

    if (manualLocationName) {
        userLocationInput.value = manualLocationName;
    }

    if (!map) {
        map = L.map('map').setView([lat, lon], 17); // Start with a closer zoom

        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri'
        });
        const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });
        const baseMaps = { "Satellite": satelliteLayer, "Street Map": streetLayer };
        satelliteLayer.addTo(map);
        L.control.layers(baseMaps).addTo(map);

        drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        drawControl = new L.Control.Draw({
            edit: { featureGroup: drawnItems, remove: true },
            draw: {
                polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: '#00ff00' } },
                polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false
            }
        });
        map.addControl(drawControl);

        const handleDraw = (layer) => {
            const area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
            const areaInSqMeters = area.toFixed(2);
            calculatedAreaSpan.textContent = areaInSqMeters;
            areaDisplay.style.display = 'block';
            if (currentDrawingMode === 'roof') {
                roofAreaInput.value = areaInSqMeters;
            } else if (currentDrawingMode === 'openSpace') {
                openSpaceInput.value = areaInSqMeters;
            }
        };

        map.on(L.Draw.Event.CREATED, function (event) {
            drawnItems.clearLayers();
            const layer = event.layer;
            drawnItems.addLayer(layer);
            handleDraw(layer);
        });
        map.on(L.Draw.Event.EDITED, function (event) {
            event.layers.eachLayer(layer => handleDraw(layer));
        });
        map.on(L.Draw.Event.DELETED, function() {
            areaDisplay.style.display = 'none';
            roofAreaInput.value = '';
            openSpaceInput.value = '';
        });
    } else {
        map.setView([lat, lon], 17);
    }

    if (locationMarker) map.removeLayer(locationMarker);
    if (accuracyCircle) map.removeLayer(accuracyCircle);

    locationMarker = L.marker([lat, lon], { draggable: true }).addTo(map);

    if (manualLocationName) {
         locationMarker.bindPopup(`<b>${manualLocationName.split(',')[0]}</b><br>Drag to fine-tune.`).openPopup();
    } else {
        locationMarker.bindPopup(`<b>Your Estimated Location</b><br>Accuracy: ${accuracy.toFixed(0)} meters`).openPopup();
        accuracyCircle = L.circle([lat, lon], { radius: accuracy }).addTo(map);
    }

    locationMarker.on('dragend', function(event) {
        const newPosition = event.target.getLatLng();
        if (accuracyCircle) {
            map.removeLayer(accuracyCircle);
            accuracyCircle = null;
        }
        locationMarker.bindPopup(`<b>Corrected Location</b>`).openPopup();
        updateLocationData(newPosition.lat, newPosition.lng);
    });
    
    // Only call this if it's NOT a manual search, otherwise we already have the name.
    if (!manualLocationName) {
        updateLocationData(lat, lon);
    } else {
        fetchAnnualRainfall(lat, lon); // Still fetch rainfall for the new manual location
    }
}



function updateLocationData(lat, lon) {
    // 1. Fetch address and hydro data from Nominatim in one go
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
        .then(response => response.json())
        .then(data => {
            const address = data?.display_name || `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;
            userLocationInput.value = address;
            
            // **IMPROVED LOGIC**: Extract district/city from structured address data
            const addressDetails = data.address;
            const district = addressDetails.state_district || addressDetails.city || addressDetails.town || addressDetails.village;
            
            console.log("Detected District/City:", district); // For debugging
            
            if (district) {
                fetchHydroData(district);
            } else {
                // Clear hydro fields if no district is found
                siteHydroData = null; 
                document.getElementById('aquiferType').value = 'Could not determine district.';
                document.getElementById('regionalWaterDepth').value = 'N/A';
            }
        })
        .catch(error => { console.error('Error fetching address:', error); });

    // 2. Fetch rainfall data
    fetchAnnualRainfall(lat, lon);
}

// This function is now simpler, as it receives a clean district name
function fetchHydroData(districtName) {
    fetch('hydro_data.json')
        .then(response => response.json())
        .then(data => {
            const districts = data.Maharashtra;
            const foundDistrict = districts.find(d => districtName.toLowerCase().includes(d.district.toLowerCase()));
            
            if (foundDistrict) {
                siteHydroData = foundDistrict;
                document.getElementById('aquiferType').value = siteHydroData.aquifer_type;
                document.getElementById('regionalWaterDepth').value = `${siteHydroData.pre_monsoon_depth_m} m`;
                if (!document.getElementById('waterTableDepth').value) {
                    const avgDepth = siteHydroData.pre_monsoon_depth_m.split('-').reduce((a, b) => +a + +b, 0) / 2;
                    document.getElementById('waterTableDepth').value = avgDepth;
                }
            } else {
                siteHydroData = null;
                document.getElementById('aquiferType').value = 'No hydro data for this district.';
                document.getElementById('regionalWaterDepth').value = 'N/A';
            }
        })
        .catch(error => console.error('Error fetching hydro data:', error));
}

// New function to get and display hydrogeological data
function fetchHydroData(address) {
    fetch('hydro_data.json')
        .then(response => response.json())
        .then(data => {
            const districts = data.Maharashtra;
            // Find the first district that is mentioned in the address string
            const foundDistrict = districts.find(d => address.toLowerCase().includes(d.district.toLowerCase()));
            
            if (foundDistrict) {
                siteHydroData = foundDistrict; // Store the data
                document.getElementById('aquiferType').value = siteHydroData.aquifer_type;
                document.getElementById('regionalWaterDepth').value = `${siteHydroData.pre_monsoon_depth_m} m`;
                // Also update the main water table input if it's empty
                if (!document.getElementById('waterTableDepth').value) {
                    const avgDepth = siteHydroData.pre_monsoon_depth_m.split('-').reduce((a, b) => +a + +b, 0) / 2;
                    document.getElementById('waterTableDepth').value = avgDepth;
                }
            } else {
                siteHydroData = null; // Reset if no data found
                document.getElementById('aquiferType').value = 'No data for this specific area.';
                document.getElementById('regionalWaterDepth').value = 'N/A';
            }
        })
        .catch(error => console.error('Error fetching hydro data:', error));
}



function showError(error) {

userLocationInput.placeholder = "Enter your location";

let message = "An unknown error occurred.";

if (error.code === error.PERMISSION_DENIED) message = "User denied the request for Geolocation.";

else if (error.code === error.POSITION_UNAVAILABLE) message = "Location information is unavailable.";

else if (error.code === error.TIMEOUT) message = "The request to get user location timed out.";

const errorDiv = document.createElement('div');

errorDiv.className = 'alert alert-danger m-3';

errorDiv.textContent = message;

document.querySelector('#basic').prepend(errorDiv);

setTimeout(() => errorDiv.remove(), 5000);

}


// --- IMD API Function ---

async function fetchAnnualRainfall(lat, lon) {

// IMPORTANT: Paste your registered IMD API Key here.

const imdApiKey = "sk-live-4EBAfojZSGSB1OBbT4x8N9admDl0sqL0HUuvz9lo"; // <-- PASTE YOUR IMD API KEY HERE



if (!imdApiKey) {

console.error("IMD API key is missing.");

annualRainfallInput.value = '1200'; // Revert to default

annualRainfallText.textContent = 'IMD API key not provided. Using a default value.';

return;

}



annualRainfallInput.value = '';

annualRainfallText.textContent = 'Fetching historical rainfall data from IMD...';



const currentYear = new Date().getFullYear();

const startDate = `${currentYear - 6}-01-01`;

const endDate = `${currentYear - 1}-12-31`;



// NOTE: This is a representative URL. Please adjust based on official IMD documentation.

const apiUrl = `https://api.imd.gov.in/v1/climate/daily-rainfall?lat=${lat}&lon=${lon}&start=${startDate}&end=${endDate}`;



try {

const response = await fetch(apiUrl, {

headers: {

// Assuming the key is sent in a header. Adjust if it's a query parameter.

'apikey': imdApiKey

}

});



if (!response.ok) {

throw new Error(`API responded with status: ${response.status}`);

}

const data = await response.json();


// NOTE: This logic assumes a specific JSON structure. Adjust based on the actual IMD API response.

// Example structure: { "data": [{"date": "2020-01-01", "rainfall_mm": 5.2}, ...] }

if (!data.data || !Array.isArray(data.data)) {

throw new Error('Invalid data structure from IMD API.');

}



const totalPrecipitation = data.data.reduce((sum, day) => sum + (day.rainfall_mm || 0), 0);


const numberOfYears = 5;

const averageRainfall = totalPrecipitation / numberOfYears;



if (averageRainfall > 0) {

annualRainfallInput.value = Math.round(averageRainfall);

annualRainfallText.textContent = `Data from IMD (5-year avg). Please verify and edit if needed.`;

} else {

throw new Error('No rainfall data available from IMD for this location.');

}



} catch (error) {

console.error('Failed to fetch rainfall data from IMD:', error);

annualRainfallInput.value = '1200';

annualRainfallText.textContent = 'Could not fetch IMD data. Using a default value.';

}

}





// --- Tab Switching Logic ---

document.getElementById('nextToRoofBtn').addEventListener('click', () => new bootstrap.Tab(document.getElementById('roof-tab')).show());

document.getElementById('prevToBasicBtn').addEventListener('click', () => new bootstrap.Tab(document.getElementById('basic-tab')).show());

document.getElementById('nextToSiteBtn').addEventListener('click', () => new bootstrap.Tab(document.getElementById('site-tab')).show());

document.getElementById('prevToRoofBtn').addEventListener('click', () => new bootstrap.Tab(document.getElementById('roof-tab')).show());



// --- Main Calculation Logic ---
// --- Main Calculation Engine ---
// --- Main Calculation Engine (VERSION 3 - WITH COST-BENEFIT ANALYSIS) ---
document.getElementById('calculatePotentialBtn').addEventListener('click', () => {
    // --- 1. GATHER ALL INPUTS ---
    const roofArea = parseFloat(roofAreaInput.value);
    const annualRainfall = parseFloat(annualRainfallInput.value);
    const roofType = document.getElementById('roofType').value;
    const soilType = document.getElementById('soilType').value;
    const openSpace = parseFloat(openSpaceInput.value);
    const userName = document.getElementById('userName').value || "User";
    const dwellersCount = parseInt(document.getElementById('dwellersCount').value) || 4;
    const currentWaterBill = parseFloat(document.getElementById('currentWaterBill').value) || 2000;

    // Basic Validation
    if (!roofArea || !annualRainfall || !roofType || !soilType) {
        alert('Please fill all required fields in the Assessment, Roof, and Site tabs.');
        return;
    }

    // --- 2. DEFINE COEFFICIENTS & FACTORS ---
    const runoffCoefficients = { concrete: 0.8, metal: 0.9, tiled: 0.85, thatched: 0.4 };
    const infiltrationFactors = { sandy: 0.5, clay: 0.1, loamy: 0.35, rocky: 0.05 };
    
    // --- 3. RUNOFF ENGINE CALCULATIONS ---
    const runoffCoefficient = runoffCoefficients[roofType];
    const potentialRunoffM3 = roofArea * (annualRainfall / 1000) * runoffCoefficient;
    const potentialRunoffLiters = potentialRunoffM3 * 1000;
    const storageTankLiters = dwellersCount * 10 * 30; // 30 days of drinking/cooking water

    // --- 4. RECHARGE ENGINE CALCULATIONS ---
    const infiltrationFactor = infiltrationFactors[soilType];
    const potentialRechargeM3 = potentialRunoffM3 * infiltrationFactor;
    const potentialRechargeLiters = potentialRechargeM3 * 1000;

    // --- 5. STRUCTURE & FEASIBILITY LOGIC ---
    let recommendedStructure, structureDescription, feasibilityScore;
    if (infiltrationFactor < 0.15) { // Clay or Rocky soil
        recommendedStructure = 'Storage Tank';
        structureDescription = 'Infiltration is poor. Storing water is recommended.';
        feasibilityScore = Math.min(95, Math.round((potentialRunoffLiters / 200000) * 60 + 20));
    } else if (openSpace > 50) {
        recommendedStructure = 'Recharge Trench';
        structureDescription = 'Ideal for large areas with suitable soil.';
        feasibilityScore = Math.min(95, Math.round((potentialRechargeLiters / 200000) * 70 + 25));
    } else {
        recommendedStructure = 'Recharge Pit';
        structureDescription = 'Good for smaller spaces with suitable soil.';
        feasibilityScore = Math.min(95, Math.round((potentialRechargeLiters / 200000) * 60 + 20));
    }
    
    // --- 6. COST-BENEFIT ANALYSIS ENGINE ---
    let estimatedCost = 0;
    let annualSavings = 0;
    
    // Calculate cost based on the recommended structure
    if (recommendedStructure === 'Storage Tank') {
        estimatedCost = storageTankLiters * 8; // Approx. ₹8 per liter for a tank
    } else if (recommendedStructure === 'Recharge Trench') {
        estimatedCost = 15000 + (potentialRechargeM3 * 1200); // Base cost + volume cost
    } else { // Recharge Pit
        estimatedCost = 5000 + (potentialRechargeM3 * 1500); // Base cost + volume cost
    }
    
    // Calculate savings based on structure type
    const annualWaterBill = currentWaterBill * 12;
    if (recommendedStructure === 'Storage Tank') {
        // Savings are direct by using stored water. Assume 80% of runoff is utilized.
        const waterUtilizedLiters = potentialRunoffLiters * 0.8;
        const annualWaterDemand = dwellersCount * 135 * 365; // Total water demand
        const percentDemandMet = Math.min(1, waterUtilizedLiters / annualWaterDemand);
        annualSavings = annualWaterBill * percentDemandMet;
    } else {
        // Savings are indirect via reduced water tanker costs and improved groundwater.
        // Assume a conservative 25% reduction in annual water bill.
        annualSavings = annualWaterBill * 0.25;
    }

    // Calculate Payback Period
    let paybackPeriodText = "Over 15 Years";
    if (annualSavings > 0) {
        const paybackYears = estimatedCost / annualSavings;
        if (paybackYears <= 15) {
            paybackPeriodText = paybackYears.toFixed(1) + " Years";
        }
    }

    // --- 7. UPDATE THE UI (ALL SECTIONS) ---
    document.getElementById('resultUserName').textContent = userName;
    
    // Feasibility Progress Bar
    const feasibilityProgress = document.getElementById('feasibilityProgress');
    feasibilityProgress.style.width = `${feasibilityScore}%`;
    feasibilityProgress.textContent = `${feasibilityScore}% Feasible`;
    feasibilityProgress.className = `progress-bar ${feasibilityScore < 50 ? 'bg-warning' : 'bg-success'}`;
    
    // Runoff & Recharge Engines
    document.getElementById('potentialRunoff').innerHTML = `${Math.round(potentialRunoffLiters).toLocaleString()} <small>Liters</small>`;
    document.getElementById('storageTankSize').innerHTML = `${storageTankLiters.toLocaleString()} <small>Liters</small>`;
    document.getElementById('potentialRecharge').innerHTML = `${Math.round(potentialRechargeLiters).toLocaleString()} <small>Liters</small>`;
    document.getElementById('recommendedStructure').textContent = recommendedStructure;
    document.getElementById('structureDescription').textContent = structureDescription;

    // Hydrogeology Card
    if (siteHydroData) {
        document.getElementById('resultAquiferType').textContent = siteHydroData.aquifer_type;
        document.getElementById('resultPreMonsoonDepth').textContent = `${siteHydroData.pre_monsoon_depth_m} meters`;
        document.getElementById('resultPostMonsoonDepth').textContent = `${siteHydroData.post_monsoon_depth_m} meters`;
        document.getElementById('resultSuitability').textContent = siteHydroData.suitability;
    }

    // Cost-Benefit Analysis Card (THE FIX)
    document.getElementById('costMaterials').textContent = `₹${Math.round(estimatedCost * 0.6).toLocaleString()}`;
    document.getElementById('costLabor').textContent = `₹${Math.round(estimatedCost * 0.3).toLocaleString()}`;
    document.getElementById('costMisc').textContent = `₹${Math.round(estimatedCost * 0.1).toLocaleString()}`;
    document.getElementById('costTotal').textContent = `₹${Math.round(estimatedCost).toLocaleString()}`;
    document.getElementById('savingsWater').textContent = `₹${Math.round(annualSavings).toLocaleString()}`;
    document.getElementById('paybackPeriod').textContent = paybackPeriodText;
    
    // Update Chart
    const monthlyDistribution = [0.02, 0.03, 0.05, 0.1, 0.2, 0.25, 0.15, 0.1, 0.05, 0.03, 0.01, 0.01];
    const monthlyHarvest = monthlyDistribution.map(fraction => Math.round(potentialRunoffLiters * fraction));
    const chartCtx = document.getElementById('rainwaterChart').getContext('2d');
    if (rainwaterChart) rainwaterChart.destroy();
    rainwaterChart = new Chart(chartCtx, {
        type: 'bar', data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{ label: 'Monthly Rooftop Runoff Potential (Liters)', data: monthlyHarvest, backgroundColor: 'rgba(54, 162, 235, 0.6)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1 }]
        }, options: { scales: { y: { beginAtZero: true } }, responsive: true, maintainAspectRatio: false }
    });

    // Show results and scroll to them
    const resultsSection = document.getElementById('results');
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
});

// --- Savings Calculator Logic ---

document.getElementById('calculateSavingsBtn').addEventListener('click', () => {

const estimatedCost = parseFloat(document.getElementById('costTotal').textContent.replace(/[^0-9.-]+/g,""));

const annualSavings = parseFloat(document.getElementById('savingsWater').textContent.replace(/[^0-9.-]+/g,""));


if (isNaN(estimatedCost) || isNaN(annualSavings) || estimatedCost === 0) {

alert("Please calculate the main potential first to get cost and savings data.");

return;

}



const savings5Years = annualSavings * 5;

const savings10Years = annualSavings * 10;


document.getElementById('savings5Years').textContent = `₹${Math.round(savings5Years).toLocaleString()}`;

document.getElementById('savings10Years').textContent = `₹${Math.round(savings10Years).toLocaleString()}`;



const savingsCtx = document.getElementById('savingsChart').getContext('2d');

const years = Array.from({length: 11}, (_, i) => `Year ${i}`);

const cumulativeSavings = years.map((_, i) => Math.round(annualSavings * i));



if(savingsChart) savingsChart.destroy();

savingsChart = new Chart(savingsCtx, {

type: 'line',

data: {

labels: years,

datasets: [{

label: 'Cumulative Savings (₹)',

data: cumulativeSavings,

borderColor: 'rgba(75, 192, 192, 1)',

backgroundColor: 'rgba(75, 192, 192, 0.2)',

fill: true,

tension: 0.1

}]

},

options: { scales: { y: { beginAtZero: true } }, responsive: true, maintainAspectRatio: false }

});



document.getElementById('savingsResults').style.display = 'block';

});
// ... inside the DOMContentLoaded event listener ...

    // --- PDF Report Generation Logic ---
   // --- PDF Report Generation Logic (VERSION 2 - Updated for New Engine) ---
document.getElementById('downloadReportBtn').addEventListener('click', generateReport);

function generateReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // --- 1. GATHER DATA FROM THE NEW & CORRECT HTML IDs ---
    const userName = document.getElementById('userName').value || "User";
    const userLocation = document.getElementById('userLocation').value || "Not specified";
    const dwellersCount = document.getElementById('dwellersCount').value || "N/A";
    const roofArea = document.getElementById('roofArea').value;
    const annualRainfall = document.getElementById('annualRainfall').value;
    const roofType = document.getElementById('roofType').selectedOptions[0].text;
    const soilType = document.getElementById('soilType').selectedOptions[0].text;
    
    // **FIX**: Reading from the new Runoff & Recharge IDs
    const potentialRunoff = document.getElementById('potentialRunoff').textContent;
    const potentialRecharge = document.getElementById('potentialRecharge').textContent;
    const feasibilityText = document.getElementById('feasibilityProgress').textContent;
    const recommendedStructure = document.getElementById('recommendedStructure').textContent;
    
    // **FIX**: Reading from the new Hydrogeology Card IDs
    const aquiferType = document.getElementById('resultAquiferType').textContent;
    const preMonsoonDepth = document.getElementById('resultPreMonsoonDepth').textContent;

    // Reading from the Cost-Benefit Analysis section (which is now working)
    const totalCost = document.getElementById('costTotal').textContent;
    const annualSavings = document.getElementById('savingsWater').textContent;
    const paybackPeriod = document.getElementById('paybackPeriod').textContent;
    
    const currentDate = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    let yPosition = 20;

    // --- 2. BUILD THE PDF DOCUMENT (with updated fields) ---
    // Report Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Rainwater Harvesting Assessment Report", 105, yPosition, { align: 'center' });
    yPosition += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Report for: ${userName} | Generated on: ${currentDate}`, 105, yPosition, { align: 'center' });
    yPosition += 7;
    doc.text(`Location: ${userLocation}`, 105, yPosition, { align: 'center' });
    yPosition += 8;
    doc.line(15, yPosition, 195, yPosition);
    yPosition += 12;

    // Input Parameters
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("1. Input Parameters", 15, yPosition);
    yPosition += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Rooftop Area: ${roofArea} sq. meters`, 20, yPosition);
    yPosition += 7;
    doc.text(`Average Annual Rainfall: ${annualRainfall} mm`, 20, yPosition);
    yPosition += 7;
    doc.text(`Roof Type: ${roofType}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Soil Type: ${soilType}`, 20, yPosition);
    yPosition += 12;

    // Assessment Results
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("2. Assessment Results", 15, yPosition);
    yPosition += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Annual Rooftop Runoff Potential: ${potentialRunoff}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Annual Groundwater Recharge Potential: ${potentialRecharge}`, 20, yPosition);
    yPosition += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`Recommended Structure: ${recommendedStructure}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Project Feasibility Score: ${feasibilityText}`, 20, yPosition);
    yPosition += 12;

    // Hydrogeological Context
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("3. Hydrogeological Context", 15, yPosition);
    yPosition += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Principal Aquifer System: ${aquiferType}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Typical Pre-Monsoon Water Depth: ${preMonsoonDepth}`, 20, yPosition);
    yPosition += 12;
    
    // Financial Analysis
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("4. Financial Analysis", 15, yPosition);
    yPosition += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Estimated Initial Investment: ${totalCost}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Estimated Annual Savings: ${annualSavings}`, 20, yPosition);
    yPosition += 7;
    doc.setFont("helvetica", "bold");
    doc.text(`Estimated Payback Period: ${paybackPeriod}`, 20, yPosition);
    yPosition += 15;

    // Footer
    doc.line(15, yPosition, 195, yPosition);
    yPosition += 7;
    doc.setFontSize(10);
    doc.text("This report is generated based on user-provided data and standardized calculations.", 105, yPosition, { align: 'center' });
    yPosition += 5;
    doc.text("Developed based on CGWB guidelines.", 105, yPosition, { align: 'center' });

    // --- 3. SAVE THE PDF ---
    doc.save(`RWH_Report_${userName.replace(/\s/g, '_')}.pdf`);
}



    // This should be the last line of the DOMContentLoaded listener
});