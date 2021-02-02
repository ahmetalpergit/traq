'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
let editForm;
let editType;
let editDistance;
let editDuration;
let editCadence;
let editElevation;
const resetBtn = document.querySelector('.reset__btn');
const validationBox = document.querySelector('.validation');
const instructions = document.querySelector('.instructions');

const customIcon = L.icon({
    iconUrl: '/public/images/favicon-2.png',
    shadowUrl: '/public/images/favicon-2.png',

    iconSize:     [43, 'auto'], // size of the icon
    shadowSize:   [0, 0], // size of the shadow
    iconAnchor:   [25, 50], // point of the icon which will correspond to marker's location
    shadowAnchor: [4, 62],  // the same for the shadow
    popupAnchor:  [-3, -45] // point from which the popup should open relative to the iconAnchor
});

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance;
        this.duration = duration;
    }
}

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
    }

    calcPace() {
        const pace = this.duration / this.distance;
        this.pace = Number(pace.toFixed(2));
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
    }

    calcSpeed() {
        const speed = this.distance / (this.duration / 60);
        this.speed = Number(speed.toFixed(2));
        return this.speed;
    }
}

class App {
    map;
    mapEvent;
    workouts = localStorage.length > 0 ? JSON.parse(localStorage.workouts) : [];
    markers = [];
    constructor() {
        inputType.addEventListener('change', this._toggleElevationField.bind(this));
        form.addEventListener('submit', this._newWorkout.bind(this));
        containerWorkouts.addEventListener('click', this._moveToMarker.bind(this))
        resetBtn.addEventListener('click', this._resetWorkouts.bind(this))
        document.addEventListener('keydown', this._helperFunctions().removeForm.bind(this));
    }

    getWorkouts() {
        console.log(this.workouts);
    }

