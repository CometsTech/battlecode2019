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
						if(this.fuel_map[j][i]){
							this.infoMap[j][i] = true;
						}
					}
				}
				this.destination = find_closest_destination(this.infoMap, this.me.x, this.me.y);
				this.pathsMemo = {};
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
	
		this.inited = true;
	}

	turn(){
		step++;
		if(!this.inited) this.init();


		switch(this.me.unit){
			case SPECS.CASTLE: // 0
				this.log("Castle health: " + this.me.health + " on turn " + step + " with time " + this.me.time);
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
				var destx = this.destination[0], desty = this.destination[1];
				//this.log(destx + " " + desty);
				if(this.getVisibleRobotMap()[desty][destx] > 0){ //TODO add more checks, which team, unit type
					this.infoMap[desty][destx] = 0;
					this.destination = find_closest_destination(this.infoMap, this.me.x, this.me.y);
				}
				//pathing(this.pathsMemo, this.map, SPECS.UNITS[SPECS.PILGRIM].SPEED, this.me.x, this.me.y, this.destination[0], this.destination[1]);

				generate_possible_moves(SPECS.UNITS[SPECS.PILGRIM].SPEED);
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

function pathing(memo, map, maxrsq, x1, y1, x2, y2){
	var hash = hash_path(x1, y1, x2, y2);
	if(memo.hasOwnProperty(hash)){
		return memo[hash];
	}
	if(x1 === x2 && y1 === y2){
		return [0, 0];
	}
	
	var x = x1, y = y1, possible_moves = generate_possible_moves(maxrsq);
	var queue = [], visited = {};
	queue.push([x1, y1]);
	visited[hash_coords(x1, y1)] = true;
	while(queue.length > 0){
		var coord = queue.shift();
		x = coord[0];
		y = coord[1];
		for(var move of possible_moves){
			var xnew = x + move[0], ynew = y + move[1];
			hash = hash_coords(xnew, ynew);
			if(!memo.hasOwnProperty(hash)){
				memo[hash] = true;
			}
		}
		break;
	}
}

function generate_possible_moves(maxrsq){
	/* returns a list of possible [dx, dy] up to maximum r^2 */
	//TODO make more general maybe?
	var possible = [];
	var max = Math.floor(Math.sqrt(maxrsq));
	for(var i = 1; i <= max; i++){
		possible.push([0, i]);
		possible.push([0, -i]);
		possible.push([i, 0]);
		possible.push([-i, 0]);
	}
	for(var i = 1; i <= max; i++){
		for(var j = 1; j <= max; j++){
			if(i*i + j*j <= maxrsq){
				possible.push([i, j]);
				possible.push([i, -j]);
				possible.push([-i, j]);
				possible.push([-i, -j]);
				possible.push([j, i]);
				possible.push([j, -i]);
				possible.push([-j, i]);
				possible.push([-j, -i]);
			}
		}
	}
	return possible;
}

function find_closest_destination(map, x, y){
	//TODO: Much more efficient than checking everything	
	var min = map.length*map.length, bestx = 0, besty = 0;
	for(var i = 0; i < map.length; i++){
		for(var j = 0; j < map.length; j++){
			if(map[j][i]){
				var rsq = (x-i)*(x-i) + (y-j)*(y-j);
				if(rsq < min){
					bestx = i;
					besty = j;
					min = rsq;
				}
			}
		}
	}
	return [bestx, besty]; //TODO: Better option if no destinations?
}

function find_open_adjacents(robot){
	var open = [];
	var x = robot.me.x, y = robot.me.y;
	for(var d of DIRECTIONS){
		if(is_open(robot, x+d[0], y+d[1])) open.push(d);
	}
	return open;
}

function hash_coords(x, y){
	return 100*x + y;
}

function hash_path(x1, y1, x2, y2){
	return 10000*hash_coords(x1, y1) + hash_coords(x2, y2);
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
	if(x < 0 || y < 0 || x >= robot.map.length || y >= robot.map.length) return false;
	if(robot.map[y][x] && robot.getVisibleRobotMap()[y][x] <= 0) return true;
	return false;
}

var robot = new MyRobot();
