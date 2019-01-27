import {BCAbstractRobot, SPECS} from 'battlecode';
import util from './util.js';

const castle_verbosity = 2;

var castle = {};

// states
const BUILDING_PILGRIMS = 0;
const TURTLING = 1;
const DEFENDING = 2;
const HARASSING = 3;
const CHARGING = 4;

const DIAGONALS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const STRAIGHTS = [[2, 0], [0, 2], [-2, 0], [0, -2]];
const ADJACENTS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

castle.init = (self) => {
	self.log("Start of game");
	self.visible_close_to_far = util.close_to_far(1, SPECS.UNITS[SPECS.CASTLE].VISION_RADIUS);
	self.attack_close_to_far = util.close_to_far(SPECS.UNITS[SPECS.CASTLE].ATTACK_RADIUS[0], SPECS.UNITS[SPECS.CASTLE].ATTACK_RADIUS[1]);
	self.state = BUILDING_PILGRIMS;
	self.initial_turtle_constructed = false;
	self.unit_counts = [0, 0, 0, 0, 0, 0];
	self.min_counts = [-1, -1, -1, -1, -1, -1];
	self.target_counts = [-1, -1, -1, -1, -1, -1]; // ADJUST these
	// TODO: tune hyperparameter of 0.6
	self.target_counts[SPECS.PILGRIM] = Math.ceil( 0.6*  ([].concat.apply([], self.karbonite_map).reduce((total, present) => present ? total + 1 : total)
														+ [].concat.apply([], self.fuel_map).reduce((total, present) => present ? total + 1 : total)) );
	self.min_counts[SPECS.PILGRIM] = 0.2*self.target_counts[SPECS.PILGRIM];
	self.near_attacker = undefined;

	self.log(self.target_counts);

	self.turtle_radius = 4;
};

// TODO: degenerate cases where u should insta attack enemy castle
castle.turn = (self) => {
	if (castle_verbosity > 0) {
		self.log("Castle health: " + self.me.health + " on turn " + self.me.turn + " with time " + self.me.time);
	}
	if (self.last_fuel < self.fuel){
		self.bank_fuel += 0.1 * (self.fuel - self.last_fuel);
	}
	if (self.last_karb < self.karbonite){
		self.bank_karb += 0.1 * (self.karbonite - self.last_karb);
	}
	self.last_fuel = self.fuel;
	self.last_karb = self.karbonite;
	// self.log(self.visible_close_to_far[0]);
	self.vis_bots = self.getVisibleRobots();
	self.neighbor_vis = util.make_array(-1, [3, 3]);
	self.neighbor_vis[1][1] = self.me.id;
	for (let i = 0; i < self.vis_bots.length; i++){
		let bot = self.vis_bots[i];
		// self.log(bot);
		if (util.squared_distance(bot, self.me) < 3){
			self.neighbor_vis[bot.y - self.me.y + 1][bot.x - self.me.x + 1] = bot.id;
		}
	}
	// self.log(self.neighbor_vis);
	self.availableDirections = util.find_open_adjacents(self);
	self.teammates = []; // can be out of vision range
	self.nearest = util.nearest_units(self, self.visible_close_to_far);
	self.friendlies = self.nearest.friendlies;
	self.enemies = self.nearest.enemies;
	self.log(self.enemies);

	// TODO only get unit counts if time permits
	if (self.me.time > 10) {
		self.unit_counts = [0, 0, 0, 0, 0, 0];
		self.vis_bots.forEach((robot) => {
			if ((self.isVisible(robot) === false) || (robot.team === self.me.team)) {
				self.teammates.push(robot);
				// self.unit_counts[parseInt((256 + robot.castle_talk).toString(2).substring(1, 4), 2)]++;
				self.unit_counts[robot.castle_talk >> 5]++;
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
	var new_state = TURTLING; // default

	if ((self.unit_counts[SPECS.PILGRIM] < self.target_counts[SPECS.PILGRIM] && Math.random() < 0.66)
		|| Math.random() < 0.2) {
		new_state = BUILDING_PILGRIMS;
	}

	if (Math.random() < 10 / Math.min(25, self.turn)){
		new_state = HARASSING;
	}

	if (self.initial_turtle_constructed === false && (Math.random() < 0.75)) {
		new_state = TURTLING;
	}

	if (self.unit_counts[SPECS.PILGRIM] < self.min_counts[SPECS.PILGRIM] && Math.random() < 0.8) {
		new_state = BUILDING_PILGRIMS;
	}

	// Note the 0.99 heuristic is to permit not *always* defending... perhaps use another metric
	if ((self.enemies.length > 0) && (self.initial_turtle_constructed === false)) {
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
    let try_build = rand_build(self, SPECS.PILGRIM, self.availableDirections, 1/(self.turn*self.turn));
    if (try_build === undefined) {
    	return; // TODO add functionality
    }
    else {
    	return try_build;
    }
}

function turn_turtle(self, force=false){
	let unit_to_build = SPECS.PROPHET;
	let dirs = DIAGONALS;
	if (Math.random() < 0.2 && (force === false)) {
		unit_to_build = SPECS.PREACHER;
		dirs = ADJACENTS;
	}
	let try_build = rand_build(self, unit_to_build, dirs, 0.01);
    if (try_build === undefined) {
    	if (force) {
    		return;
    	} else {
    		turn_turtle(self, true);
    	}
    }
    else {
    	return try_build;
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
			self.log("Castle attacking attacker!")
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
		return undefined;
	}
	let i = ok_dirs[util.rand_int(ok_dirs.length)];
	self.log(dirs[i][0] + " " + dirs[i][1]);

	return self.buildUnit(unit, dirs[i][0], dirs[i][1]);
}

export default castle;
