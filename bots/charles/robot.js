
import {BCAbstractRobot, SPECS} from 'battlecode';

let log_times = false;
let verbosity = 0;

let built = false;
let step = -1;
const max_dist = 100000;

function make_array_helper(e, l_s, s, end) {
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
        a.push(make_array_helper(e, l_s, s + 1, end));
    }
    return a;
}
function make_array(e, l_s) {
    /** makes an n-d array. The array is filled with e.
     * To make a nxm matrix filled with zeros, call make_array(0, [n, m])*/
    return make_array_helper(e, l_s, 0, l_s.length);
}

function add_pos(a, b){
    /** Adds together two vector positions.*/
    return {x: a.x + b.x, y: a.y + b.y};
}

class MyRobot extends BCAbstractRobot {
    constructor(){
        super();
        this.inited = false; // Has init been called yet
        this.map_s_x = 0; // The two map sizes
        this.map_s_y = 0;
        this.dist_ec = []; // in turns to enemy castle
        this.fuel_ec = []; // in fuel cost(for A* heuristics)
    }
    init() {
        if (this.inited){
            return;
        }
        this.map_s_y = this.map.length;
        this.map_s_x = this.map[0].length;
        this.inited = true;
        if (this.me.unit === SPECS.CRUSADER){
            this.init_crusader();
        }
        else if (this.me.unit == SPECS.PILGRIM){
            this.init_pilgrim();
        }
        else if (this.me.unit === SPECS.CASTLE){}
    }
    on_map(a){
        /** Given a position, tells if it is on the map*/
        return a.x >= 0 && a.y >= 0 && a.x < this.map_s_x && a.y < this.map_s_y;
    }
    bfs(pos_list){
        /** Performs a basic BFS distance calculation
         * Probably need to factor in a know impassable list for castles and churches*/

        let pathing_map = make_array(max_dist, [this.map_s_y, this.map_s_x]);
        let path_q = []; // apparently javascript copy is weird
        for (let i = 0; i < pos_list.length; i++){
            path_q.push(pos_list[i]);
            pathing_map[pos_list[i].y][pos_list.x] = 0;
        }
        while (path_q.length > 0){
            let pos = path_q.shift();
            for (let i = 0; i < diff_list.length; i++) {
                let p = add_pos(pos, diff_list[i]);
                let p_d = this.pathing_map[pos.y][pos.x] + 1;
                if (this.on_map(p) && this.map[p.y][p.x] && p_d < this.pathing_map[p.y][p.x]) {
                    this.pathing_map[p.y][p.x] = p_d;
                    path_q.push(p);
                }
            }
        }
        return pathing_map;
    }
    init_crusader() {
        if (verbosity > 0) {
            this.log('init_crusader');
        }
        let d;
        let tic;
        if (log_times) {
            d = new Date();
            tic = d.getTime();
        }

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
        this.diff_list = diff_list;

        if (verbosity > 1){
            if (log_times){
                d = new Date();
                this.log("fin diff_list. Time: " + d.getTime() - tic);
            }
            else{
                this.log('fin diff_list');
            }
        }

        /** This generates the distances to the starting position, not including units. This is a basic BFS search
         * TODO: include the initial location of the castle in this pathing calculation*/
        this.pathing_map = make_array(max_dist, [this.map_s_y, this.map_s_x]);
        this.pathing_map[this.me.y][this.me.x] = 0;
        let path_q = [this.me]; // more accurately [{x: this.me.x, y: this.me.y}]
        let path_q_history = [];
        while (path_q.length > 0){
            let pos = path_q.shift();
            path_q_history.push(pos); // gonna need to change this or add a sort and dupli removal for fuel distances.
            for (let i = 0; i < diff_list.length; i++) {
                let p = add_pos(pos, diff_list[i]);
                let p_d = this.pathing_map[pos.y][pos.x] + 1;
                if (this.on_map(p) && this.map[p.y][p.x] && p_d < this.pathing_map[p.y][p.x]) {
                    this.pathing_map[p.y][p.x] = p_d;
                    path_q.push(p);
                }
            }
        }

        if (verbosity > 1){
            if (log_times){
                d = new Date();
                this.log("fin pathing_map. Time: " + d.getTime() - tic);
            }
            else{
                this.log('fin pathing_map');
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
        let map_weights = make_array(1, [this.map_s_y, this.map_s_x]); // number of tiles worth of path here
        let o_dir_cnts = make_array(0, [this.map_s_y, this.map_s_x, diff_list.length]); // counts of flow
        for (let j = path_q_history.length - 1; j >= 0; j--){
            let pos = path_q_history[j];
            let d = this.pathing_map[pos.y][pos.x];
            let next_list = [];
            for (let i = 0; i < diff_list.length; i++) {
                let p = add_pos(pos, rev_diff_list[i]);
                if (this.on_map(p) && this.map[p.y][p.x] && this.pathing_map[p.y][p.x] === d - 1) {
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
        this.dir_weights = o_dir_cnts;
        if (verbosity > 1){
            this.log('fin init_crusader');
        }
        if (log_times){
            d = new Date();
            this.log(d.getTime() - tic);
        }
    }
    init_pilgrim(){
        if (verbosity > 0) {
            this.log('init_pilgrim');
        }
        let d;
        let tic;
        if (log_times) {
            d = new Date();
            tic = d.getTime();
        }
        /** Init move list. Similar to crusader*/
        let diff_list = [];
        let rev_diff_list = [];
        for (let j = -2; j < 3; j++){
            for (let i = -2; i < 3; i++){
                if ((i * i + j * j <= 4) && (i !== 0 || j !== 0)){
                    diff_list.push({x:i, y:j});
                    rev_diff_list.push({x:-i, y:-j});
                }
            }
        }
        this.diff_list = diff_list;
        this.rev_diff_list = rev_diff_list;

        /** BFS distances*/
        let fuel_locs = [];
        for (let j = 0; j < this.map_s_y; j++){
            for (let i = 0; i < this.map_s_x; i++){
                if (this.fuel_map[j][i]){
                    fuel_locs.push({x:i, y:j});
                }
            }
        }
        this.path_fuel = this.bfs(fuel_locs);
        let karb_locs = [];
        for (let j = 0; j < this.map_s_y; j++){
            for (let i = 0; i < this.map_s_x; i++){
                if (this.karbonite_map[j][i]){
                    fuel_locs.push({x:i, y:j});
                }
            }

        }
        this.path_karb = this.bfs(karb_locs);

        /** This is a bit of code that constructs a sort of tree*/
        if (verbosity > 1){
            this.log('fin init_pilgrim');
        }
        if (log_times){
            d = new Date();
            this.log(d.getTime() - tic);
        }

    }
    turn_crusader(){
        // this.log('start');
        // this.log(this.dir_weights.length)
        let dir_weights = this.dir_weights[this.me.y][this.me.x];
        // this.log('aa');
        let rand = Math.random();
        let tot = 0;
        for (let i = 0; i < dir_weights.length; i++){
            tot += dir_weights[i];
        }
        if (tot === 0){
            // TODO: make knight return to start or something when reaches end
            return;
        }
        // this.log('a');
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
        return this.move(this.diff_list[dir_i].x, this.diff_list[dir_i].y);
    }
    turn_pilgrim(){

    }
    turn() {
        this.init();
        // this.log(Object.getOwnPropertyNames(this));
        // this.log(Object.getOwnPropertyNames(this.me));
        // this.log(this.id);
        // this.log(this.fuel);
        // this.log(this.map[0][0]);
        // for (let i = 0; i < this.map[0].length; i++){
        //
        // }
        // this.log(SPECS.CHESS_INITIAL);
        // this.log(Object.getOwnPropertyNames(SPECS));
        // this.log(this._bc_signal_radius)
        // throw 'breaklol';
        step++;

        if (this.me.unit === SPECS.CRUSADER) {
            this.turn_crusader();
        }

        else if (this.me.unit === SPECS.CASTLE) {
            // this.log(this.me.castle_talk);
            if (step % 10 === 0) {
                // this.log("Building a crusader at " + (this.me.x+1) + ", " + (this.me.y+1));
                return this.buildUnit(SPECS.CRUSADER, 1, 1);
            } else {
                return; // this.log("Castle health: " + this.me.health);
            }
        }

    }
}

var robot = new MyRobot();