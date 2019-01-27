import {BCAbstractRobot, SPECS} from 'battlecode';
import castle from './castle.js';
import church from './church.js';
import pilgrim from './pilgrim.js';
import crusader from './crusader.js';
import prophet from './prophet.js';
import preacher from './preacher.js';

class MyRobot extends BCAbstractRobot{
	constructor(){
		super();
		this.inited = false;
	}

	init(){
		if(this.inited) return;
		this.map_s_y = this.map.length;
		this.map_s_x = this.map[0].length;
		this.inited = true;
		switch(this.me.unit){
			case SPECS.CASTLE:
				return castle.init(this);
			case SPECS.CHURCH:
				return church.init(this);
			case SPECS.PILGRIM:
				return pilgrim.init(this);
			case SPECS.CRUSADER:
				return crusader.init(this);
			case SPECS.PROPHET:
				return prophet.init(this);
			case SPECS.PREACHER:
				return preacher.init(this);
		}
	}
	
	turn(){
		this.castleTalk(this.me.unit << 5)
		if(!this.inited){
			this.init();
		}

		switch(this.me.unit){
			case SPECS.CASTLE:
				return castle.turn(this);
			case SPECS.CHURCH:
				return church.turn(this);
			case SPECS.PILGRIM:
				return pilgrim.turn(this);
			case SPECS.CRUSADER:
				return crusader.turn(this);
			case SPECS.PROPHET:
				return prophet.turn(this);
			case SPECS.PREACHER:
				return preacher.turn(this);
			default:
				this.log("HELP UNRECOGNIZED UNIT TYPE");
		}
	}
}
