import {BCAbstractRobot, SPECS} from 'battlecode';
import util from './util.js';

var castle = {};

castle.init = (self) => {
	self.log("Start of game");
};

castle.turn = (self) => {
	self.log("Castle health: " + self.me.health + " on turn " + self.me.turn + " with time " + self.me.time);
	var availableDirections = util.find_open_adjacents(self);
	for(var d of availableDirections){
		if(util.can_buildUnit(self, SPECS.CRUSADER, d[0], d[1])){
			return self.buildUnit(SPECS.CRUSADER, d[0], d[1]);
		}
	}
};

export default castle;
