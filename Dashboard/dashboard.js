function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const menuIcon = document.querySelector('.menu-icon');
    
    sidebar.classList.toggle('closed');
    menuIcon.classList.toggle('open');
    
    // Ensure main-content adjusts accordingly
    if (sidebar.classList.contains('closed')) {
        mainContent.style.marginLeft = '70px';
        mainContent.style.width = 'calc(100% - 70px)';
    } else {
        mainContent.style.marginLeft = '260px';
        mainContent.style.width = 'calc(100% - 260px)';
    }
}

function navigate(url) {
    window.location.href = url;
}

function loadContent(page) {
    const contentContainer = document.getElementById('dynamic-content');
    fetch(page)
        .then(response => response.text())
        .then(data => {
            contentContainer.innerHTML = data;
        })
        .catch(error => {
            console.error('Error loading content:', error);
            contentContainer.innerHTML = '<p>Error loading content. Please try again later.</p>';
        });
}

function initializeSidebar() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const url = this.getAttribute('data-url');
            if (url) {
                navigate(url);
            }
        });
    });
}


function loadPropertyData() {
    fetch('http://localhost:4000/api/properties')
        .then(response => response.json())
        .then(properties => {
            displayProperties(properties);
        })
        .catch(error => {
            document.getElementById('dynamic-content').innerHTML = '<p>Error fetching properties. Please try again later.</p>';
        });
}

function displayProperties(properties) {
    const container = document.getElementById('dynamic-content');
    if (Array.isArray(properties) && properties.length > 0) {
        container.innerHTML = `
            <div class="row">
        ${properties.map(property => `
            <div class="col-lg-4 col-md-6 mb-4">
            <div class="property-item rounded overflow-hidden">
        <div class="position-relative overflow-hidden">
            <img class="img-fluid" src="${property.photos[0]}" alt="${property.building}">
        </div>
        <div class="p-4 pb-0">
            <h6 class="text-primary mb-3">₹ ${property.rent.toLocaleString()}</h6>
            <div class="property-header d-flex justify-content-between">
                <a class="property-name" href="#">${property.building}</a>
                <p class="property-location">
                    <i class="fa fa-map-marker-alt text-primary"></i> ${property.location}
                </p>
            </div>
            <div class="short-details">
                <div class="short-detail-item">
                    <strong>Size:</strong> ${property.size}
                </div>
                <div class="short-detail-item">
                    <strong>Area:</strong> ${property.area} Sqft
                </div>
                <div class="short-detail-item">
                    <strong>Face:</strong> ${property.face}
                </div>
            </div>
            <div class="more-details">
                <p><strong>Type:</strong> ${property.type}</p>
                <p><strong>Location:</strong> ${property.location}</p>
                <p><strong>Building:</strong> ${property.building}</p>
                <p><strong>Building Details:</strong> ${property.buildingDetails}</p>
                <p><strong>Advance:</strong> ₹${property.advance.toLocaleString()}</p>
                <p><strong>Inner Facilities:</strong> ${property.innerFacilities}</p>
                <p><strong>Nearby Facilities:</strong> ${property.nearbyFacilities}</p>
            </div>
            <button class="show-details-btn" onclick="toggleDetails(this)">More Details</button>
        </div>
    </div>

    </div>
`).join('')}
</div>
        `;
    } else {
        container.innerHTML = '<p>No properties available at the moment.</p>';
    }
}

function toggleDetails(button) {
    const propertyItem = button.closest('.property-item');
    const moreDetails = propertyItem.querySelector('.more-details');
    const isVisible = moreDetails.style.display === 'block';
    
    moreDetails.style.display = isVisible ? 'none' : 'block';
    button.textContent = isVisible ? 'More Details' : 'Hide Details';
}

document.addEventListener('DOMContentLoaded', () => {
    initializeSidebar();
    loadPropertyData();

    document.getElementById('owner-button').addEventListener('click', () => {
        loadContent('./Dashboard/addproperty.html');  // Replace with actual path to owner content
    });

    document.getElementById('tenant-button').addEventListener('click', () => {
        loadContent('./Dashboard/tenant.html'); 
    });
});

