import {BCAbstractRobot, SPECS} from 'battlecode';
import util from './util.js';

var castle = {};

castle.init = (self) => {
	self.log("Start of game");
};

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
castle.turn = (self) => {
	// self.log("Castle health: " + self.me.health + " on turn " + self.me.turn + " with time " + self.me.time);
	var availableDirections = util.find_open_adjacents(self);
	let to_build = SPECS.CASTLE; // should make the thing pass harmlessly if no unit chosen
	if(self.me.turn < 4 || true){ // TODO random unit generation
		to_build = SPECS.PILGRIM;
	}
	else if(self.me.turn < 40){
		to_build = SPECS.CRUSADER;
	}
	else{
		to_build = SPECS.PROPHET;
	}
	return rand_build(self, to_build, availableDirections);
};

export default castle;
