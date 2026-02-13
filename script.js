let map;
let loadedData = [];
let currentCategory = '';
let filteredList = [];

const COMPANY_POS = { lat: 37.5069766, lng: 127.0396220 };
const categoryOrder = ['한식', '중식', '돈까스·회·일식', '버거·양식', '아시안', '분식', '디저트·카페', '샐러드', '기타'];

const ui = {
    categoryContainer: document.getElementById('category-container'),
    restaurants: document.getElementById('restaurants'),
    details: document.getElementById('details'),
    map: document.getElementById('map'),
    images: document.getElementById('images'),
    searchInput: document.getElementById('search-input'),
    sortSelect: document.getElementById('sort-select'),
    includeClosed: document.getElementById('include-closed'),
    randomPick: document.getElementById('random-pick'),
    summaryTotal: document.getElementById('summary-total'),
    summaryCategory: document.getElementById('summary-category'),
    summaryFilter: document.getElementById('summary-filter')
};

Papa.parse('lunch.csv', {
    download: true,
    header: true,
    complete: function(results) {
        loadedData = results.data.filter((row) => row['식당명']);
        populateCategories(loadedData);
        attachControlEvents();
        updateSummary();
    }
});

window.onload = function() {
    document.getElementById('collective-intelligence').addEventListener('click', resetPage);
};

function attachControlEvents() {
    ui.searchInput.addEventListener('input', applyFilters);
    ui.sortSelect.addEventListener('change', applyFilters);
    ui.includeClosed.addEventListener('change', applyFilters);
    ui.randomPick.addEventListener('click', pickRandomRestaurant);
}

function resetPage() {
    currentCategory = '';
    filteredList = [];

    ui.restaurants.style.display = 'none';
    ui.restaurants.innerHTML = '';
    ui.details.style.display = 'none';
    ui.map.style.display = 'none';
    ui.images.style.display = 'none';
    ui.searchInput.value = '';
    ui.sortSelect.value = 'default';
    ui.includeClosed.checked = false;

    document.querySelectorAll('#category-container button.active').forEach((button) => {
        button.classList.remove('active');
    });

    updateSummary();
}

function populateCategories(data) {
    const categories = [...new Set(data.map((row) => row['분류']).filter(Boolean))];
    const orderedCategories = categoryOrder.filter((category) => categories.includes(category));

    orderedCategories.forEach((category) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.value = category;
        button.textContent = category;
        button.addEventListener('click', (e) => {
            e.preventDefault();
            ui.categoryContainer.querySelectorAll('button').forEach((btn) => btn.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = category;
            applyFilters();
        });
        ui.categoryContainer.appendChild(button);
    });
}

function applyFilters() {
    if (!currentCategory) {
        return;
    }

    const query = ui.searchInput.value.trim().toLowerCase();
    const includeClosed = ui.includeClosed.checked;

    filteredList = loadedData.filter((row) => row['분류'] === currentCategory)
        .filter((row) => includeClosed || !isClosed(row['폐업']))
        .filter((row) => {
            if (!query) {
                return true;
            }

            const searchTarget = `${row['식당명'] || ''} ${row['메뉴'] || ''}`.toLowerCase();
            return searchTarget.includes(query);
        });

    filteredList = sortRestaurants(filteredList, ui.sortSelect.value);
    renderRestaurantList(filteredList);
    updateSummary(query);
}

function renderRestaurantList(restaurants) {
    ui.restaurants.style.display = 'block';
    ui.restaurants.innerHTML = '';

    if (restaurants.length === 0) {
        const emptyState = document.createElement('li');
        emptyState.className = 'empty-state';
        emptyState.textContent = '조건에 맞는 식당이 없어요. 검색어나 필터를 바꿔보세요.';
        ui.restaurants.appendChild(emptyState);
        return;
    }

    restaurants.forEach((row) => {
        const listItem = document.createElement('li');
        listItem.className = 'restaurant-item';
        listItem.innerHTML = `
            <div class="restaurant-title">${row['식당명']}</div>
            <div class="restaurant-meta">${row['메뉴'] || '메뉴 정보 없음'}</div>
            <div class="restaurant-sub">${row['이동시간'] || '-'} · ${row['이동거리'] || '-'}</div>
        `;
        listItem.addEventListener('click', () => showDetails(row));
        ui.restaurants.appendChild(listItem);
    });
}

function showDetails(restaurant) {
    ui.details.innerHTML = `
        <a href="${restaurant['링크']}" target="_blank" rel="noopener noreferrer" id="details-link">
            <h3>${restaurant['식당명']}</h3>
            <p>메뉴: ${restaurant['메뉴']}</p>
            <p>가격: ${restaurant['가격']}</p>
            <p>이동시간: ${restaurant['이동시간']}</p>
            <p>이동거리: ${restaurant['이동거리']}</p>
            <p>횡단보도 수: ${restaurant['횡단보도']}</p>
        </a>
    `;

    if (restaurant['코멘트']) {
        ui.details.innerHTML += `<div class="comment-box"><p>${restaurant['코멘트']}</p></div>`;
    }

    ui.images.innerHTML = '';
    if (restaurant['이미지']) {
        const imageUrls = restaurant['이미지'].split(',').map((url) => url.trim()).filter(Boolean);
        const selectedImages = imageUrls.length > 9 ? shuffleArray([...imageUrls]).slice(0, 9) : imageUrls;

        selectedImages.forEach((url) => {
            const img = document.createElement('img');
            img.src = url;
            img.alt = `${restaurant['식당명']} 메뉴 이미지`;
            ui.images.appendChild(img);
        });
    }

    ui.details.style.display = 'flex';
    ui.map.style.display = 'flex';
    ui.images.style.display = 'grid';

    const restaurantLat = parseFloat(restaurant['위도']);
    const restaurantLng = parseFloat(restaurant['경도']);
    const restaurantPosition = new naver.maps.LatLng(restaurantLat, restaurantLng);
    const companyPosition = new naver.maps.LatLng(COMPANY_POS.lat, COMPANY_POS.lng);

    map = showMap(restaurantLat, restaurantLng);

    new naver.maps.Marker({
        position: restaurantPosition,
        map
    });

    createLabel(map, companyPosition, '<div>TEK</div>', 'company-label');
    createLabel(map, restaurantPosition, `<div>${restaurant['식당명']}</div>`, 'restaurant-label');
}

