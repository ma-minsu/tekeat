secrets:
  - name: TEKEAT_MAP_ID
  - name: TEKEAT_MAP_KEY

api_id = ${{ secrets.TEKEAT_MAP_ID }};
api_key = ${{ secrets.TEKEAT_MAP_KEY }};
let map; // 전역 변수로 지도 객체 선언

// CSV 파일에서 데이터 로드
Papa.parse('lunch.csv', {
    download: true,
    header: true,
    complete: function(results) {
        populateCategories(results.data);
    }
});

window.onload = function() {
    const collectiveIntelligence = document.getElementById('collective-intelligence');
    collectiveIntelligence.addEventListener('click', resetPage);
};

function resetPage() {
    // 페이지 초기화 로직
    // 예를 들어, 특정 요소를 숨기거나 초기 상태로 되돌립니다.
    document.getElementById('restaurants').style.display = 'none';
    document.getElementById('details').style.display = 'none';
    document.getElementById('map').style.display = 'none';
    document.getElementById('images').style.display = 'none';
    const activeButtons = document.querySelectorAll('#category-container button.active');
    activeButtons.forEach(button => {
        button.classList.remove('active');
    });

    // 필요한 다른 초기화 코드를 여기에 추가합니다.
}

const categoryOrder = ['한식', '중식', '돈까스·회·일식', '버거·양식', '아시안', '분식', '디저트·카페', '샐러드', '기타'];

// 카테고리 채우기
function populateCategories(data) {
    const categories = [...new Set(data.map(row => row['분류']).filter(Boolean))];
    const categoryContainer = document.getElementById('category-container');

    // 지정한 순서대로 카테고리 정렬
    const orderedCategories = categoryOrder.filter(category => categories.includes(category));
    orderedCategories.forEach(category => {
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
    restaurantList.style.display = 'block'; // 카테고리 클릭 시 표시
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
    const rightSection = document.getElementById('map');
   
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
        const imageUrls = restaurant['이미지'].split(','); // 이미지 URL을 쉼표로 구분
        const selectedImages = imageUrls.length > 9 ? shuffleArray(imageUrls).slice(0, 9) : imageUrls;

        selectedImages.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            imagesDiv.appendChild(img);
        });
    }

    detailsDiv.style.display = 'flex';
    rightSection.style.display = 'flex'; // 식당 클릭 시 지도 스타일 표시
    imagesDiv.style.display = 'grid'; // 식당 클릭 시 스타일 표시

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

}

function showMap(lat, lng) {
    console.log('Creating map with coordinates:', lat, lng);
    const centerLat = (lat + 37.5069766) / 2;
    const centerLng = (lng + 127.0396220) / 2;

    const mapOptions = {
        center: new naver.maps.LatLng(centerLat, centerLng),
        draggable: false, // 드래그 이동 제한
        pinchZoom: false, // 핀치 줌 비활성화 (모바일)
        scrollWheel: false, // 마우스 스크롤 비활성화
        zoomControl: true, // 확대/축소 버튼 활성화
        zoom: 15, // 원하는 줌 레벨
        zoomControlOptions: {
            position: naver.maps.Position.LEFT_BOTTOM // 확대/축소 버튼 위치 설정
        }
    };
    // 지도 객체 생성
    map = new naver.maps.Map('map', mapOptions);

    // 회사 마커와 레이블 추가
    const companyPosition = new naver.maps.LatLng(37.5069766, 127.0396220);
    const companyMarker = new naver.maps.Marker({
        position: companyPosition,
        map: map
    });

    // 지도 객체 반환
    return map;
}

function updateLabelPosition(map, labelDiv, position) {
    const projection = map.getProjection();
    const positionTopLeft = projection.fromCoordToOffset(position);
    labelDiv.style.left = `${positionTopLeft.x}px`;
    labelDiv.style.top = `${positionTopLeft.y}px`;
}

function createLabel(map, position, content, cssClass) {
    const labelDiv = document.createElement('div');
    labelDiv.className = `custom-label ${cssClass}`;
    labelDiv.innerHTML = content;

    // 지도 줌 레벨 변경 시 레이블 위치 업데이트
    naver.maps.Event.addListener(map, 'zoom_changed', () => {
        updateLabelPosition(map, labelDiv, position);
    });

    // 초기 레이블 위치 설정
    updateLabelPosition(map, labelDiv, position);

    // 지도에 레이블 추가
    map.getPanes().floatPane.appendChild(labelDiv);

    return labelDiv;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // 요소 위치 바꾸기
    }
    return array;
}

function toggleDrag() {
    const button = document.getElementById('toggle-drag');
    if (map.getOptions('draggable')) {
        map.setOptions({ draggable: false, pinchZoom: false, scrollWheel: false });
        button.textContent = "Enable Drag";
    } else {
        map.setOptions({ draggable: true, pinchZoom: true, scrollWheel: true });
        button.textContent = "Disable Drag";
    }
}
