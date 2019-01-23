import {BCAbstractRobot, SPECS} from 'battlecode';
import util from './util.js';

var castle = {};

castle.init = (self) => {
	self.log("Start of game");
};

castle.turn = (self) => {
	self.log("Castle health: " + self.me.health + " on turn " + self.me.turn + " with time " + self.me.time);
	var availableDirections = util.find_open_adjacents(self);
	if(self.me.turn < 4 || true){
		for(var d of availableDirections){
			if(util.can_buildUnit(self, SPECS.PILGRIM, d[0], d[1])){
				return self.buildUnit(SPECS.PILGRIM, d[0], d[1]);
			}
		}
	}
	else if(self.me.turn < 40){
		for(var d of availableDirections){
			if(util.can_buildUnit(self, SPECS.CRUSADER, d[0], d[1])){
				return self.buildUnit(SPECS.CRUSADER, d[0], d[1]);
			}
		}
	}
	else{
		for(var d of availableDirections){
			if(util.can_buildUnit(self, SPECS.PROPHET, d[0], d[1]) && Math.random() < 0.4){
				return self.buildUnit(SPECS.PROPHET, d[0], d[1]);
			}
		}
	}
};

export default castle;
