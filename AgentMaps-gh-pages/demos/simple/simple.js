/*				   */
/* Setup the AgentMaps simulation. */
/*				   */

//Get the interface element for inputting the animation_interval.
var animation_interval_input = document.getElementById("animation_interval");

//Set bounds for the area on the map where the simulation will run (gotten from openstreetmap.org).
var bounding_box = [[39.78598,116.70024],[39.78233,116.70352]];
	/* [39.78598,116.70024],[39.78233,116.70352]
	[39.9058, -86.0910], [39.8992, -86.1017] */

//Create and setup the Leafvar map object.
var map = L.map("map").fitBounds(bounding_box).setZoom(15);

//Get map graphics by adding OpenStreetMap tiles to the map object.
L.tileLayer(
	"http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
	{
		attribution: "Thanks to <a href=\"http://openstreetmap.org\">OpenStreetMap</a> community",
		maxZoom: 18,
	}
).addTo(map);

//Create an Agentmap.
var agentmap = L.A.agentmap(map);

//Do the following on each tick of the simulation once for the whole map.
agentmap.controller = function() {
	ticks_display.textContent = agentmap.state.ticks;

	var animation_interval = animation_interval_map[animation_interval_input.value];

	//Check if the animation interval slider's value has changed and update the agentmap.animation_interval accordingly.
	if (animation_interval !== this.animation_interval) {
		this.setAnimationInterval(animation_interval);
	}
}



function setup() {
	//Generate and display streets and buildings on the map (map_data is defined in map_data.js).
	agentmap.buildingify(bounding_box, map_data);

	var buildings = agentmap.units.getLayers()

	// differentiate buildings (numbers are random)
	var factories = pick_random_n(buildings,10);
	for (let i = 0; i < 10; i++) {
		factories[i].setStyle({color: "black"});
	}

	var apartments = pick_random_n(buildings.filter(x => !factories.includes(x)),20);
	for (let i = 0; i < 20; i++) {
		apartments[i].setStyle({color: "red"});
	}

	//Generate 100 agents according to the rules of epidemicAgentMaker, displaying them as blue, .5 meter radius circles.
	agentmap.agentify(30, agentmap.seqUnitAgentMaker);

	var humans = agentmap.agents.getLayers();
		for (let i = 0; i < 15; i++) {
			humans[i].setStyle({color: "black"});
		}
		humans[20].setStyle({color: "green"});

	ticks_display.textContent = agentmap.state.ticks;

	//Set the animation_interval input element to the default value.
	animation_interval_input.value = 5;

	//Do the following for each agent before starting the simulation.
	agentmap.agents.eachLayer(function(agent) {
		//Find and move to the center of a random unit on the map.
		var random_unit_index = Math.floor(Math.random() * agentmap.units.count()),
		random_unit = agentmap.units.getLayers()[random_unit_index],
		unit_id = random_unit._leaflet_id,
		unit_center = random_unit.getCenter();

		agent.scheduleTrip(unit_center, {type: "unit", id: unit_id}, .5);
/*
		//Find and move to a random, unanchored point in the neighborhood.
		var random_lat = bounding_box[0][0] + Math.random() * -(bounding_box[0][0] - bounding_box[1][0]),
		random_lng = bounding_box[0][1] + Math.random() * -(bounding_box[0][1] - bounding_box[1][1]),
		random_lat_lng = L.latLng(random_lat, random_lng);
		agent.scheduleTrip(random_lat_lng, {type: "unanchored"}, 1);
*/
		//Find and move to a random street's intersection.
		var random_street_index = Math.floor(Math.random() * agentmap.streets.count()),
		random_street = agentmap.streets.getLayers()[random_street_index],
		street_id = agentmap.streets.getLayerId(random_street),
		cross_streets = Object.keys(random_street.intersections),
		intersection = random_street.intersections[cross_streets[0]][0][0];

		agent.scheduleTrip(intersection, {type: "street", id: street_id}, 1.5);

		//Find and move to a random unit door on the same street...
		var street_units = agentmap.units.getLayers().filter(function(unit) {
			return unit.street_id === street_id ? true : false;
		});

		//...Only if there are any units on the street.
		if (street_units.length > 0) {
			var new_random_unit_index = Math.floor(Math.random() * street_units.length),
			new_random_unit = street_units[new_random_unit_index],
			new_unit_id = new_random_unit._leaflet_id,
			new_unit_door = agentmap.getUnitDoor(new_unit_id);

			agent.scheduleTrip(new_unit_door, {type: "unit", id: new_unit_id}, 1.5);

			//Also, move to the door of one of that unit's nextdoor neighbors, if it has any.

			var neighbor_id = new_random_unit.neighbors[0] || new_random_unit.neighbors[1] || -1;
			if (neighbor_id !== -1) {
				var neighbor_unit_door = agentmap.getUnitDoor(neighbor_id);

				agent.scheduleTrip(neighbor_unit_door, {type: "unit", id: neighbor_id}, .4);
			}
		}

		//Define what the agent will do on each tick.
		agent.controller = function() {
			agent.moveIt();
		};
	});

//	agentmap.downloadStreets
//	agentmap.downloadUnits()
}

//Given an array, return n random elements from it.
function pick_random_n(array, n) {
	if (array.length < n) {
		throw new Error("n cannot be bigger than the number of elements in the array!");
	}

	var random_indices = [];

	for (var i = 0; i < n; i++) {
		var random_index = Math.floor(Math.random() * array.length);
		if (!random_indices.includes(random_index)) {
			random_indices.push(random_index);
		}
		else {
			i--;
		}
	}

	var random_n = random_indices.map(function(index) {
		return array[index];
	});

	return random_n;
}
