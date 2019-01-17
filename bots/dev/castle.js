import {BCAbstractRobot, SPECS} from 'battlecode';

var castle = {};

castle.init = (self) => {
	self.log("New Castle");
};

castle.turn = (self) => {
	self.log("Castle health: " + self.me.health + " on turn " + self.me.turn + " with time " + self.me.time);
};

export default castle;
