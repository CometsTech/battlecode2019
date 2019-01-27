import {BCAbstractRobot, SPECS} from 'battlecode';
import util from './util.js';

var castle = {};

// states
const BUILDING_WORKERS = 0;
const TURTLING = 1;
const DEFENDING = 2;
const ATTACKING = 3;

const TARGET_WORKERS = 10;

castle.init = (self) => {
	self.log("Start of game");
	self.visible_close_to_far = util.close_to_far(1, SPECS.UNITS[SPECS.CASTLE].VISION_RADIUS);
	self.log(SPECS.UNITS[SPECS.CASTLE].VISION_RADIUS);
	self.attack_close_to_far = util.close_to_far(SPECS.UNITS[SPECS.CASTLE].VISION_RADIUS[0], SPECS.UNITS[SPECS.CASTLE].VISION_RADIUS[1]);
	self.state = BUILDING_WORKERS;
	self.turtle_constructed = false;
	self.worker_count = 0;
};

// TODO: degenerate cases where u should insta attack enemy castle
castle.turn = (self) => {
	self.log("Castle health: " + self.me.health + " on turn " + self.me.turn + " with time " + self.me.time);
	// self.log(self.visible_close_to_far[0]);

	self.availableDirections = util.find_open_adjacents(self);
	self.nearest_enemies = util.nearest_enemies(self, self.attack_close_to_far);

	// Set castle state:
	var new_state = ATTACKING; // default


	if (self.me.turn < 4) {
		new_state = BUILDING_WORKERS;
	}
	// Note the 0.99 heuristic is to permit not *always* defending... perhaps use another metric
	// if ((self.nearest_enemies.length > 0) && (self.turtle_constructed === false) && (Math.random() < 0.99)) {
	// 	new_state = DEFENDING;
	// }

	self.state = new_state;

	switch (self.state) {
		case BUILDING_WORKERS:
			turn_build_workers(self);
			break;
		case TURTLING:
			turn_turtle(self);
			break;
		case DEFENDING:
			turn_defend(self);
			break;
		case ATTACKING:
			turn_attack(self);
			break;
	}
};

function turn_build_workers(self){
    for(var d of self.availableDirections){
    	if(util.can_buildUnit(self, SPECS.PILGRIM, d[0], d[1])){
    		return self.buildUnit(SPECS.PILGRIM, d[0], d[1]);
    	}
    }
}

function turn_turtle(self){
	// TODO ELAINE PUT CODE HERE
	return;
}

function turn_defend(self){
	// TODO AADITYA PUT CODE HERE
	return;
}

function turn_attack(self){
	// TODO FIX @AADITYA
	var to_build = SPECS.PREACHER
	if(self.me.turn < 40){
		to_build = SPECS.CRUSADER;
	}
	return rand_build(self, to_build, self.availableDirections)
}

function rand_build(self, unit, dirs){
	let ok_dirs = [];
	for (let i = 0; i < dirs.length; i++){
		if (util.can_buildUnit(self, unit, dirs[i][0], dirs[i][1])){
			ok_dirs.push(i);
		}
	}
	if (ok_dirs.length === 0){
		return;
	}
	let i = util.rand_int(ok_dirs.length);

	return self.buildUnit(unit, dirs[i][0], dirs[i][1]);
}

export default castle;
