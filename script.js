"use strict";

// Selectors:
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

/////////////////////////////////
//     Workout Architecture    //
/////////////////////////////////

class Workout {
  date = new Date();
  id = String(Date.now()).slice(-10);
  months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  constructor(distance, duration, coords) {
    this.distance = distance; //km
    this.duration = duration; //min
    this.coords = coords; //[lat,lng]
  }

  _setDescription() {
    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      this.months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

//Child class Running
class Running extends Workout {
  type = "running";

  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence; //steps/min

    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace; //min/km
  }
}

//Child class Cycling
class Cycling extends Workout {
  type = "cycling";

  constructor(distance, duration, coords, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain; //meters

    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed; //km/hr
  }
}

/////////////////////////////////
//  Application Architecture   //
/////////////////////////////////

class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();
    this._getLocalStorage();

    form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => {
        alert("Can't get your coordinates!");
      });
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, 15);

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._showForm.bind(this));

    this.#workouts.forEach((el) => this._renderWorkoutMap(el));
  }

  _showForm(mapEve) {
    this.#mapEvent = mapEve;

    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        "";

    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        "";

    form.classList.add("hidden");
    form.style.display = "none";
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _toggleElevationField() {
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    e.preventDefault();
    const checkInput = (...inputs) => inputs.every((el) => Number.isFinite(el));
    const checkPositive = (...inputs) => inputs.every((el) => el > 0);

    // Get data
    const { lat, lng } = this.#mapEvent.latlng;
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    let workout;

    // Workout Running => Object Running
    if (type === "running") {
      const cadence = +inputCadence.value;

      // Check Data
      if (!checkInput(distance, duration, cadence))
        return alert("Input Not Valid !");
      else if (!checkPositive(distance, duration, cadence))
        return alert("Entries shoud be Positive !!");

      workout = new Running(distance, duration, [lat, lng], cadence);
    }

    // Workout Cycling => Object Cycling
    if (type === "cycling") {
      const elevation = +inputElevation.value;

      // Check Data
      if (!checkInput(distance, duration, elevation))
        return alert("Input Not Valid !");
      else if (!checkPositive(distance, duration))
        return alert("Entries shoud be Positive !!");

      workout = new Cycling(distance, duration, [lat, lng], elevation);
    }

    // Store object to Workouts Array
    this.#workouts.push(workout);

    // Render Workout on Map
    this._renderWorkoutMap(workout);

    // Render Workout on List
    this._renderWorkoutList(workout);

    // Clear + Hide form
    this._hideForm();

    // Set Local Storage
    this._set_localStorage();
  }

  _set_localStorage() {
    localStorage.setItem("workout", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const pastWorkout = JSON.parse(localStorage.getItem("workout"));

    if (!pastWorkout) return;

    this.#workouts = pastWorkout;
    this.#workouts.forEach((el) => this._renderWorkoutList(el));
  }

  _renderWorkoutMap(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 240,
          minWidth: 120,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚴‍♂️"} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkoutList(workout) {
    //prettier-ignore
    let html = `<li class="workout workout--${workout.type}" data-id=${workout.id}>
                  <h2 class="workout__title">${workout.description}</h2>
                  <div class="workout__details">
                    <span class="workout__icon">${
                      workout.type === "running" ? "🏃‍♂️" : "🚴‍♂️"
                    }</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">km</span>
                  </div>
                  <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                  </div>
               `;

    if (workout.type === "running")
      html += `<div class="workout__details">
                  <span class="workout__icon">⚡️</span>
                  <span class="workout__value">${workout.pace.toFixed(1)}</span>
                  <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                  <span class="workout__icon">🦶🏼</span>
                  <span class="workout__value">${workout.cadence}</span>
                  <span class="workout__unit">spm</span>
                </div>
              </li>`;
    else
      html += `<div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed.toFixed(1)}</span>
                <span class="workout__unit">km/h</span>
              </div>
              <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
              </div>
            </li>`;

    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    const target = e.target.closest(".workout");
    if (!target) return;

    const workout = this.#workouts.find((el) => el.id === target.dataset.id);

    this.#map.setView(workout.coords, 16, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  reset() {
    localStorage.removeItem("workout");
  }
}

// Object for App
const app = new App();
