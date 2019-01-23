import {BCAbstractRobot, SPECS} from 'battlecode';

var util = {};

const max_dist = 100000;

const DIRECTIONS = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];

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
	if(util.is_open(robot, robot.me.x+dx, robot.me.y+dy) && robot.karbonite > SPECS.UNITS[unit].CONSTRUCTION_KARBONITE && robot.fuel > SPECS.UNITS[unit].CONSTRUCTION_FUEL && robot.map[robot.me.x+dx][robot.me.y+dy] && dx*dx + dy*dy <= 2) return true;
	return false
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

export default util
