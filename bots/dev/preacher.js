import {BCAbstractRobot, SPECS} from 'battlecode';
import util from './util.js';

// Set states
const ATTACKING = 0;
const TURTLING = 1;
const COMMANDED = 2;
const CHARGING = 3;

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

	self.nearest = util.nearest_units(self, self.close_to_far);
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
	if (self.nearest.nearest_enemy_attacker === undefined) {
		near_worker = self.enemies[0];
	}
	return;
}
function turn_turtle(self) {
	return;
}
function turn_follow_orders(self) {
	return;
}
function turn_charge(self) {
	return;
}

export default preacher;

