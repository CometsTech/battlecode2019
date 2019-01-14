import {BCAbstractRobot, SPECS} from 'battlecode';

var step = -1;
const DIRECTIONS = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]];

class MyRobot extends BCAbstractRobot {
	constructor(){
		super();
		this.inited = false;
	}

	init(){
		switch(this.me.unit){
			case SPECS.CASTLE:
				break;
			case SPECS.CHURCH:
				break;
			case SPECS.PILGRIM:
				this.actionMode = 1 // 1 = gathering, 2 = returning
				this.infoMap = this.karbonite_map;
				for(var i = 0; i < this.map.length; i++){
					for(var j = 0; j < this.map.length; j++){
						if(this.fuel_map[i][j]){
							infoMap[i][j] = true;
						}
					}
				}
				//TODO: Find closest mining location
				this.destination = [];
				break;
			case SPECS.CRUSADER:
				break;
			case SPECS.PROPHET:
				break;
			case SPECS.PREACHER:
				break;
			default:
				this.log("HELP UNRECOGNIZED UNIT TYPE");
		}
	}

	turn(){
		step++;
		if(!this.inited) this.init();


		switch(this.me.unit){
			case SPECS.CASTLE: // 0
				this.log("Castle health: " + this.me.health + " on turn " + step + " with time " +this.me.time);
				var availableDirections = find_open_adjacents(this);
				for(var d of availableDirections){
					if(can_buildUnit(this, SPECS.PILGRIM, d[0], d[1])){
						return this.buildUnit(SPECS.PILGRIM, d[0], d[1]);
					}
				}
				break;
			case SPECS.CHURCH: // 1
				break;
			case SPECS.PILGRIM: // 2
				if(can_mine(this)){
					this.log("Mining");
					return this.mine();
				}
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

function find_open_adjacents(robot){
	var open = [];
	var x = robot.me.x, y = robot.me.y;
	for(var d of DIRECTIONS){
		if(is_open(robot, x+d[0], y+d[1])) open.push(d);
	}
	return open;
}

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
	if(robot.map[y][x] && robot.getVisibleRobotMap()[y][x] <= 0) return true;
	return false;
}

var robot = new MyRobot();
