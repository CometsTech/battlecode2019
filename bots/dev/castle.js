import {BCAbstractRobot, SPECS} from 'battlecode';
import util from './util.js';

var castle = {};

// states
const BUILDING_PILGRIMS = 0;
const TURTLING = 1;
const DEFENDING = 2;
const ATTACKING = 3;

castle.init = (self) => {
	self.log("Start of game");
	self.visible_close_to_far = util.close_to_far(1, SPECS.UNITS[SPECS.CASTLE].VISION_RADIUS);
	self.attack_close_to_far = util.close_to_far(SPECS.UNITS[SPECS.CASTLE].ATTACK_RADIUS[0], SPECS.UNITS[SPECS.CASTLE].ATTACK_RADIUS[1]);
	self.state = BUILDING_PILGRIMS;
	self.turtle_constructed = false;
	self.unit_counts = [0, 0, 0, 0, 0, 0];
	self.target_counts = [-1, -1, -1, -1, -1, -1]; // ADJUST these
	// TODO: tune hyperparameter of 0.6
	self.target_counts[SPECS.PILGRIM] = Math.ceil( 0.6*  ([].concat.apply([], self.karbonite_map).reduce((total, present) => present ? total + 1 : total)
														+ [].concat.apply([], self.fuel_map).reduce((total, present) => present ? total + 1 : total)) );
	self.log(self.target_counts);
};

// TODO: degenerate cases where u should insta attack enemy castle
castle.turn = (self) => {
	self.log("Castle health: " + self.me.health + " on turn " + self.me.turn + " with time " + self.me.time);
	// self.log(self.visible_close_to_far[0]);

	self.availableDirections = util.find_open_adjacents(self);
	self.teammates = []; // can be out of vision range
	self.nearest = util.nearest_units(self, self.visible_close_to_far);
	self.friendlies = self.nearest.friendlies;
	self.enemies = self.nearest.enemies;
	self.log(self.enemies);

	// TODO only get unit counts if time permits
	if (self.me.time > 10) {
		self.unit_counts = [0, 0, 0, 0, 0, 0];
		self.getVisibleRobots().forEach( (robot) => {
			if ((self.isVisible(robot) === false) || (robot.team === self.me.team)) {
				self.teammates.push(robot);
				self.unit_counts[parseInt((256+robot.castle_talk).toString(2).substring(1, 4), 2)]++;
			}
		});
		self.log(self.unit_counts);
	}
	else {
		self.log("RUNNING LOW ON TIME YIKE")
	}

	// Set castle state:
	var new_state = ATTACKING; // default

	if (self.unit_counts[SPECS.PILGRIM] < self.target_counts[SPECS.PILGRIM]) {
		new_state = BUILDING_PILGRIMS;
	}

	if (self.turtle_constructed === false) {
		new_state = TURTLING
	}

	// Note the 0.99 heuristic is to permit not *always* defending... perhaps use another metric
	if ((self.enemies.length > 0) && (self.turtle_constructed === false) && (Math.random() < 0.99)) {
		new_state = DEFENDING;
	}

	if (self.me.turn < 3) {
		new_state = BUILDING_PILGRIMS;
	}

	self.state = new_state;

	self.log("Castle state: " + self.state);

	switch (self.state) {
		case BUILDING_PILGRIMS:
			return turn_build_pilgrims(self);
			break;
		case TURTLING:
			return turn_turtle(self);
			break;
		case DEFENDING:
			return turn_defend(self);
			break;
		case ATTACKING:
			return turn_attack(self);
			break;
	}
};

function turn_build_pilgrims(self){
    return rand_build(self, SPECS.PILGRIM, self.availableDirections);
}

function turn_turtle(self){
	return rand_build(self, SPECS.PROPHET, self.availableDirections)
}

function turn_defend(self){
	// if (self.nearest.nearest_enemy_attacker === undefined) {

	// }
	return turn_attack(self);
}

function turn_attack(self){
	// TODO FIX @AADITYA
	var to_build = SPECS.PREACHER;
	if(self.me.turn < 40 || true){
		to_build = SPECS.CRUSADER;
	}
	return rand_build(self, to_build, self.availableDirections);
}

function rand_build(self, unit, dirs){
	let ok_dirs = [];
	for (let i = 0; i < dirs.length; i++){
		if (util.can_buildUnit(self, unit, dirs[i][0], dirs[i][1])){
			ok_dirs.push(i);
		}
	}
	if (ok_dirs.length === 0){
		self.log("Unable to build unit " + unit)
		return;
	}
	let i = util.rand_int(ok_dirs.length);

	return self.buildUnit(unit, dirs[i][0], dirs[i][1]);
}

export default castle;
