// ===== 1. Kết nối Firebase =====
const firebaseConfig = {
  apiKey: "AIzaSyAkiUTj-5SWXCR9LwfSV4SyUttZkdi5CEc",
  authDomain: "weather-quynhanh.firebaseapp.com",
  projectId: "weather-quynhanh",
  storageBucket: "weather-quynhanh.firebasestorage.app",
  messagingSenderId: "1017142428894",
  appId: "1:1017142428894:web:e33038d5ec65b02dffee4f",
  measurementId: "G-P2EFMYLC2Z"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ===== 2. Lấy các phần tử trên trang =====
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const message = document.getElementById("message");
const currentBox = document.getElementById("current");
const forecastBox = document.getElementById("forecast");
const forecastList = document.getElementById("forecast-list");
const uvBox = document.getElementById("uv");

const accountBtn = document.getElementById("account-btn");
const authPanel = document.getElementById("auth-panel");
const authForm = document.getElementById("auth-form");
const userBox = document.getElementById("user-box");
const userEmail = document.getElementById("user-email");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const authMessage = document.getElementById("auth-message");

const favBtn = document.getElementById("fav-btn");
const favList = document.getElementById("fav-list");

let currentUser = null;
let currentCityName = "";
let favorites = [];

// ===== 3. Bảng mã thời tiết =====
const WEATHER_CODES = {
  0:  { text: "Trời quang", icon: "☀️", group: "clear" },
  1:  { text: "Ít mây", icon: "🌤️", group: "clear" },
  2:  { text: "Có mây", icon: "⛅", group: "cloudy" },
  3:  { text: "Nhiều mây", icon: "☁️", group: "cloudy" },
  45: { text: "Sương mù", icon: "🌫️", group: "fog" },
  51: { text: "Mưa phùn nhẹ", icon: "🌦️", group: "rain" },
  53: { text: "Mưa phùn", icon: "🌦️", group: "rain" },
  55: { text: "Mưa phùn dày", icon: "🌧️", group: "rain" },
  61: { text: "Mưa nhỏ", icon: "🌦️", group: "rain" },
  63: { text: "Mưa vừa", icon: "🌧️", group: "rain" },
  65: { text: "Mưa to", icon: "🌧️", group: "rain" },
  80: { text: "Mưa rào nhẹ", icon: "🌧️", group: "rain" },
  81: { text: "Mưa rào", icon: "🌧️", group: "rain" },
  82: { text: "Mưa rào rất to", icon: "⛈️", group: "storm" },
  95: { text: "Giông", icon: "⛈️", group: "storm" }
};

function getWeatherInfo(code) {
    return WEATHER_CODES[code] || { text: "Không xác định", icon: "❔", group: "cloudy" };
}

function showMessage(text, type) {
    message.textContent = text;
    message.className = "message " + type;
    message.hidden = (text === "");
}

// ===== 4. Gọi API =====
async function findCity(name) {
    const url = "https://geocoding-api.open-meteo.com/v1/search"
              + "?name=" + encodeURIComponent(name)
              + "&count=1&language=vi&format=json";
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Máy chủ tìm thành phố báo lỗi: " + response.status);
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
        return null;
    }
    return data.results[0];
}

async function getWeather(lat, lon) {
    const url = "https://api.open-meteo.com/v1/forecast"
              + "?latitude=" + lat
              + "&longitude=" + lon
              + "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,uv_index"
              + "&daily=weather_code,temperature_2m_max,temperature_2m_min"
              + "&timezone=auto&forecast_days=6";
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Máy chủ thời tiết báo lỗi: " + response.status);
    }
    return await response.json();
}

// ===== 5. Hiển thị thời tiết =====
function showCurrent(city, current) {
    const info = getWeatherInfo(current.weather_code);

    let icon = info.icon;
    if (current.is_day === 0 && info.group === "clear") {
        icon = "🌙";
    }
    let place = city.name;
    if (city.country) {
        place = place + ", " + city.country;
    }

    document.getElementById("city-name").textContent = place;
    document.getElementById("update-time").textContent = "Cập nhật lúc " + current.time.slice(11, 16);
    document.getElementById("current-icon").textContent = icon;
    document.getElementById("current-temp").textContent = Math.round(current.temperature_2m) + "°C";
    document.getElementById("current-text").textContent = info.text;
    document.getElementById("feels-like").textContent = Math.round(current.apparent_temperature) + "°C";
    document.getElementById("humidity").textContent = current.relative_humidity_2m + "%";
    document.getElementById("wind").textContent = Math.round(current.wind_speed_10m) + " km/h";
    uvBox.textContent = current.uv_index;

    const advice = document.getElementById("advice");
    if (info.group === "rain" || info.group === "storm") {
        advice.textContent = "☔ Trời mưa, nhớ mang ô nhé!";
    } else {
        advice.textContent = "";
    }

    currentCityName = city.name;
    updateFavButton();

    currentBox.hidden = false;
}

function changeBackground(current) {
    const group = getWeatherInfo(current.weather_code).group;
    const isNight = (current.is_day === 0);

    if (isNight && (group === "clear" || group === "cloudy")) {
        document.body.className = "night";
    } else {
        document.body.className = group;
    }
}

