api_id = 'gol747hita'
api_key = 'wAFxGpcZNrfKXmAxRjK20Ccrfm7lTE4YnDvjwOPI'

// CSV 파일에서 데이터 로드
Papa.parse('lunch.csv', {
    download: true,
    header: true,
    complete: function(results) {
        populateCategories(results.data);
    }
});

// 카테고리 채우기
function populateCategories(data) {
    const categories = [...new Set(data.map(row => row['분류']).filter(Boolean))];
    const categoryContainer = document.getElementById('category-container');
    categories.forEach(category => {
        const button = document.createElement('button');
        button.value = category;
        button.textContent = category;
        const handleClickOrTouch = (e) => {
            e.preventDefault();
            // 다른 버튼의 active 클래스 제거
            categoryContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            // 클릭된 버튼에 active 클래스 추가
            e.target.classList.add('active');
            filterRestaurants(data, category);
        };
        button.addEventListener('click', handleClickOrTouch);
        button.addEventListener('touchend', handleClickOrTouch); // 터치 이벤트 추가
        categoryContainer.appendChild(button);
    });
}

// 식당 목록 필터링
function filterRestaurants(data, category) { // 여기에 category 매개변수를 추가
    const filteredRestaurants = data.filter(row => row['분류'] === category);
    const restaurantList = document.getElementById('restaurants');
    restaurantList.innerHTML = '';
    filteredRestaurants.forEach(row => {
        const listItem = document.createElement('li');
        listItem.textContent = row['식당명'];
        listItem.addEventListener('click', () => showDetails(row));
        restaurantList.appendChild(listItem);
    });
}

// 식당 상세 정보 표시
function showDetails(restaurant) {
    const detailsDiv = document.getElementById('details');
    detailsDiv.innerHTML = `
        <a href="${restaurant['링크']}" target="_blank" id="details-link">
            <h3>${restaurant['식당명']}</h3>
            <p>메뉴: ${restaurant['메뉴']}</p>
            <p>가격: ${restaurant['가격']}</p>
            <p>이동시간: ${restaurant['이동시간']}</p>
            <p>이동거리: ${restaurant['이동거리']}</p>
            <p>횡단보도 수: ${restaurant['횡단보도']}</p>
        </a>
    `;
    // 코멘트가 있는 경우 추가
    if (restaurant['코멘트']) {
        detailsDiv.innerHTML += `<div class="comment-box"><p>${restaurant['코멘트']}</p></div>`;
    }
    // 이미지 추가
    const imagesDiv = document.getElementById('images');
    imagesDiv.innerHTML = '';
    if (restaurant['이미지']) { // 이미지가 있는 경우만 처리
        const imageString = restaurant['이미지'];
        const imageUrls = imageString.slice(1, -1).split("', '").map(url => url.trim());
        // 랜덤하게 5개의 이미지만 선택
        const selectedImages = shuffleArray(imageUrls).slice(0, 5);
        selectedImages.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            imagesDiv.appendChild(img);
        });
    }

    detailsDiv.style.display = 'block';

    // 식당의 마커와 레이블 추가
    const restaurantLat = parseFloat(restaurant['위도']);
    const restaurantLng = parseFloat(restaurant['경도']);
    const restaurantPosition = new naver.maps.LatLng(restaurantLat, restaurantLng);
    const companyPosition = new naver.maps.LatLng(37.5069766, 127.0396220);
    
    const map = showMap(restaurantLat, restaurantLng);

    const restaurantMarker = new naver.maps.Marker({
        position: restaurantPosition,
        map: map
    });

    // 회사 레이블 생성
    createLabel(map, companyPosition, '<div>TEK</div>', 'company-label');

    // 식당 레이블 생성
    createLabel(map, restaurantPosition, `<div>${restaurant['식당명']}</div>`, 'restaurant-label');

    // 회사와 식당이 모두 보이도록 지도 범위 조정
    const bounds = new naver.maps.LatLngBounds();
    bounds.extend(restaurantPosition);
    bounds.extend(new naver.maps.LatLng(37.5069766, 127.0396220)); // 회사 위치
    map.fitBounds(bounds);
}

function showMap(lat, lng) {
    console.log('Creating map with coordinates:', lat, lng);
    const mapOptions = {
        center: new naver.maps.LatLng(lat, lng),
        zoom: 11
    };
    // 지도 객체 생성
    const map = new naver.maps.Map('map', mapOptions);

    // 회사 마커와 레이블 추가
    const companyPosition = new naver.maps.LatLng(37.5069766, 127.0396220);
    const companyMarker = new naver.maps.Marker({
        position: companyPosition,
        map: map
    });

    // 회사와 식당이 모두 보이도록 지도 범위 조정
    const bounds = new naver.maps.LatLngBounds();
    bounds.extend(new naver.maps.LatLng(lat, lng));
    bounds.extend(companyPosition);
    map.fitBounds(bounds);

    // 지도 객체 반환
    return map;
}

function createLabel(map, position, content, cssClass) {
    const labelDiv = document.createElement('div');
    labelDiv.className = `custom-label ${cssClass}`;
    labelDiv.innerHTML = content;

    // 레이블 위치 설정
    naver.maps.Event.addListener(map, 'idle', () => {
        const projection = map.getProjection();
        const positionTopLeft = projection.fromCoordToOffset(position);
        labelDiv.style.left = `${positionTopLeft.x}px`;
        labelDiv.style.top = `${positionTopLeft.y}px`;
    });

    // 지도에 레이블 추가
    map.getPanes().floatPane.appendChild(labelDiv);

    // "idle" 이벤트 수동 발생
    naver.maps.Event.trigger(map, 'idle');

    return labelDiv;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // 두 요소의 위치를 바꿉니다.
    }
    return array;
}