    _getPosition() {
        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function(err){
            console.log(err);
            alert("Couldn't find your location!");
        }, {maximumAge:60000, timeout:60000, enableHighAccuracy:true})
    }

    _loadMap(pos) {
        
        const {latitude, longitude} = pos.coords;
        const coords = [latitude, longitude];
        this.map = L.map('map').setView(coords, 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);
        
        this._renderLocalStorage();

        L.marker(coords, {icon: customIcon}).addTo(this.map).bindPopup('Current Location').openPopup();
        this.map.panTo(coords, {animate: false}).on('click', this._showForm.bind(this))
    }

    _showForm(e) {
        if (this.mapEvent) return;
        
        this.mapEvent = e;
        form.classList.remove('hidden');
        instructions.classList.add('none');
        inputDistance.focus();
    }

    _toggleElevationField() {
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _addMarker(workoutEntry) {
        const newMarker = L.marker(workoutEntry.coords, {icon: customIcon})
        .addTo(this.map)
        .bindPopup(workoutEntry.type === 'cycling' ? `🚴🏼‍♂️ Cycled ${workoutEntry.distance} km for ${workoutEntry.duration} minutes.`: `🏃🏼‍♂️ Ran ${workoutEntry.distance} km for ${workoutEntry.duration} minutes.`, {
                maxWidth: 250,
                autoClose: false,
                closeOnClick: false,
                className: `${workoutEntry.type}-popup`
        }).openPopup();

        //Pushing the marker Layer into marker array for deletion later
        this.markers.push(newMarker);

        this.map.panTo(workoutEntry.coords, {animate: true})
    }

    _editMarker(workoutEntry, markerIndex) {
        this.markers[markerIndex].togglePopup();
        const newMarker = L.marker(workoutEntry.coords, {icon: customIcon})
        .addTo(this.map)
        .bindPopup(workoutEntry.type === 'cycling' ? `🚴🏼‍♂️ Cycled ${workoutEntry.distance} km for ${workoutEntry.duration} minutes.`: `🏃🏼‍♂️ Ran ${workoutEntry.distance} km for ${workoutEntry.duration} minutes.`, {
                maxWidth: 250,
                autoClose: false,
                closeOnClick: false,
                className: `${workoutEntry.type}-popup`
        }).openPopup();

        this.markers.splice(markerIndex, 1, newMarker);
    }

    _newWorkout(e) {
        e.preventDefault();

        //Data
        const {lat, lng} = this.mapEvent.latlng;
        const coords = [lat, lng]
        const type = inputType.value;
        const distance = Number(inputDistance.value);
        const duration = Number(inputDuration.value);
        let newWorkoutEntry;

        //Type check to differentiate between Running and Cycling
        if (type === 'running') {
            const cadence = Number(inputCadence.value);

            //Validation for positive and number checks
            if (!this._helperFunctions().inputValidation(distance, duration, cadence) || 
                !this._helperFunctions().positiveValidation(distance, duration, cadence)) return this._helperFunctions().negativeValidation();

            newWorkoutEntry = new Running(coords, distance, duration, cadence);
        }
        
        if (type === 'cycling') {
            const elevation = Number(inputElevation.value);
            
            //Validation for positive and number checks
            if (!this._helperFunctions().inputValidation(distance, duration, elevation) ||
                !this._helperFunctions().positiveValidation(distance, duration, elevation)) return this._helperFunctions().negativeValidation();

            newWorkoutEntry = new Cycling(coords, distance, duration, elevation)
        }

        //Add workout to the app workout array
        this.workouts.push(newWorkoutEntry);

        //Add marker on the map
        this._addMarker(newWorkoutEntry);

        //Reset form inputs and hide it
        this._helperFunctions().resetForm();
        
        //Render workout as a list
        this._renderWorkout(newWorkoutEntry, form);
        
        //Set Local Strorage
        this._setLocalStorage();

        //Reset mapEvent to enable click event after submission
        this.mapEvent = undefined;
    }

    _renderWorkout(workout, form) {

        const html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.type === 'running' ? 'Running' : 'Cycling'} on ${months[typeof(workout.date) === "object" ? workout.date.getMonth() : new Date(Date.parse(workout.date)).getMonth()] + ' ' + (typeof(workout.date) === "object" ? workout.date.getUTCDate() : new Date(Date.parse(workout.date)).getUTCDate())}</h2>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.type === 'running' ? workout.pace : workout.speed}</span>
                <span class="workout__unit">${workout.type === 'running' ? 'min/km' : 'km/h'}</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === 'running' ? '🦶🏼' : '⛰'}</span>
                <span class="workout__value">${workout.type === 'running' ? workout.cadence : workout.elevationGain}</span>
                <span class="workout__unit">${workout.type === 'running' ? 'spm' : 'm'}</span>
            </div>
            <div class="workout__buttons">
                <button class="workout__btn workout__btn--edit">edit</button>
                <button class="workout__btn workout__btn--delete">delete</button>
            </div>
        </li>`

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToMarker(e) {
        const workoutEl = e.target.closest('.workout');
        if (!workoutEl) return;
        
        const findWorkout = this.workouts.find((workout, i) => workout.id === workoutEl.dataset.id);

        if (e.target.className === 'workout__btn workout__btn--delete') {
            this._deleteWorkout(findWorkout)
            return;
        }
        this.map.panTo(findWorkout.coords, {animate: true})

        if (e.target.className === 'workout__btn workout__btn--edit') {
            this._editWorkout(e, findWorkout);
        }
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.workouts));
        resetBtn.style.display = 'block';
    }

    _renderLocalStorage() {
        if (!this.workouts.length > 0) return;
        instructions.classList.add('none');
        resetBtn.style.display = 'block';
        this.workouts.forEach(workout => {
            this._renderWorkout(workout, form);
            this._addMarker(workout);
        })
        
    }

    _resetWorkouts(e) {
        e.target.style.display = 'none';
        this.workouts.splice(0, this.workouts.length);
        localStorage.clear();
        location.reload();
    }

    _deleteWorkout(workout) {
        const workoutsContainer = [...containerWorkouts.childNodes];
        const filterContainer = workoutsContainer.filter(el => {
            return el.className?.split(' ')[0] === 'workout';
        });
        
        const workoutIndex = this.workouts.indexOf(workout);
        this.workouts.splice(workoutIndex, 1);
        this.markers[workoutIndex].remove()
        this.markers.splice(workoutIndex, 1);

        localStorage.clear();
        localStorage.setItem('workouts', JSON.stringify(this.workouts));
        filterContainer.forEach(el => el.remove());
        this.workouts.forEach(el => this._renderWorkout(el, form));

        if (this.workouts.length == 0) location.reload();
    }
    
    _isEditing = false;

    _editWorkout(event, workout) {
        if (this._isEditing) return;
        this._isEditing = true;
        const workoutHtmlThatWeAreEditing = event.target.closest('.workout');
        const editHtml = `
            <form class="form__edit">
            <div class="form__row">
            <label class="form__label">Type</label>
            <select class="form__input form__edit--type">
                <option value="running">Running</option>
                <option value="cycling">Cycling</option>
            </select>
            </div>
            <div class="form__row">
            <label class="form__label">Distance</label>
            <input class="form__input form__edit--distance" placeholder="km" />
            </div>
            <div class="form__row">
            <label class="form__label">Duration</label>
            <input
                class="form__input form__edit--duration"
                placeholder="min"
            />
            </div>
            <div class="form__row${workout.type === 'running' ? '' : ' form__row--hidden'}">
            <label class="form__label">Cadence</label>
            <input
              class="form__input form__edit--cadence"
              placeholder="step/min"
            />
          </div>
          <div class="form__row${workout.type === 'cycling' ? '' : ' form__row--hidden'}">
            <label class="form__label">Elev Gain</label>
            <input
              class="form__input form__edit--elevation"
              placeholder="meters"
            />
          </div>
            <button class="form__btn">OK</button>
        </form>
        `

        //Hide the workout element
        workoutHtmlThatWeAreEditing.classList.add('none');
        //Show edit form right above the hidden workout element
        workoutHtmlThatWeAreEditing.insertAdjacentHTML('beforebegin', editHtml);
        //Assign variables for the elements so they're accessible
        editForm = document.querySelector('.form__edit');
        editType = document.querySelector('.form__edit--type');
        editDistance = document.querySelector('.form__edit--distance');
        editDuration = document.querySelector('.form__edit--duration');
        editCadence = document.querySelector('.form__edit--cadence');
        editElevation = document.querySelector('.form__edit--elevation');
        //Fix type dropdown of edit form
        editType.value = workout.type;
        //Focus on input distance
        editDistance.focus();
        //Add event listeners to the form and type dropdown
        editType.addEventListener('change', function() {
            editCadence.closest('.form__row').classList.toggle('form__row--hidden');
            editElevation.closest('.form__row').classList.toggle('form__row--hidden');
        })
        editForm.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                editForm.remove();
                workoutHtmlThatWeAreEditing.classList.remove('none');
                this._isEditing = false;
            }
        }.bind(this))

        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            this._submitEdit(workout, workoutHtmlThatWeAreEditing)
        }.bind(this));
    }

    _submitEdit(workout, editingWorkout) {
        const coords = workout.coords;
        const type = editType.value;
        const distance = Number(editDistance.value);
        const duration = Number(editDuration.value);

        let editedWorkout;
        //Type check to differentiate between Running and Cycling
        if (type === 'running') {
            const cadence = Number(editCadence.value);

            //Validation for positive and number checks
            if (!this._helperFunctions().inputValidation(distance, duration, cadence) || 
                !this._helperFunctions().positiveValidation(distance, duration, cadence)) return this._helperFunctions().negativeValidation();
            editedWorkout = new Running(coords, distance, duration, cadence);
        }
        
        if (type === 'cycling') {
            const elevation = Number(editElevation.value);
            
            //Validation for positive and number checks
            if (!this._helperFunctions().inputValidation(distance, duration, elevation) ||
                !this._helperFunctions().positiveValidation(distance, duration, elevation)) return this._helperFunctions().negativeValidation();
            editedWorkout = new Cycling(coords, distance, duration, elevation)
        }

        editedWorkout.id = workout.id;
        editedWorkout.date = workout.date;

        const workoutIndex = this.workouts.indexOf(workout);
        this.workouts.splice(workoutIndex, 1, editedWorkout);
        this._editMarker(editedWorkout, workoutIndex)
        
        this._renderWorkout(editedWorkout, editForm)

        localStorage.clear();
        localStorage.setItem('workouts', JSON.stringify(this.workouts));

        editingWorkout.remove();
        editForm.remove()

        this._isEditing = false;
    }    

    _helperFunctions() {
        const helperObj = {
            resetForm: function() {
                inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
                form.classList.add('hidden');
                form.classList.add('none');
                setTimeout(function() {form.classList.remove('none')}, 1000);
            },
            removeForm: function(e) {
                if (e.key !== 'Escape') return;
                //hide form
                form.classList.add('none');
                this._helperFunctions().resetForm();
                this.mapEvent = undefined;

                if (this.workouts.length === 0) {
                    instructions.classList.remove('none');
                }
            },
            inputValidation: function(...inputs) {
                return inputs.every(input => Number.isFinite(input));
            },
            positiveValidation: function(...inputs) {
                return inputs.every(input => input > 0);
            },
            negativeValidation: function() {
                validationBox.style.display = 'flex';
                setTimeout(function() {
                    validationBox.classList.toggle('hidden');
                }, 0)
                setTimeout(function() {
                    validationBox.classList.toggle('hidden');
                    setTimeout(function() {
                        validationBox.style.display = 'none';
                    }, 2000)
                }, 2000)
            }
        }
        return helperObj;
    }

    
}

const app = new App();
app._getPosition();