import {BCAbstractRobot, SPECS} from 'battlecode';
import util from './util.js';

var pilgrim = {};

pilgrim.init = (self) => {
	//Record base
	var visibleRobots = self.getVisibleRobots();
	self.base = visibleRobots.filter(robot => robot.team === self.me.team && robot.unit === SPECS.CASTLE)[0];

	/** Init move list. Similar to crusader*/
	let diff_list = [];
	let rev_diff_list = [];
	for (let j = -2; j < 3; j++){
		for (let i = -2; i < 3; i++){
			if ((i * i + j * j <= 4) && (i !== 0 || j !== 0)){
				diff_list.push({x:i, y:j});
				rev_diff_list.push({x:-i, y:-j});
			}
		}
	}
	self.diff_list = diff_list;
	self.rev_diff_list = rev_diff_list;

	/** BFS distances*/
	let fuel_locs = [];
	for (let j = 0; j < self.map_s_y; j++){
		for (let i = 0; i < self.map_s_x; i++){
			if (self.fuel_map[j][i]){
				fuel_locs.push({x:i, y:j});
			}
		}
	}
	//self.path_fuel = util.bfs(self, fuel_locs);
	let karb_locs = [];
	for (let j = 0; j < self.map_s_y; j++){
		for (let i = 0; i < self.map_s_x; i++){
			if (self.karbonite_map[j][i]){
				fuel_locs.push({x:i, y:j});
			}
		}
	}
	//self.path_karb = util.bfs(self, karb_locs);
};

pilgrim.turn = (self) => {
	var visibleRobots = self.getVisibleRobots();
	
	var dx = self.base.x - self.me.x, dy = self.base.y - self.me.y;

	if(util.can_mine(self)){
		return self.mine();
	}
	else if(dx*dx + dy*dy <= 2){
		return self.give(dx, dy, self.me.karbonite, self.me.fuel);
	}
};

export default pilgrim;
