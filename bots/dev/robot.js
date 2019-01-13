import {BCAbstractRobot, SPECS} from 'battlecode';

var built = false;
var step = -1;

class MyRobot extends BCAbstractRobot {
	turn() {
		step++;

		switch(this.me.unit){
			case SPECS.CASTLE: // 0
				robot.log("Castle health: " + robot.me.health + " on turn " + step);
				break;
			case SPECS.CHURCH: // 1
				break;
			case SPECS.PILGRIM: // 2
				break;
			case SPECS.CRUSADER: // 3
				break;
			case SPECS.PROPHET: // 4
				break;
			case SPECS.PREACHER: // 5
				break;
			default:
				this.log("HELP UNRECOGNIZED UNIT TYPE");
		}
	}

}

function can_attack(robot, dx, dy){
	var rsq = dx*dx + dy*dy;
	if(SPECS.UNITS[robot.me.unit].ATTACK_FUEL_COST <= fuel && rsq >= SPECS.UNITS[robot.me.unit].ATTACK_RADIUS[0] && rsq <= SPECS.UNITS[robot.me.unit].ATTACK_RADIUS[1]) return true;
	return false;
}

function can_buildUnit(robot, unit, dx, dy){
	if(robot.karbonite > SPECS.UNITS[unit].CONSTRUCTION_KARBONITE && robot.fuel > SPECS.UNITS[unit].CONSTRUCTION_FUEL && this.map[this.me.x+dx][this.me.y+dy] && dx*dx + dy*dy <= 2) return true;
	return false
}

function can_mine(robot){
	var x = robot.me.x, y = robot.me.y;
	if(this.karbonite_map[x][y] && r.me.karbonite < SPECS.UNITS[robot.me.unit].KARBONITE_CAPACITY) return true;
	if(this.fuel_map[x][y] && r.me.fuel < SPECS.UNITS[robot.me.unit].FUEL_CAPACITY) return true;
	return false;
}

function can_move(robot, dx, dy){
	var rsq = dx*dx + dy*dy;
	if(rsq * SPECS.UNITS[robot.me.unit].FUEL_PER_MOVE <= robot.fuel && rsq <= SPECS.UNITS[robot.me.unit].SPEED) return true;
	return false;
}

var robot = new MyRobot();
