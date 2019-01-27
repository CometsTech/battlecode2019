import {BCAbstractRobot, SPECS} from 'battlecode';

var util = {};

const max_dist = 100000;

const DIRECTIONS = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];

class PriorityQueue{
	/** A min heap by its element's val property
	 * This is a simple binary heap. Could be improved by using a better data structure like a fibbonacci heap.*/
	constructor(){
		this.a = [0]; // element at index 0 doesn't matter
	}
	push(e){
		let i = this.a.length;
		this.a.push(e); // kinda redundant
		while (i > 1 && this.a[i >> 1].val > e.val){
			this.a[i] = this.a[i >> 1];
			i >>= 1; // lol
		}
		this.a[i] = e;
	}
	pop(){
		let o = this.a[1];
		let e = this.a.pop(); // this is the element that is moving down the tree
		if (this.a.length === 1) {return o;}
		// maybe replace the pop with something more efficient
		let i = 1;
		while (1){
			if ((i << 1) < this.a.length && this.a[i << 1].val < e.val){
				this.a[i] = this.a[i << 1];
				i = i << 1;
			}
			else if ((i << 1) + 1 < this.a.length && this.a[(i << 1) + 1].val < e.val){
				this.a[i] = this.a[(i << 1) + 1];
				i = (i << 1) + 1;
			}
			else{
				break;
			}
		}
		this.a[i] = e;
		return o;
	}
	is_empty(){
		return this.a.length <= 1;
	}
}

// const SIGNALS

// util.CONSTANTS = {DIRECTIONS: DIRECTIONS,
// 					SIGNALS: SIGNALS}

util.find_open_adjacents = (robot) => {
	var open = [];
	var x = robot.me.x, y = robot.me.y;
	for(var d of DIRECTIONS){
		if(util.is_open(robot, x+d[0], y+d[1])) open.push(d);
	}
	return open;
};

util.can_attack = (robot, dx, dy) => {
	var rsq = dx*dx + dy*dy;
	if(SPECS.UNITS[robot.me.unit].ATTACK_FUEL_COST <= robot.fuel && rsq >= SPECS.UNITS[robot.me.unit].ATTACK_RADIUS[0] && rsq <= SPECS.UNITS[robot.me.unit].ATTACK_RADIUS[1]) return true;
	return false;
};

util.can_buildUnit = (robot, unit, dx, dy, override_savings=0) => {
	// let min_karb = Math.min(robot.me.turn, 50);
	// let min_fuel = Math.min(robot.me.turn * 4, 200);
	let min_karb = 50;
	let min_fuel = 200;
	if (Math.random() < override_savings) {
		min_karb = 0;
		min_fuel = 0;
	}
	return (util.is_open(robot, robot.me.x+dx, robot.me.y+dy) &&
		robot.karbonite > SPECS.UNITS[unit].CONSTRUCTION_KARBONITE + min_karb&&
		robot.fuel > SPECS.UNITS[unit].CONSTRUCTION_FUEL + min_fuel&&
		robot.map[robot.me.x+dx][robot.me.y+dy] && dx*dx + dy*dy <= 2);
};

util.can_mine = (robot) => {
	var x = robot.me.x, y = robot.me.y;
	if(robot.karbonite_map[y][x] && robot.me.karbonite < SPECS.UNITS[robot.me.unit].KARBONITE_CAPACITY) return true;
	if(robot.fuel_map[y][x] && robot.me.fuel < SPECS.UNITS[robot.me.unit].FUEL_CAPACITY) return true;
	return false;
};

util.can_move = (robot, dx, dy) => {
	var rsq = dx*dx + dy*dy;
	if(util.is_open(robot, robot.me.x+dx, robot.me.y+dy) && rsq * SPECS.UNITS[robot.me.unit].FUEL_PER_MOVE <= robot.fuel && rsq <= SPECS.UNITS[robot.me.unit].SPEED) return true;
	return false;
};

util.is_open = (robot, x, y) => {
	if(x < 0 || y < 0 || x >= robot.map.length || y >= robot.map.length) return false;
	if(robot.map[y][x] && robot.getVisibleRobotMap()[y][x] <= 0) return true;
	return false;
};


// from charles
util.make_array_helper = (e, l_s, s, end) => {
    /** don't use this this is to help with make_array */
    if (s === end){
        return e;
    }
    if (s + 1 === end){
        let a = [];
        for (let i = 0; i<l_s[s]; i++){
            a.push(e);
        }
        return a;
    }
    let a = [];
    for (let i = 0; i < l_s[s]; i++){
        a.push(util.make_array_helper(e, l_s, s + 1, end));
    }
    return a;
};