function formatDay(dateText) {
    const date = new Date(dateText);
    return date.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function showForecast(daily) {
    forecastList.innerHTML = "";

    for (let i = 1; i < daily.time.length; i++) {
        const info = getWeatherInfo(daily.weather_code[i]);
        const max = Math.round(daily.temperature_2m_max[i]);
        const min = Math.round(daily.temperature_2m_min[i]);

        const dayCard = document.createElement("div");
        dayCard.className = "day";
        dayCard.innerHTML =
            '<div class="muted">' + formatDay(daily.time[i]) + "</div>"
          + '<div class="day-icon">' + info.icon + "</div>"
          + '<div class="day-temp">' + max + "° / " + min + "°</div>"
          + '<div class="muted">' + info.text + "</div>";

        forecastList.appendChild(dayCard);
    }
    forecastBox.hidden = false;
}

// ===== 6. Tìm kiếm =====
async function searchWeather(name) {
    name = name.trim();

    if (name === "") {
        showMessage("Vui lòng nhập tên thành phố.", "error");
        return;
    }

    showMessage("Đang tải dữ liệu...", "loading");
    searchBtn.disabled = true;
    currentBox.hidden = true;
    forecastBox.hidden = true;

    try {
        const city = await findCity(name);

        if (city === null) {
            showMessage('Không tìm thấy "' + name + '". Hãy thử tên không dấu, ví dụ: Hanoi.', "error");
            return;
        }
        const data = await getWeather(city.latitude, city.longitude);
        showCurrent(city, data.current);
        changeBackground(data.current);
        showForecast(data.daily);
        showMessage("", "");
        localStorage.setItem("lastCity", name);
    } catch (error) {
        console.error(error);
        showMessage("Có lỗi xảy ra khi tải thời tiết. Kiểm tra mạng và thử lại.", "error");
    } finally {
        searchBtn.disabled = false;
    }
}

searchBtn.addEventListener("click", function () {
    searchWeather(cityInput.value);
});

cityInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        searchWeather(cityInput.value);
    }
});

const chips = document.querySelectorAll(".chip");
chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
        cityInput.value = chip.dataset.city;
        searchWeather(chip.dataset.city);
    });
});

// ===== 7. Tài khoản =====
const AUTH_ERRORS = {
  "auth/invalid-email": "Email không hợp lệ.",
  "auth/missing-password": "Vui lòng nhập mật khẩu.",
  "auth/weak-password": "Mật khẩu phải có ít nhất 6 ký tự.",
  "auth/email-already-in-use": "Email này đã được đăng ký.",
  "auth/invalid-credential": "Sai email hoặc mật khẩu.",
  "auth/too-many-requests": "Thử sai quá nhiều lần, vui lòng đợi một lát."
};

function getAuthError(error) {
    return AUTH_ERRORS[error.code] || "Có lỗi xảy ra: " + error.message;
}

accountBtn.addEventListener("click", function () {
    authPanel.hidden = !authPanel.hidden;
});

signupBtn.addEventListener("click", async function () {
    try {
        await auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value);
    } catch (error) {
        authMessage.textContent = getAuthError(error);
    }
});

loginBtn.addEventListener("click", async function () {
    try {
        await auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value);
    } catch (error) {
        authMessage.textContent = getAuthError(error);
    }
});

logoutBtn.addEventListener("click", function () {
    auth.signOut();
});

auth.onAuthStateChanged(function (user) {
    if (user) {
        currentUser = user;
        loadFavorites();
        authForm.hidden = true;
        userBox.hidden = false;
        userEmail.textContent = user.email;
        accountBtn.textContent = "👤 Tài khoản";
        authMessage.textContent = "";
        passwordInput.value = "";
        authPanel.hidden = true;
    } else {
        currentUser = null;
        favorites = [];
        showFavorites();
        authForm.hidden = false;
        userBox.hidden = true;
        accountBtn.textContent = "👤 Đăng nhập";
    }
});

// ===== 8. Thành phố yêu thích =====
function updateFavButton() {
    if (currentUser === null || currentCityName === "") {
        favBtn.hidden = true;
        return;
    }
    favBtn.hidden = false;
    if (favorites.includes(currentCityName)) {
        favBtn.textContent = "★";
        favBtn.classList.add("active");
        favBtn.title = "Bỏ khỏi yêu thích";
    } else {
        favBtn.textContent = "☆";
        favBtn.classList.remove("active");
        favBtn.title = "Lưu vào yêu thích";
    }
}

function showFavorites() {
    const quickNames = [];
    chips.forEach(function (chip) {
        quickNames.push(chip.dataset.name);
        if (favorites.includes(chip.dataset.name)) {
            chip.classList.add("starred");
        } else {
            chip.classList.remove("starred");
        }
    });

    favList.innerHTML = "";
    for (let i = 0; i < favorites.length; i++) {
        const name = favorites[i];
        if (quickNames.includes(name)) {
            continue;
        }
        const chip = document.createElement("button");
        chip.className = "chip starred";
        chip.textContent = name;
        chip.addEventListener("click", function () {
            cityInput.value = name;
            searchWeather(name);
        });
        favList.appendChild(chip);
    }
    updateFavButton();
}

async function loadFavorites() {
    try {
        const doc = await db.collection("users").doc(currentUser.uid).get();
        if (doc.exists && doc.data().favorites) {
            favorites = doc.data().favorites;
        } else {
            favorites = [];
        }
    } catch (error) {
        console.error(error);
        favorites = [];
    }
    showFavorites();
}

favBtn.addEventListener("click", async function () {
    if (favorites.includes(currentCityName)) {
        favorites = favorites.filter(function (name) {
            return name !== currentCityName;
        });
    } else {
        favorites.push(currentCityName);
    }
    showFavorites();

    try {
        await db.collection("users").doc(currentUser.uid).set({ favorites: favorites });
    } catch (error) {
        console.error(error);
        showMessage("Không lưu được thành phố yêu thích. Vui lòng thử lại.", "error");
    }
});

// ===== 9. Mở trang: hiện thành phố tìm gần nhất =====
const lastCity = localStorage.getItem("lastCity") || "Hanoi";
cityInput.value = lastCity;
searchWeather(lastCity);