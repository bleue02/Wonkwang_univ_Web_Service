document.addEventListener("DOMContentLoaded", function () {
    const DEFAULT_LAT = 35.968483; // 기본 중심 위치 (제한 범위 바깥일 경우)
    const DEFAULT_LNG = 126.957988;

    // 지도 드래그 제한 범위 설정 (북, 동, 서, 남)
    const bounds = new naver.maps.LatLngBounds(
        new naver.maps.LatLng(35.962391, 126.951707), // 남서(South-West) 좌표
        new naver.maps.LatLng(35.975688, 126.966098)  // 북동(North-East) 좌표
    );

    // 지도 옵션 설정
    const mapOptions = {
        center: new naver.maps.LatLng(DEFAULT_LAT, DEFAULT_LNG), // 초기 지도 중심
        zoom: 19,
        minZoom: 18.5,
        zoomControl: false,
        mapTypeControl: true,
    };

    const map = new naver.maps.Map("map", mapOptions);

    const openInfoWindows = []; // 열려 있는 정보 창을 추적
    let currentPosition = { lat: null, lng: null, marker: null }; // 현재 위치 정보

    // 초기 위치 설정
    function initializePosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const userLatLng = new naver.maps.LatLng(latitude, longitude);

                    // 사용자의 위치가 제한 범위 내에 있는지 확인
                    if (bounds.hasLatLng(userLatLng)) {
                        map.setCenter(userLatLng); // 제한 범위 내: 사용자 위치를 초기 위치로 설정
                    } else {
                        map.setCenter(new naver.maps.LatLng(DEFAULT_LAT, DEFAULT_LNG)); // 제한 범위 밖: 기본 위치 사용
                    }
                    updateCurrentLocation(latitude, longitude);
                },
                (error) => {
                    console.error("GPS 정보를 가져오는 중 오류 발생:", error);
                    // GPS 실패 시 기본 위치로 설정
                    map.setCenter(new naver.maps.LatLng(DEFAULT_LAT, DEFAULT_LNG));
                }
            );
        } else {
            alert("이 브라우저에서는 GPS를 지원하지 않습니다.");
            map.setCenter(new naver.maps.LatLng(DEFAULT_LAT, DEFAULT_LNG));
        }
    }


    // "내 위치로 이동" 버튼 추가
    const moveToMyLocationButton = document.createElement("button");
    moveToMyLocationButton.style.position = "absolute";
    moveToMyLocationButton.style.top = "50px";
    moveToMyLocationButton.style.right = "10px";
    moveToMyLocationButton.style.width = "50px";
    moveToMyLocationButton.style.height = "50px";
    moveToMyLocationButton.style.padding = "0";
    moveToMyLocationButton.style.backgroundColor = "transparent";
    moveToMyLocationButton.style.border = "none";
    moveToMyLocationButton.style.cursor = "pointer";

    const iconImage = document.createElement("img");
    iconImage.src = "/static/image/position.png"; // 업로드된 이미지를 저장한 경로
    iconImage.alt = "내 위치";
    iconImage.style.width = "100%";
    iconImage.style.height = "100%";
    moveToMyLocationButton.appendChild(iconImage);

    document.body.appendChild(moveToMyLocationButton);

    // 버튼 클릭 시 현재 위치로 지도 이동
    moveToMyLocationButton.addEventListener("click", function () {
        if (currentPosition.lat && currentPosition.lng) {
            map.setCenter(new naver.maps.LatLng(currentPosition.lat, currentPosition.lng));
        } else {
            alert("현재 위치를 가져올 수 없습니다.");
        }
    });

    // GPS로 현재 위치 가져오기
    function getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    updateCurrentLocation(latitude, longitude);
                },
                (error) => {
                    console.error("GPS 정보를 가져오는 중 오류 발생:", error);
                }
            );
        } else {
            alert("이 브라우저에서는 GPS를 지원하지 않습니다.");
        }
    }

    // 현재 위치 업데이트
    function updateCurrentLocation(lat, lng) {
        currentPosition.lat = lat;
        currentPosition.lng = lng;

        if (!currentPosition.marker) {
            currentPosition.marker = new naver.maps.Marker({
                position: new naver.maps.LatLng(lat, lng),
                map: map,
                title: "현재 위치",
                icon: {
                    content:
                        '<div style="width:20px;height:20px;background-color:red;border-radius:50%;"></div>',
                    anchor: new naver.maps.Point(10, 10),
                },
            });
        } else {
            animateMarker(currentPosition.marker, { lat: currentPosition.lat, lng: currentPosition.lng }, { lat, lng });
        }
    }

    // 마커 이동 애니메이션
    function animateMarker(marker, from, to) {
        if (!from.lat || !from.lng) {
            marker.setPosition(new naver.maps.LatLng(to.lat, to.lng));
            return;
        }

        const fromLatLng = new naver.maps.LatLng(from.lat, from.lng);
        const toLatLng = new naver.maps.LatLng(to.lat, to.lng);

        const animationDuration = 1000; // 1초 동안 애니메이션
        const start = Date.now();

        function animate() {
            const elapsed = Date.now() - start;
            const t = Math.min(elapsed / animationDuration, 1); // 0 ~ 1 사이 값
            const currentLat = fromLatLng.lat() + t * (toLatLng.lat() - fromLatLng.lat());
            const currentLng = fromLatLng.lng() + t * (toLatLng.lng() - fromLatLng.lng());
            marker.setPosition(new naver.maps.LatLng(currentLat, currentLng));

            if (t < 1) {
                requestAnimationFrame(animate);
            }
        }
        animate();
    }

    // 지도 드래그 제한 이벤트
    naver.maps.Event.addListener(map, "dragend", function () {
        const mapBounds = map.getBounds();

        if (!bounds.hasBounds(mapBounds)) {
            const center = map.getCenter();
            if (!bounds.hasLatLng(center)) {
                const newCenter = bounds.getCenter();
                map.setCenter(newCenter);
            }
        }
    });

    // 건물 마커 생성
    function createBuildingMarkers(map) {
        if (!Array.isArray(buildings) || buildings.length === 0) {
            console.error("건물 데이터가 없습니다.");
            return;
        }

        buildings.forEach(function (building) {
            const marker = new naver.maps.Marker({
                position: new naver.maps.LatLng(building.lat, building.lng),
                map: map,
                title: building.name,
                icon: {
                    content:
                        '<div style="width:20px;height:20px;background-color:#007bff;border-radius:50%;border:2px solid white;"></div>',
                    anchor: new naver.maps.Point(10, 10),
                },
            });

            const infoWindowContent = `
                <div class="card">
                    <div class="card-details">
                        <p class="text-title">${building.name}</p>
                        <div class="image-container">
                            <img src="/static/${building.image_folder || "image"}/${building.image}" alt="${building.name} 이미지" draggable="false">
                        </div>
                        <div class="floor-links">
                            <a href="/building/${encodeURIComponent(building.name)}/service" class="floor-link">교수님 면담 예약</a>
                            <a href="/building/${encodeURIComponent(building.name)}/reserve" class="floor-link">강의실 예약</a>
                        </div>
                        <button class="navigate-button">길안내</button>
                    </div>
                </div>
            `;

            const infoWindow = new naver.maps.InfoWindow({
                content: infoWindowContent,
                maxWidth: 300,
                disableAnchor: true,
                anchor: new naver.maps.Point(0, 0),
                borderWidth: 0,
                backgroundColor: "transparent",
                anchorSkew: true,
                disableAutoPan: true,
            });

            // 마커 클릭 이벤트
            naver.maps.Event.addListener(marker, "click", function () {
                closeAllInfoWindows(); // 다른 정보 창 닫기
                infoWindow.open(map, marker);
                openInfoWindows.push(infoWindow); // 열린 정보 창을 추적

                // 길안내 버튼 클릭 이벤트 등록
                const navigateButton = document.querySelector(".navigate-button");
                if (navigateButton) {
                    navigateButton.onclick = function () {
                        infoWindow.close(); // 정보 창 닫기
                        navigateToBuilding(map, currentPosition, building.lat, building.lng);
                    };
                }
            });
        });
    }

    function closeAllInfoWindows() {
        openInfoWindows.forEach(infoWindow => infoWindow.close());
        openInfoWindows.length = 0; // 열린 정보 창 리스트 초기화
    }

    // 지도 클릭 시 모든 정보 창 닫기
    naver.maps.Event.addListener(map, "click", function () {
        closeAllInfoWindows(); // 모든 열린 정보 창 닫기
    });

    // 초기 위치 설정
    initializePosition();

    // 일정 간격으로 GPS 업데이트
    setInterval(getCurrentLocation, 2000); // 2초마다 위치 업데이트

    // 건물 마커 생성
    createBuildingMarkers(map);
});
