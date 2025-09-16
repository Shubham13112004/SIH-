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

    // --- App State & Map Variables ---
    let map;
    let drawnItems;
    let drawControl;
    let rainwaterChart;
    let savingsChart;
    let currentDrawingMode = 'roof'; // Tracks what the user is drawing: 'roof' or 'openSpace'
    let locationMarker; // To hold the draggable marker
    let accuracyCircle; // To show the accuracy radius

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

    // --- Geolocation and Map Initialization ---
    function showPosition(position) {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const accuracy = position.coords.accuracy; // Get accuracy in meters
        mapContainer.style.display = 'block';

        if (!map) {
            map = L.map('map').setView([lat, lon], 19);

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
                    polygon: {
                        allowIntersection: false, showArea: true,
                        shapeOptions: { color: '#00ff00' }
                    },
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
            map.setView([lat, lon], 19);
        }

        if (locationMarker) map.removeLayer(locationMarker);
        if (accuracyCircle) map.removeLayer(accuracyCircle);

        locationMarker = L.marker([lat, lon], { draggable: true }).addTo(map);
        locationMarker.bindPopup(`<b>Your Estimated Location</b><br>Drag this marker to fine-tune the position.<br>Accuracy: ${accuracy.toFixed(0)} meters`).openPopup();
        
        accuracyCircle = L.circle([lat, lon], { radius: accuracy }).addTo(map);

        locationMarker.on('dragend', function(event) {
            const newPosition = event.target.getLatLng();
            if (accuracyCircle) {
                map.removeLayer(accuracyCircle);
                accuracyCircle = null;
            }
            locationMarker.bindPopup(`<b>Corrected Location</b>`).openPopup();
            updateLocationData(newPosition.lat, newPosition.lng);
        });

        updateLocationData(lat, lon);
    }

    function updateLocationData(lat, lon) {
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
            .then(response => response.json())
            .then(data => { userLocationInput.value = data?.display_name || `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`; })
            .catch(error => { console.error('Error fetching address:', error); });
        
        fetchAnnualRainfall(lat, lon);
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
        const imdApiKey = "4EBAfojZSGSB1OBbT4x8N9admDl0sqL0HUuvz9lo"; // <-- PASTE YOUR IMD API KEY HERE

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
    document.getElementById('calculatePotentialBtn').addEventListener('click', () => {
        const roofArea = parseFloat(roofAreaInput.value);
        const annualRainfall = parseFloat(annualRainfallInput.value);
        const roofType = document.getElementById('roofType').value;
        const soilType = document.getElementById('soilType').value;
        const openSpace = parseFloat(openSpaceInput.value);
        const userName = document.getElementById('userName').value || "User";
        const dwellersCount = parseInt(document.getElementById('dwellersCount').value) || 4;
        const currentWaterBill = parseFloat(document.getElementById('currentWaterBill').value) || 2000;

        if (!roofArea || !annualRainfall || !roofType || !soilType || !openSpace) {
            alert('Please fill all required fields in the Assessment, Roof, and Site tabs.');
            return;
        }

        const runoffCoefficients = { concrete: 0.8, metal: 0.9, tiled: 0.85, thatched: 0.4 };
        const runoffCoefficient = runoffCoefficients[roofType];
        const harvestableWater = roofArea * (annualRainfall / 1000) * runoffCoefficient * 1000;

        let recommendedStructure = 'Recharge Pit';
        let structureDescription = 'Good for sandy and loamy soils.';
        if (soilType === 'clay' && openSpace < 20) recommendedStructure = 'Storage Tank';
        else if (soilType === 'rocky') recommendedStructure = 'Storage Tank';
        else if (openSpace > 50) recommendedStructure = 'Recharge Trench';

        const estimatedCost = 500 * roofArea;

        document.getElementById('resultUserName').textContent = userName;
        document.getElementById('harvestableWater').innerHTML = `${Math.round(harvestableWater).toLocaleString()} <small>Liters</small>`;
        document.getElementById('recommendedStructure').textContent = recommendedStructure;
        document.getElementById('structureDescription').textContent = structureDescription;
        document.getElementById('estimatedCost').textContent = `₹${estimatedCost.toLocaleString()}`;

        const feasibilityScore = Math.min(95, Math.round((harvestableWater / 100000) * 50 + (openSpace > 10 ? 25 : 5) + (soilType === 'sandy' || soilType === 'loamy' ? 20 : 5)));
        const feasibilityProgress = document.getElementById('feasibilityProgress');
        feasibilityProgress.style.width = `${feasibilityScore}%`;
        feasibilityProgress.textContent = `${feasibilityScore}% Feasible`;
        feasibilityProgress.className = `progress-bar ${feasibilityScore < 50 ? 'bg-warning' : 'bg-success'}`;
        
        const utilizationRate = (parseFloat(document.getElementById('utilizationRate').value) || 70) / 100;
        const annualWaterDemand = dwellersCount * 135 * 365;
        const waterUtilized = harvestableWater * utilizationRate;
        const percentDemandMet = Math.min(1, waterUtilized / annualWaterDemand);
        const annualSavings = (currentWaterBill * 12) * percentDemandMet;

        let paybackPeriodText = "Over 15 Years";
        if (annualSavings > 0) {
            const paybackPeriodYears = estimatedCost / annualSavings;
            if (paybackPeriodYears <= 15) paybackPeriodText = paybackPeriodYears.toFixed(1) + " Years";
        }

        document.getElementById('costMaterials').textContent = `₹${(estimatedCost * 0.6).toLocaleString()}`;
        document.getElementById('costLabor').textContent = `₹${(estimatedCost * 0.3).toLocaleString()}`;
        document.getElementById('costMisc').textContent = `₹${(estimatedCost * 0.1).toLocaleString()}`;
        document.getElementById('costTotal').textContent = `₹${estimatedCost.toLocaleString()}`;
        document.getElementById('savingsWater').textContent = `₹${Math.round(annualSavings).toLocaleString()}`;
        document.getElementById('paybackPeriod').textContent = paybackPeriodText;

        const monthlyDistribution = [0.02, 0.03, 0.05, 0.1, 0.2, 0.25, 0.15, 0.1, 0.05, 0.03, 0.01, 0.01];
        const monthlyHarvest = monthlyDistribution.map(fraction => Math.round(harvestableWater * fraction));
        const chartCtx = document.getElementById('rainwaterChart').getContext('2d');
        
        if (rainwaterChart) rainwaterChart.destroy();
        rainwaterChart = new Chart(chartCtx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Potential Harvestable Water (Liters)',
                    data: monthlyHarvest,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: { scales: { y: { beginAtZero: true } }, responsive: true, maintainAspectRatio: false }
        });

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
});