function showMap(lat, lng) {
    const centerLat = (lat + COMPANY_POS.lat) / 2;
    const centerLng = (lng + COMPANY_POS.lng) / 2;

    const mapOptions = {
        center: new naver.maps.LatLng(centerLat, centerLng),
        draggable: false,
        pinchZoom: false,
        scrollWheel: false,
        zoomControl: true,
        zoom: 15,
        zoomControlOptions: { position: naver.maps.Position.LEFT_BOTTOM }
    };

    map = new naver.maps.Map('map', mapOptions);

    new naver.maps.Marker({
        position: new naver.maps.LatLng(COMPANY_POS.lat, COMPANY_POS.lng),
        map
    });

    return map;
}

function updateLabelPosition(currentMap, labelDiv, position) {
    const projection = currentMap.getProjection();
    const positionTopLeft = projection.fromCoordToOffset(position);
    labelDiv.style.left = `${positionTopLeft.x}px`;
    labelDiv.style.top = `${positionTopLeft.y}px`;
}

function createLabel(currentMap, position, content, cssClass) {
    const labelDiv = document.createElement('div');
    labelDiv.className = `custom-label ${cssClass}`;
    labelDiv.innerHTML = content;

    naver.maps.Event.addListener(currentMap, 'zoom_changed', () => {
        updateLabelPosition(currentMap, labelDiv, position);
    });

    updateLabelPosition(currentMap, labelDiv, position);
    currentMap.getPanes().floatPane.appendChild(labelDiv);

    return labelDiv;
}

function toggleDrag() {
    if (!map) {
        return;
    }

    const button = document.getElementById('toggle-drag');
    const draggable = map.getOptions('draggable');

    if (draggable) {
        map.setOptions({ draggable: false, pinchZoom: false, scrollWheel: false });
        button.textContent = '지도 이동 켜기';
    } else {
        map.setOptions({ draggable: true, pinchZoom: true, scrollWheel: true });
        button.textContent = '지도 이동 끄기';
    }
}

function sortRestaurants(list, sortKey) {
    const sorted = [...list];

    switch (sortKey) {
        case 'distance':
            sorted.sort((a, b) => parseDistance(a['이동거리']) - parseDistance(b['이동거리']));
            break;
        case 'time':
            sorted.sort((a, b) => parseMinutes(a['이동시간']) - parseMinutes(b['이동시간']));
            break;
        case 'name':
            sorted.sort((a, b) => (a['식당명'] || '').localeCompare(b['식당명'] || '', 'ko'));
            break;
        default:
            break;
    }

    return sorted;
}

function parseDistance(distanceText = '') {
    const match = distanceText.replace(/,/g, '').match(/([0-9.]+)\s*(km|m)/i);
    if (!match) {
        return Number.POSITIVE_INFINITY;
    }

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    return unit === 'km' ? value * 1000 : value;
}

function parseMinutes(timeText = '') {
    const minute = timeText.match(/(\d+)\s*분/);
    if (minute) {
        return parseInt(minute[1], 10);
    }

    return Number.POSITIVE_INFINITY;
}

function isClosed(closedValue = '') {
    const normalized = String(closedValue).trim().toLowerCase();
    return normalized === 'true' || normalized === '폐업';
}

function pickRandomRestaurant() {
    if (!currentCategory) {
        alert('먼저 카테고리를 선택해 주세요.');
        return;
    }

    if (filteredList.length === 0) {
        alert('현재 조건에서 추천할 식당이 없어요. 필터를 조정해 주세요.');
        return;
    }

    const randomIndex = Math.floor(Math.random() * filteredList.length);
    const selected = filteredList[randomIndex];
    showDetails(selected);
}

function updateSummary(query = '') {
    ui.summaryTotal.textContent = `전체 ${loadedData.length}곳`;
    ui.summaryCategory.textContent = currentCategory ? `${currentCategory} ${filteredList.length}곳` : '카테고리 미선택';

    const filterSummary = [];
    if (query) {
        filterSummary.push(`검색: ${query}`);
    }
    if (ui.sortSelect.value !== 'default') {
        filterSummary.push(`정렬: ${ui.sortSelect.options[ui.sortSelect.selectedIndex].text}`);
    }
    if (ui.includeClosed.checked) {
        filterSummary.push('폐업 포함');
    }

    ui.summaryFilter.textContent = filterSummary.length ? filterSummary.join(' · ') : '필터 없음';
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}
