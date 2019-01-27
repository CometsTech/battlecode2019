import {BCAbstractRobot, SPECS} from 'battlecode';
import util from './util.js';

var crusader = {};

const max_dist = 100000;

function init_roamer(self){
	/** This generates the list of the possible moves that the crusader can make.
	 * rev_diff_list is the list that is the same as diff_list, but the direction is reversed. */
	let diff_list = [];
	let rev_diff_list = [];
	for (let j = -3; j < 4; j++){
		for (let i = -3; i < 4; i++){
			if ((i * i + j * j <= 9) && (i !== 0 || j !== 0)){
				diff_list.push({x:i, y:j});
				rev_diff_list.push({x:-i, y:-j});
			}
		}
	}
	self.diff_list = diff_list;

	/** This generates the distances to the starting position, not including units. This is a basic BFS search
	 * TODO: include the initial location of the castle in this pathing calculation*/
	self.pathing_map = util.make_array(max_dist, [self.map_s_y, self.map_s_x]);
	self.pathing_map[self.me.y][self.me.x] = 0;
	let path_q = [self.me]; // more accurately [{x: self.me.x, y: self.me.y}]
	let path_q_history = [];
	while (path_q.length > 0){
		let pos = path_q.shift();
		path_q_history.push(pos); // gonna need to change this or add a sort and dupli removal for fuel distances.
		for (let i = 0; i < diff_list.length; i++) {
			let p = util.add_pos(pos, diff_list[i]);
			let p_d = self.pathing_map[pos.y][pos.x] + 1;
			if (util.on_map(self, p) && self.map[p.y][p.x] && p_d < self.pathing_map[p.y][p.x]) {
				self.pathing_map[p.y][p.x] = p_d;
				path_q.push(p);
			}
		}
	}

	/** This generates the pathing weights. It will traces back the paths from each tile and
	 * counts the number of times exited in each direction.
	 * This is so that when followed randomly, it has a good chance of hitting every tile.
	 * It works by going through the bfs history backwards and pushes the weight of each square into the closest
	 * squares and then recording the flow of weights
	 *
	 * Maybe want to replace this with sometimes taking random path to the enemy castle
	 * A blitz player should take the shortest route.*/
	let map_weights = util.make_array(1, [self.map_s_y, self.map_s_x]); // number of tiles worth of path here
	let o_dir_cnts = util.make_array(0, [self.map_s_y, self.map_s_x, diff_list.length]); // counts of flow
	for (let j = path_q_history.length - 1; j >= 0; j--){
		let pos = path_q_history[j];
		let d = self.pathing_map[pos.y][pos.x];
		let next_list = [];
		for (let i = 0; i < diff_list.length; i++) {
			let p = util.add_pos(pos, rev_diff_list[i]);
			if (util.on_map(self, p) && self.map[p.y][p.x] && self.pathing_map[p.y][p.x] === d - 1) {
				next_list.push([i, p]);
			}
		} // note that if there is more than one next square, then it will distribute the weight evenly.
		for (let j = 0; j < next_list.length; j++){
			let ip = next_list[j];
			let p = ip[1];
			map_weights[p.y][p.x] += map_weights[pos.y][pos.x] / next_list.length;
			o_dir_cnts[p.y][p.x][ip[0]] += map_weights[pos.y][pos.x] / next_list.length;
		}
		map_weights[pos.y][pos.x] = 0;
	}
	self.dir_weights = o_dir_cnts;
}
function init_resourceror(self){
	let loc_list = [self.me];
	for (let j = 0; j < self.map_s_y; j++){
		for (let i = 0; i < self.map_s_x; i++){
			if (self.fuel_map[j][i]){
				fuel_locs.push({x:i, y:j});
				if (i !== self.me.x || j !== self.me.y){
					loc_list.push({x:i, y:j});
				}
			}
		}
	}
	// self.path_fuel = util.bfs(self, fuel_locs);
	for (let j = 0; j < self.map_s_y; j++){
		for (let i = 0; i < self.map_s_x; i++){
			if (self.karbonite_map[j][i]){
				karb_locs.push({x:i, y:j});
				if (i !== self.me.x || j !== self.me.y){
					loc_list.push({x:i, y:j});
				}
			}
		}

	}
	self.tree_data = util.pilgrim_make_tree(self, loc_list);
	self.current_node = 0;
}
crusader.init = (self) => {
	/** This generates the list of the possible moves that the crusader can make.
	 * rev_diff_list is the list that is the same as diff_list, but the direction is reversed. */
	let inv_diff_list = util.make_array(-1, [5, 5]);
	let diff_list = [];
	let rev_diff_list = [];
	for (let j = -2; j < 3; j++){
		for (let i = -2; i < 3; i++){
			if ((i * i + j * j <= 4) && (i !== 0 || j !== 0)){
				inv_diff_list[j + 2][i + 2] = diff_list.length;
				diff_list.push({x:i, y:j});
				rev_diff_list.push({x:-i, y:-j});
			}
		}
	}
	self.diff_list = diff_list;
	self.rev_diff_list = rev_diff_list;
	self.inv_diff_list = inv_diff_list;

	self.is_re_init = false;

	return init_roamer(self);
};

function turn_roamer(self){
	//If nothing then move according to plan
	let dir_weights = self.dir_weights[self.me.y][self.me.x];
	let rand = Math.random();
	let tot = 0;
	for (let i = 0; i < dir_weights.length; i++){
		tot += dir_weights[i];
	}
	if (tot === 0){
		init_roamer(self);
		return turn_roamer(self);
	}
	rand *= tot;
	let acc = 0;
	let dir_i = 0;
	for (let i = 0; i < dir_weights.length; i++){
		acc += dir_weights[i];
		if (acc > rand){
			dir_i = i;
			break;
		}
	}
	return self.move(self.diff_list[dir_i].x, self.diff_list[dir_i].y);
}
function turn_resourceror(self){
	return; //TODO
}
crusader.turn = (self) => {
	self.vis_bots = self.getVisibleRobots();
	let diff_vis = util.make_array(-1, [self.diff_list.length]);
	for (let i = 0; i < self.vis_bots.length; i++) {
		let rob = self.vis_bots[i];
		if (util.squared_distance(rob, self.me) <= 4 && rob.id !== self.me.id) {
			diff_vis[self.inv_diff_list[rob.y - self.me.y + 2][rob.x - self.me.x + 2]] = rob.id;
		}
	}
	self.diff_vis = diff_vis;


	//First check for visible enemies
	let visibleRobots = self.vis_bots;
	for (let i = 0; i < visibleRobots.length; i++){
		let robot = visibleRobots[i];
		if (robot.team !== self.me.team){
			self.log('Crusader found enemy');
			let dx = robot.x - self.me.x, dy = robot.y - self.me.y
			if(util.can_attack(self, dx, dy)){
				self.log("Crusader attacking");
				return self.attack(dx, dy);
			}
		}
	}

	return turn_roamer(self);
};

export default crusader;