util.make_array = (e, l_s) => {
    /** makes an n-d array. The array is filled with e.
     * To make a nxm matrix filled with zeros, call make_array(0, [n, m])*/
    return util.make_array_helper(e, l_s, 0, l_s.length);
};

util.add_pos = (a, b) => {
    /** Adds together two vector positions.*/
    return {x: a.x + b.x, y: a.y + b.y};
};

util.on_map = (robot, a) => {
	/** Given a position, tells if it is on the map*/
	return a.x >= 0 && a.y >= 0 && a.x < robot.map_s_x && a.y < robot.map_s_y;
};

util.bfs = (robot, pos_list) => {
	/** Performs a basic BFS distance calculation
	 * Probably need to factor in a know impassable list for castles and churches*/
	let pathing_map = util.make_array(max_dist, [robot.map_s_y, robot.map_s_x]);
	let path_q = []; // apparently javascript copy is weird
	for (let i = 0; i < pos_list.length; i++){
		path_q.push(pos_list[i]);
		pathing_map[pos_list[i].y][pos_list[i].x] = 0;
	}
	while (path_q.length > 0){
		let pos = path_q.shift();
		for (let i = 0; i < robot.diff_list.length; i++) {
			let p = util.add_pos(pos, robot.diff_list[i]);
			let p_d = pathing_map[pos.y][pos.x] + 1;
			if (util.on_map(robot, p) && robot.map[p.y][p.x] && p_d < pathing_map[p.y][p.x]) {
				pathing_map[p.y][p.x] = p_d;
				path_q.push(p);
			}
		}
	}
	return pathing_map;
};

util.squared_distance = (a, b) => {
	return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
};

util.between = (min, max, num) => {
	return ((num <= max) && (num >= min));
};

util.close_to_far = (mindist, maxdist) => {
	let max1d = Math.ceil(Math.sqrt(maxdist));
	let retval = [];
	for (let i = 1; i <= max1d; i++) {
		if (util.between(mindist, maxdist, i*i)) {
			retval.push({x: i, y: 0}, {x: -i, y: 0}, {x: 0, y: -i}, {x: 0, y: i});
		}
		for (let j = 1; j < i; j++) {
			if (util.between(mindist, maxdist, i*i+j*j)) {
				retval.push({x: i, y: j}, {x: -i, y: j}, {x: i, y: -j}, {x: -i, y: -j},
							{x: j, y: i}, {x: -j, y: i}, {x: j, y: -i}, {x: -j, y: -i});
			}
		}
		if (util.between(mindist, maxdist, 2*i*i)) {
			retval.push({x: i, y: i}, {x: -i, y: i}, {x: i, y: -i}, {x: -i, y: -i});
		}
	}
	return retval;
};

util.nearest_units = (robot, close_to_far) => {
	let map = robot.getVisibleRobotMap();
	let retval = {friendlies: [], enemies: [], nearest_enemy_attacker: undefined, signaling_enemies: []};
	close_to_far.forEach( (dir) => {
		let abs = {x: robot.me.x + dir.x, y: robot.me.y+dir.y};
		if ((abs.x < 0) || (abs.x >= robot.map_s_x) || (abs.y < 0) || (abs.y >= robot.map_s_x)) {
			return;
		}
		if (map[abs.y][abs.x] > 0) {
			let looking_at = robot.getRobot(map[abs.y][abs.x]);
			if (looking_at.team !== robot.me.team) {
				retval.enemies.push({dx: dir.x, dy: dir.y, robot: looking_at});
				if (retval.nearest_enemy_attacker === undefined) {
					if ((looking_at.unit === SPECS.CASTLE) || (looking_at.unit === SPECS.PREACHER) || (looking_at.unit === SPECS.CRUSADER) || (looking_at.unit === SPECS.PROPHET)) {
						retval.nearest_enemy_attacker = {dx: dir.x, dy: dir.y, robot: looking_at};
						robot.log("Found nearest enemy attacker!");
						robot.log(retval.nearest_enemy_attacker);
					}
				}
				if (robot.isRadioing(looking_at)) {
					signaling_enemies.push({dx: dir.x, dy: dir.y, robot: looking_at});
				}
			}
			else {
				retval.friendlies.push({dx: dir.x, dy: dir.y, robot: looking_at});
			}
		}
	} );
	return retval;
};

util.closest_direction = (dx, dy) => {
	var best_dir = [0, 0];
	let max = 0;
	let cur = 0;
	for (var dir of DIRECTIONS) {
		cur = (dir[0]*dx + dir[1]*dy)/Math.sqrt(dir[0]*dir[0]+dir[1]*dir[1]);
		if (cur > max) {
			max = cur;
			best_dir = dir;
		}
	}
	return {dx: best_dir[0], dy: best_dir[1]}
};

