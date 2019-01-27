import {BCAbstractRobot, SPECS} from 'battlecode';
import util from './util.js';

const castle_verbosity = 0;

var castle = {};

// states
const BUILDING_PILGRIMS = 0;
const TURTLING = 1;
const DEFENDING = 2;
const HARASSING = 3;
const CHARGING = 4;

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
	
	self.near_attacker = undefined;

	self.log(self.target_counts);
};

// TODO: degenerate cases where u should insta attack enemy castle
castle.turn = (self) => {
	if (castle_verbosity > 0) {
		self.log("Castle health: " + self.me.health + " on turn " + self.me.turn + " with time " + self.me.time);
	}
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
		self.getVisibleRobots().forEach((robot) => {
			if ((self.isVisible(robot) === false) || (robot.team === self.me.team)) {
				self.teammates.push(robot);
				self.unit_counts[parseInt((256 + robot.castle_talk).toString(2).substring(1, 4), 2)]++;
			}
		});
		if (castle_verbosity > 0) {
			self.log(self.unit_counts);
		}
	}
	else {
		self.log("RUNNING LOW ON TIME YIKE")
	}

	// Set castle state:
	var new_state = HARASSING; // default

	if (self.unit_counts[SPECS.PILGRIM] < self.target_counts[SPECS.PILGRIM] && Math.random() < 0.66) {
		new_state = BUILDING_PILGRIMS;
	}

	// Note the 0.99 heuristic is to permit not *always* defending... perhaps use another metric
	if ((self.enemies.length > 0) && (self.turtle_constructed === false) && (Math.random() < 0.99)) {
		new_state = DEFENDING;
	}

	if (self.me.turn < 3) {
		new_state = BUILDING_PILGRIMS;
	}

	self.state = new_state;

	if (castle_verbosity > 0){
		self.log("Castle state: " + self.state);
	}

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
		case HARASSING:
			return turn_harass(self);
			break;
	}
};

function turn_build_pilgrims(self){
    let try_build = rand_build(self, SPECS.PILGRIM, self.availableDirections);
    if (try_build === undefined) {
    	return; // TODO add functionality
    }
    else {
    	return try_build;
    }
}

function turn_turtle(self){
	var d = [-1, 1];
	while (false) {
		let dx = d[Math.round(Math.random())];
		let dy = d[Math.round(Math.random())];
		if (util.can_buildUnit(self, SPECS.PROPHET, dx, dy)){
			return self.buildUnit(SPECS.PROPHET, dx, dy);
		}
	}
}

function turn_defend(self){
	// TODO broadcast relevant signal to turtle about killing radio-ing enemies
	if (self.nearest.nearest_enemy_attacker === undefined) {
		let near_worker = self.enemies[0];
		self.log("I see a worker!");
		self.log(near_worker);
		if (util.can_attack(self, near_worker.dx, near_worker.dy)) {
			return self.attack(near_worker.dx, near_worker.dy);
		}
		let make_dir = util.closest_direction(near_worker.dx, near_worker.dy);
		self.log(make_dir);
		// TODO SET SIGNAL TO TELL CRUSADER TO MOVE IN MAKE DIR AS WELL (to bring it closer to the worker)
		if (util.can_buildUnit(self, SPECS.CRUSADER, make_dir.dx, make_dir.dy, 0.5)) {
			return self.buildUnit(SPECS.CRUSADER, make_dir.dx, make_dir.dy);
		}
		// if the optimal spot is taken, just build randomly
		// TOOD make this smarter
		let try_build = rand_build(self, SPECS.CRUSADER, self.availableDirections, 0.4);
		if (try_build ===  undefined) {
			return;
		}
		else {
			return try_build;
		}
	}
	else {
		self.near_attacker = self.nearest.nearest_enemy_attacker;
		self.log("Must defend myself!");
		self.log(self.near_attacker);
		let make_dir = util.closest_direction(self.near_attacker.dx, self.near_attacker.dy);
		self.log(make_dir);
		let sqd = util.squared_distance({x: self.near_attacker.dx, y: self.near_attacker.dy}, {x: make_dir.dx, y: make_dir.dy});
		// If close enough, spawning a preacher/crusader is good defense
		// TODO SET OVERRIDE SIGNAL TO TELL unit to attack regardless
		if (sqd <= 16) {
			self.log("Trying to make unit to defend me.")
			if (util.can_buildUnit(self, SPECS.PREACHER, make_dir.dx, make_dir.dy, 1)) {
				return self.buildUnit(SPECS.PREACHER, make_dir.dx, make_dir.dy);
			}
			if (util.can_buildUnit(self, SPECS.CRUSADER, make_dir.dx, make_dir.dy, 1)) {
				return self.buildUnit(SPECS.CRUSADER, make_dir.dx, make_dir.dy);
			}
		}
		// If unit isn't close enough to hit with a powerful unit, try just shooting it with castle
		if (util.can_attack(self, self.near_attacker.dx, self.near_attacker.dy)) {
			return self.attack(self.near_attacker.dx, self.near_attacker.dy);
		}
		// If unit hasn't entered attack range, but in vision range, build preacher and send after
		// TODO Check if the unit can actually reach attack range
		// TODO SET OVERRIDE SIGNAL TO TELL unit to move more
		else {
			if (util.can_buildUnit(self, SPECS.PREACHER, make_dir.dx, make_dir.dy)) {
				return self.buildUnit(SPECS.PREACHER, make_dir.dx, make_dir.dy);
			}
			let try_build = rand_build(self, SPECS.PREACHER, self.availableDirections, 0.5);
			if (try_build === undefined) {
				return;
			}
			else {
				return try_build;
			}
		}

	}
	return turn_attack(self);
}

function turn_harass(self){
	// TODO FIX @AADITYA
	var to_build = SPECS.PREACHER;
	if(self.me.turn < 40 || true){
		to_build = SPECS.CRUSADER;
	}
	return rand_build(self, to_build, self.availableDirections);
}

function rand_build(self, unit, dirs, override_savings=0){
	let ok_dirs = [];
	for (let i = 0; i < dirs.length; i++){
		if (util.can_buildUnit(self, unit, dirs[i][0], dirs[i][1], override_savings)){
			ok_dirs.push(i);
		}
	}
	if (ok_dirs.length === 0){
		self.log("Unable to build unit " + unit)
		return undefined;
	}
	let i = util.rand_int(ok_dirs.length);

	return self.buildUnit(unit, dirs[i][0], dirs[i][1]);
}

export default castle;
