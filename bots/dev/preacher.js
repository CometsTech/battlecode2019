import {BCAbstractRobot, SPECS} from 'battlecode';
import util from './util.js';

// Set states
const ATTACKING = 0;
const TURTLING = 1;
const COMMANDED = 2;
const CHARGING = 3;

const ADJACENTS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const DIAGONALS = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
const STRAIGHTS = [[2, 0], [0, 2], [-2, 0], [0, -2]];

var preacher = {};
preacher.init = (self) => {
	self.log("Initializing preacher");
	self.close_to_far = util.close_to_far(1, SPECS.UNITS[SPECS.PREACHER].VISION_RADIUS); // preacher attack and vision is same
	self.commander_id = undefined;
	self.commander = null;
	self.creator = null;
	self.creator_id = undefined;
	self.commander_matters = false;
	self.creator_matters = true;
	for (var robot of self.getVisibleRobots()) {
		if ((robot.unit === SPECS.CASTLE) || (robot.unit === SPECS.CHURCH)) {
			self.creator_id = robot.id;
			self.creator = robot;
			self.turtle_radius = (robot.unit === SPECS.CASTLE) ? 4 : 2;
		}
	}
	if (self.creator === undefined) {
		self.log("Problem initializing preacher creator bot!");
	}
	self.state = TURTLING;
	self.command_signal = undefined;
};

preacher.turn = (self) => {
	// First preachers see if they can hit anyone, if they can, shooot (cuz close range)
	// Preachers first check for any override signal from their creators
	// Then preachers check for any override signals from their commanders
	// Otherwise, they assume they're part of a turtle and move accordingly

	let creator_matters = self.creator_matters;
	let commander_matters = self.commander_matters;

	// We must make sure the creator state variables are correct
	if (creator_matters) {
		if (self.creator === null) {
			if (self.creator_id === undefined) {
				for (var robot of self.getVisibleRobots()) {
					if ((robot.unit === SPECS.CASTLE) || (robot.unit === SPECS.CHURCH)) {
						self.creator_id = robot.id;
						self.creator = robot;
					}
				}
				if (self.creator_id === undefined) {
					creator_matters = false;
					self.creator_matters = false;
				}
			}
			else {
				self.creator = self.getRobot(self.creator_id);
				if (self.creator === null) {
					self.creator_id = undefined;
					creator_matters = false;
				}
			}
		}
	}

	// We must make sure the commander state variables are correct
	if (commander_matters) {
		if (self.commander === null) {
			if (self.commander_id === undefined) {
				set_commander(self);
				if (self.commander_id === undefined) {
					commander_matters = false;
				}
			}
			else {
				self.commander = self.getRobot(self.commander_id);
				if (self.commander === null) {
					self.log("I think my commander died. I am sad now.")
					self.commander_id = undefined;
					commander_matters = false;
				}
			}
		}
	}

	self.vismap = self.getVisibleRobotMap();
	self.nearest = util.nearest_units(self, self.close_to_far, self.vismap);
	self.friendlies = self.nearest.friendlies;
	self.enemies = self.nearest.enemies;
	var new_state = TURTLING;
	while (true) {
		if (self.enemies.length > 0) {
			new_state = ATTACKING;
			if (Math.random() < 1) {
				break;
			}
		}
		if (creator_matters && self.isRadioing(self.creator) && self.isVisible(self.creator)) {
			self.command_signal = self.creator.signal;
			new_state = COMMANDED;
			break;
		}
		if ((commander_matters === false) && creator_matters && self.isRadioing(self.creator)) {
			self.command_signal = self.creator.signal;
			new_state = COMMANDED;
			break;
		}
		if (commander_matters && self.isRadioing(self.commander)) {
			self.command_signal = self.commander.signal;
			new_state = COMMANDED;
			break;
		}
		if (commander_matters) {
			new_state = CHARGING;
			break;
		}
		new_state = TURTLING;
		break;
	}
	self.state = new_state;

	self.log("Preacher state: " + self.state);

	switch (self.state) {
		case ATTACKING:
			return turn_attack(self);
			break;
		case TURTLING:
			return turn_turtle(self);
			break;
		case COMMANDED:
			return turn_follow_orders(self);
			break;
		case CHARGING:
			return turn_charge(self);
			break;
	}
};

function set_commander(self) {

}

