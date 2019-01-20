function can_attack(robot, dx, dy){
	var rsq = dx*dx + dy*dy;
	if(SPECS.UNITS[robot.me.unit].ATTACK_FUEL_COST <= fuel && rsq >= SPECS.UNITS[robot.me.unit].ATTACK_RADIUS[0] && rsq <= SPECS.UNITS[robot.me.unit].ATTACK_RADIUS[1]) return true;
	return false;
}

function can_buildUnit(robot, unit, dx, dy){
	if(is_open(robot, robot.me.x+dx, robot.me.y+dy) && robot.karbonite > SPECS.UNITS[unit].CONSTRUCTION_KARBONITE && robot.fuel > SPECS.UNITS[unit].CONSTRUCTION_FUEL && robot.map[robot.me.x+dx][robot.me.y+dy] && dx*dx + dy*dy <= 2) return true;
	return false
}

function can_mine(robot){
	var x = robot.me.x, y = robot.me.y;
	if(robot.karbonite_map[y][x] && robot.karbonite < SPECS.UNITS[robot.me.unit].KARBONITE_CAPACITY) return true;
	if(robot.fuel_map[y][x] && robot.fuel < SPECS.UNITS[robot.me.unit].FUEL_CAPACITY) return true;
	return false;
}

function can_move(robot, dx, dy){
	var rsq = dx*dx + dy*dy;
	if(is_open(robot, robot.me.x+dx, robot.me.y+dy) && rsq * SPECS.UNITS[robot.me.unit].FUEL_PER_MOVE <= robot.fuel && rsq <= SPECS.UNITS[robot.me.unit].SPEED) return true;
	return false;
}

function is_open(robot, x, y){
	if(x < 0 || y < 0 || x >= robot.map.length || y >= robot.map.length) return false;
	if(robot.map[y][x] && robot.getVisibleRobotMap()[y][x] <= 0) return true;
	return false;
}

export default util