util.rand_int = (n) => {
	if (n === 0){
		throw "rand_int n should be greater than 0";
	}
	return Math.floor(n * Math.random());
};

util.rand_weight = (a) => {
	let tot = 0;
	for (let i = 0; i < a.length; i++){
		tot += a[i];
	}
	let rand_cap = tot * Math.random();
	tot = 0;
	for (let i = 0; i < a.length; i++){
		tot += a[i];
		if (tot > rand_cap){return i;}
	}
	throw 'rand_weight wut';
};

util.pilgrim_make_tree = (self, loc_list) => {
	/** Calculates the voronoi tree and pathing data based on the location list passed in.
	 * This is for worker pathing to disperse workers effectively.
	 * Assumes root is at location 0 in list.
	 * @returns an object containing tree_info, voronoi_id, voronoi_dist, and child_dists
	 * tree_info is a list which, for each location in loc_list, has a information object that includes
	 *      parent: the index of this node's parent
	 *      p_index: the index of this node in the children list of this node's parent
	 *      children: a list of the indices of the children of this node.
	 *      node_weight: the number of nodes that are this node or this node's descendant
	 *      x & y: the location of this node
	 *
	 * voronoi_id is a 2d array, which, for each location gives the index of the nearest node
	 * voronoi_dist is a 2d array that gives the distance to the nearest node
	 * child_dists gives, for each child of the nearest node, the distance to that child*/
	/* The following bit calculates the voronoi cells by BFS'ing outwards from each resource.
    * It calculates voronoi_id and voronoi_dist, along with the neighbor list for calculating the node graph*/
	let path_q = [];
	let voronoi_dist = util.make_array(max_dist, [self.map_s_y, self.map_s_x]); // the distance to nearest resource
	let voronoi_id = util.make_array( -1, [self.map_s_y, self.map_s_x]); // the index of the resource its near
	for (let i = 0; i < loc_list.length; i++){
		path_q.push({x: loc_list[i].x, y: loc_list[i].y, i: i, d: 0});
		voronoi_dist[loc_list[i].y][loc_list[i].x] = 0;
		voronoi_id[loc_list[i].y][loc_list[i].x] = i;
	}
	let all_pairs = [];
	let pair_dict = []; // A very, very dumb hash map. Should be good enough for this purpose.
	for (let i = 0; i < 4093; i++){ // God help us if they ever change the maximum map size.
		pair_dict.push([]);
	}
	// main loop for voronoi_*
	while (path_q.length > 0){
		let pos = path_q.shift();
		for (let i = 0; i < self.diff_list.length; i++){
			let p = {x: pos.x + self.diff_list[i].x, y:pos.y + self.diff_list[i].y, i: pos.i, d: pos.d + 1};
			// more edge cases if fuel distances
			if (util.on_map(self, p) && self.map[p.y][p.x] && voronoi_id[p.y][p.x] !== p.i){
				if (voronoi_id[p.y][p.x] === -1){ // if expanding into new territory
					voronoi_id[p.y][p.x] = p.i; // if
					voronoi_dist[p.y][p.x] = p.d;
					path_q.push(p);
				}
				else{ // this cell is already covered: this is an edge between two voronoi cells
					let j = voronoi_id[p.y][p.x];
					let hash = ((((p.i ^ 3456) * (j ^ 3456)))%4093); // dumbest hash ever. Note that it's symmetric
					let duplicate = false;
					for (let k = 0; k < pair_dict[hash].length; k++){ // checking if this pair is already in dict
						let test_pair = pair_dict[hash][k];
						if ((test_pair.i === p.i && test_pair.j === j) ||
							(test_pair.i === j && test_pair.j === p.i)){
							duplicate = true;
							break;
						}
					}
					if (!duplicate){
						pair_dict[hash].push({i: p.i, j: j, d: p.d + voronoi_dist[p.y][p.x]});
						all_pairs.push({i: p.i, j: j, d: p.d + voronoi_dist[p.y][p.x]});
					}
					// no further distance corrections needed because of turn counting instead of fuel
				}
			}
		}
	}
	// this.log(all_pairs);
	/* processing the pair list into a better format*/
	let neighbor_list = [];
	for (let i = 0; i < loc_list.length; i++){
		neighbor_list.push([]);
	}
	for (let i = 0; i < all_pairs.length; i++){
		neighbor_list[all_pairs[i].i].push({i: all_pairs[i].j, d: all_pairs[i].d});
		neighbor_list[all_pairs[i].j].push({i: all_pairs[i].i, d: all_pairs[i].d});
	}
	// this.log(neighbor_list);
	let tree_info = [];
	for (let i = 0; i < loc_list.length; i++){
		tree_info.push({parent:-1, p_index:-1, children: [], node_weight: 1, x: loc_list[i].x, y: loc_list[i].y});
	}
	/* making the node tree by dijkstra*/
	let node_dists = util.make_array(max_dist, [loc_list.length]);
	node_dists[0] = 0;
	let q = new PriorityQueue();
	q.push({val: 0, i: 0});
	while (!q.is_empty()){ // main loop for tree making
		let e = q.pop();
		if (node_dists[e.i] < e.val){
			continue; // if this element is out of date, then it's already been processed bc min heap property
		}
		for (let j = 0; j < neighbor_list[e.i].length; j++){
			let f = neighbor_list[e.i][j];
			if (node_dists[f.i] > node_dists[e.i] + f.d){
				node_dists[f.i] = node_dists[e.i] + f.d;
				tree_info[f.i].parent = e.i; // note that parent can be overwritten a few times
				tree_info[f.i].distance = node_dists[f.i];
				tree_info[f.i].node_weight = 1 / node_dists[f.i];
				q.push({val: node_dists[f.i], i: f.i});
			}
		}
	}
	for (let i = 1; i < loc_list.length; i++){ // setting children and p_index
		let node_info = tree_info[i];
		// this.log(node_info.parent);
		node_info.p_index = tree_info[node_info.parent].children.length;
		// TODO: fix when map is cut into separate pieces by walls.
		tree_info[node_info.parent].children.push(i);
	}
	/* This next bit sets the node_weight */
	let covered = util.make_array(false, loc_list.length);
	let weight_q = [];
	for (let i = 0; i < loc_list.length; i++){
		if (tree_info[i].children.length === 0){ // if leaf
			weight_q.push(i);
			covered[i] = true;
		}
	}
	while (weight_q.length > 0){
		let i = weight_q.shift();
		if (i === 0) {continue;} // root has no parent
		tree_info[tree_info[i].parent].node_weight += tree_info[i].node_weight;
		if (!covered[tree_info[i].parent]){
			weight_q.push(tree_info[i].parent);
			covered[tree_info[i].parent] = true;
		}
	}
	/* sets child_dists.*/
	let child_dists = util.make_array([], [self.map_s_y, self.map_s_x]); // the -1 is unimportant
	for (let y = 0; y < self.map_s_y; y++){
		for (let x = 0; x < self.map_s_x; x++){
			let i = voronoi_id[y][x];
			if (i < 0) {continue;} // this ought to be the walls
			child_dists[y][x] = util.make_array(max_dist, tree_info[voronoi_id[y][x]].children.length);
		}
	}
	path_q = [];
	for (let y = 0; y < self.map_s_y; y++){
		for (let x = 0; x < self.map_s_x; x++){
			let i = voronoi_id[y][x];
			if (i <= 0) {continue;} // root has no parent & walls dont path
			path_q.push({x: x, y: y, d: voronoi_dist[y][x], // most of these will get pruned, so maybe optimize
				i: i, p: tree_info[i].parent, p_i: tree_info[i].p_index});
		}
	}
	while (path_q.length > 0){
		let e = path_q.shift();
		for (let d_i = 0; d_i < self.diff_list.length; d_i++){
			let f = {x:e.x + self.diff_list[d_i].x, y: e.y + self.diff_list[d_i].y, d: e.d + 1,
				i: e.i, p: e.p, p_i: e.p_i};
			if (!util.on_map(self, f) || !self.map[f.y][f.x] || voronoi_id[f.y][f.x] !== f.p ||
				child_dists[f.y][f.x][f.p_i] <= f.d){
				continue;
			}
			child_dists[f.y][f.x][f.p_i] = f.d;
			path_q.push(f);
		}
	}
	return {tree_info: tree_info, voronoi_dist: voronoi_dist, voronoi_id: voronoi_id, child_dists: child_dists};
};

util.get_tree_dist = (self, p) => {
	/* Gets the distance associated with the location p.x, p.y to the node p.i*/
	let id = self.tree_data.voronoi_id[p.y][p.x];
	if (id === p.i){
		return self.tree_data.voronoi_dist[p.y][p.x];
	}
	else if (id === -1){
		return max_dist;
	}
	else if (id === self.tree_data.tree_info[p.i].parent){
		return self.tree_data.child_dists[p.y][p.x][self.tree_data.tree_info[p.i].p_index];
	}
	else {
		return max_dist;
	}
};
export default util