function turn_attack(self) {
	if (self.time < 10) {
		self.log("Not much time so hitting furthest target to avoid seppuku.")
		if (util.can_attack(self, self.enemies[self.enemies.length-1].dx, self.enemies[self.enemies.length-1].dy)) {
			return self.attack(self.enemies[self.enemies.length-1].dx, self.enemies[self.enemies.length-1].dy);
		}
	}
	let targets = util.best_AOE_target(self, self.close_to_far, self.vismap);
	if (targets.best_target === undefined) {
		self.log("This is quite sad I can't shoot and net damage my opponent. I will turtle")
	}
	else {
		if (util.can_attack(self, targets.best_target.dx, targets.best_target.dy)) {
			return self.attack(targets.best_target.dx, targets.best_target.dy);
		}
		self.log("I cannot attack and am very sad. I will turtle instead.")
	}
	return turn_turtle(self);
}

function turn_turtle(self) {
	let myd = dist_from_creator(self, self.me);
	let dir_from_creator = [self.creator.x-self.me.x, self.creator.y-self.me.y];
	self.log("Distance from creator: " + dir_from_creator);
	let mod = ((dir_from_creator[0]+dir_from_creator[1]) % 2);
	self.log(mod);

	if (mod === 0) {
		self.log("NOT ON GRID PROPERLY... Fixing by moving to:");
		// In this case we need to readjust the position to return to the checkerboard
		for (var d of ADJACENTS) {
			if (util.can_move(self, d[0], d[1]) && util.squared_distance(self.creator, self.me) < self.turtle_radius*self.turtle_radius) {
				self.log(d);
				return self.move(d[0], d[1]);
			}
		}
		self.log("I am very sad and in the wrong spot and surroudned PLS SEND HELP.");
		if (Math.random() < 0.3 && util.squared_distance(self.creator, self.me) < self.turtle_radius*self.turtle_radius) {
			for (var d of util.rand_shuffle(DIAGONALS)) {
				if (util.can_move(self, d[0], d[1])) {
					return self.move(d[0], d[1]);
				}
			}
		}
		return;
	}

	let move_outwards = (myd < self.turtle_radius);

	if (move_outwards) {
		let possible_dirs = []
		for (var d of [].concat(DIAGONALS, STRAIGHTS)) {
			let dest = {x:self.me.x+d[0], y:self.me.y+d[1]};
			if (dist_from_creator(self, dest) > myd && util.on_map(self, dest) && self.karbonite_map[dest.y][dest.x] === false) {
				possible_dirs.push(d);
			}
		}
		possible_dirs = util.rand_shuffle(possible_dirs);
		for (var d of possible_dirs) {
			if (util.can_move(self, d[0], d[1])) {
				return self.move(d[0], d[1]);
			}
		}
	}

	// with some probability (tunable) move sideways
	if (Math.random() < 0.2) {
		let possible_dirs = []
		for (var d of STRAIGHTS) {
			if (dist_from_creator(self, {x:self.me.x+d[0], y:self.me.y+d[1]}) === myd) {
				possible_dirs.push(d);
			}
		}
		possible_dirs = util.rand_shuffle(possible_dirs);
		for (var d of possible_dirs) {
			if (util.can_move(self, d[0], d[1])) {
				return self.move(d[0], d[1]);
			}
		}
	}
}

function dotproduct(a,b) {
	var n = 0, lim = Math.min(a.length,b.length);
	for (var i = 0; i < lim; i++) n += a[i] * b[i];
	return n;
 }

function dist_from_creator(self, robot) {
	let comp_loc = self.creator;
	if (robot.x+robot.y %2 !== 0) {
		comp_loc = find_closest(self.creator, self.me);
	}
	let loc = [robot.x - comp_loc.x, robot.y - comp_loc.y];
	return Math.abs(dotproduct(loc, [1, 1])/2)+Math.abs(dotproduct(loc, [1, -1])/2)
}

function find_closest(loc_start, robot) {
	let retval = [0, 0];
	let mindist = util.squared_distance(robot, {x: loc_start.x, y: loc_start.y});
	for (var d of ADJACENTS) {
		let cur = util.squared_distance(robot, {x: loc_start.x+d[0], y: loc_start.y+d[1]});
		if (cur < mindist) {
			retval = d;
			mindist = cur;
		}
	}
	return {x: loc_start.x+retval[0], y: loc_start.y+retval[1]};
}

function turn_follow_orders(self) {
	return;
}
function turn_charge(self) {
	return;
}

export default preacher;

