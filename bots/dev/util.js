import {BCAbstractRobot, SPECS} from 'battlecode';

var util = {};

const max_dist = 100000;

const DIRECTIONS = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];

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

util.can_buildUnit = (robot, unit, dx, dy) => {
	let min_karb = Math.min(robot.me.turn, 50);
	let min_fuel = Math.min(robot.me.turn * 4, 200);
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
}

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
}

util.nearest_enemies = (robot, close_to_far) => {
	let map = robot.getVisibleRobotMap();
	let retval = [];
	for (dir of close_to_far) {
		if (map[dir.y][dir.x] > 0) {
			if (robot.getRobot(map[dir.y][dir.x]).team != robot.me.team) {
				retval.push({x: dir.x, y: dir.y, id: map[dir.y][dir.x]});
			}
		}
	}
	return retval;
}

util.rand_int = (n) => {
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
};

export default util
