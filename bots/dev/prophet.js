import {BCAbstractRobot, SPECS} from 'battlecode';
import util from './util.js';

var prophet = {};

const max_dist = 100000;

const DIAGONALS = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
const STRAIGHTS = [[2, 0], [0, 2], [-2, 0], [0, -2]];

const TURTLING = 0;
const CHARGING = 1;

prophet.init = (self) => {
	let diff_list = [];
	let rev_diff_list = [];
	for (let j = -3; j < 4; j++){
		for (let i = -3; i < 4; i++){
			if ((i * i + j * j <= 4) && (i !== 0 || j !== 0)){
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



	// TOOD ELAINE WRITE INITIALIZE CODE HERE
	self.state = TURTLING;
	self.creator = undefined;
	self.creator_id = undefined;
	for (var robot of self.getVisibleRobots()) {
		if ((robot.unit === SPECS.CASTLE) || (robot.unit === SPECS.CHURCH)) {
			self.creator_id = robot.id;
			self.creator = robot;
			self.turtle_radius = (robot.unit === SPECS.CASTLE) ? 4 : 2
		}
	}
	if (robot.creator_id === undefined) {
		self.log("BIG ERROR THERE IS NO CREATOR DLKJFLS:DKFJ:SIDFJ:SLJF:SLDFJI:LSDKFJS:LDKFJDLS:KFJ");
	}
	self.next_to_creator = true;

	self.visible_close_to_far = util.close_to_far(1, SPECS.UNITS[SPECS.PROPHET].VISION_RADIUS);
	self.attack_close_to_far = util.close_to_far(SPECS.UNITS[SPECS.PROPHET].ATTACK_RADIUS[0], SPECS.UNITS[SPECS.PROPHET].ATTACK_RADIUS[1]);
	self.log(self.attack_close_to_far);
};

prophet.turn = (self) => {

	self.availableDirections = util.find_open_adjacents(self);
	self.nearest = util.nearest_units(self, self.visible_close_to_far);
	self.friendlies = self.nearest.friendlies;
	self.enemies = self.nearest.enemies;

	self.attackable_enemies = []; // contains duplicates
	self.signaling_enemies.forEach((enemy) => {
		if (util.between(SPECS.UNITS[SPECS.PROPHET].ATTACK_RADIUS[0], SPECS.UNITS[SPECS.PROPHET].ATTACK_RADIUS[1], util.squared_distance({x:enemy.dx, y:enemy.dy}, {x: 0, y: 0}))) {
			self.attackable_enemies.push(enemy)
		}
	});
	self.enemies.forEach((enemy) => {
		if (util.between(SPECS.UNITS[SPECS.PROPHET].ATTACK_RADIUS[0], SPECS.UNITS[SPECS.PROPHET].ATTACK_RADIUS[1], util.squared_distance({x:enemy.dx, y:enemy.dy}, {x: 0, y: 0}))) {
			self.attackable_enemies.push(enemy)
		}
	});

	var new_state = TURTLING

	// add code to adjust state... 
	// TODO if creator died all prophets in turtle should change to charging mode

	self.state = new_state;


	switch (self.state) {
		case TURTLING:
			return turn_turtle(self);
			break;
		case CHARGING:
			return turn_not_turtling(self);
			break;
	}
};

//turtle with max radius self.turtle_radius
function turn_turtle(self) {

	for (let i = 0; i < self.attackable_enemies.length; i++) {
		if (util.can_attack(self, self.attackable_enemies[i].dx, self.attackable_enemies[i].dy)) {
			return self.attack(self.attackable_enemies[i].dx, self.attackable_enemies[i].dy);
		}
	}

			
	//Making sure first layer of turtle is complete
	/*if (util.is_open(self, robot.x+1, robot.y+1) || util.is_open(self, robot.x+1, robot.y-1) ||util.is_open(self, robot.x-1, robot.y+1) ||util.is_open(self, robot.x-1, robot.y-1)){
		return;
	}*/
	let myd = dist_from_creator(self.me);
	let dir_from_creator = [self.creator.x-self.me.x, self.creator.y-self.me.y];
	let move_outwards = (myd === 1);

	self.friendlies.forEach((friend) => {
		let friend_dir = [self.creator.x-friend.x, self.creator.y-friend.y];
		if (dotproduct(friend_dir, dir_from_creator) > 0 && util.between(1,2,myd - dist_from_creator(friend))) {
			move_outwards = true;
		}
	});
	move_outwards &= (myd < self.turtle_radius);

	if (move_outwards) {
		let possible_dirs = []
		for (var d of DIAGONALS) {
			if (dist_from_creator({x:self.me.x+d[0], y:self.me.y+d[1]}) > myd) {
				possible_dirs.push(d);
			}
		}
		possible_dirs = util.shuffle(possible_dirs);
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
			if (dist_from_creator({x:self.me.x+d[0], y:self.me.y+d[1]}) === myd) {
				possible_dirs.push(d);
			}
		}
		possible_dirs = util.shuffle(possible_dirs);
		for (var d of possible_dirs) {
			if (util.can_move(self, d[0], d[1])) {
				return self.move(d[0], d[1]);
			}
		}
	}

	// //Calculate which direction to move out diagonally
	// var dx = robot.x - self.me.x, dy = robot.y - self.me.y;
	// var x_dir = -Math.sign(dx);
	// var y_dir = -Math.sign(dy);

	// //Move out from castle diagonally if already one away.
	// //If not possible, then move diagonally in other directions.
	// if (Math.abs(dx) === 1 && Math.abs(dy) === 1){
	// 	if (util.can_move(self, x_dir, y_dir)){
	// 		return self.move(x_dir, y_dir);
	// 	}
	// 	else{
	// 		//Calculate possible directions can move in other than directly diagonal from castle
	// 		let dirs = []
	// 		if (dotproduct([1, 1], [x_dir, y_dir]) === 0){
	// 			dirs.push([1, 1]);
	// 		}
	// 		if (dotproduct([1, -1], [x_dir, y_dir]) === 0){
	// 			dirs.push([1, -1]);
	// 		}
	// 		if (dotproduct([-1, 1], [x_dir, y_dir]) === 0){
	// 			dirs.push([-1, 1]);
	// 		}
	// 		if (dotproduct([-1, -1], [x_dir, y_dir]) === 0){
	// 			dirs.push([-1, -1]);
	// 		}

	// 		//Move in one of those directions
	// 		for (var i in dirs){
	// 			if (util.can_move(self, dirs[i][0], dirs[i][1])){
	// 				return self.move(dirs[i][0], dirs[i][1]);
	// 			}
	// 		}	
	// 	}
	// } 

	//Move to the side
	/*else {
		if (Math.abs(dx) === 2 && Math.abs(dy) === 2){
			return;
		}
		if (util.can_move(self, -2*x_dir, 0) && Math.abs(dx) <= 2 || Math.abs(dy) <= 2){
			return self.move(-2*x_dir, 0);
		}
		if (util.can_move(self, 0, -2*y_dir) && Math.abs(dx) <=2 || Math.abs(dy) <= 2){
			return self.move(0, -2*y_dir);
		}
		
	}*/
}

function dotproduct(a,b) {
	var n = 0, lim = Math.min(a.length,b.length);
	for (var i = 0; i < lim; i++) n += a[i] * b[i];
	return n;
 }

function dist_from_creator(robot) {
	let loc = [robot.x - self.creator.x, robot.y - self.creator.y];
	return Math.abs(dotproduct(loc, [1, 1])/2)+Math.abs(dotproduct(loc, [1, -1])/2)
}


function turn_not_turtling(self) {
	//First check for visible enemies
	var visibleRobots = self.getVisibleRobots();
	for(var robot of visibleRobots){
		if(robot.team != self.me.team){
			self.log("Prophet found enemy");
			var dx = robot.x - self.me.x, dy = robot.y - self.me.y;
			if(util.can_attack(self, dx, dy)){
				self.log("Prophet attacking");
				return self.attack(dx, dy);
			}
			//try to move toward it
		}
	}

	//If nothing then move according to plan
	let dir_weights = self.dir_weights[self.me.y][self.me.x];
	let rand = Math.random();
	let tot = 0;
	for (let i = 0; i < dir_weights.length; i++){
		tot += dir_weights[i];
	}
	if (tot === 0){
		// TODO: make knight return to start or something when reaches end
		return;
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

export default prophet;
