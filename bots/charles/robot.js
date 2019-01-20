
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

function array_copy(a){
    /** note that this doesn't properly copy 2d arrays*/
    let o = [];
    for (let i = 0; i < a.length; i++){
        o.push(a[i]);
    }
    return o;
}
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
        else if (this.me.unit === SPECS.PILGRIM){
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
            for (let i = 0; i < this.diff_list.length; i++) {
                let p = add_pos(pos, this.diff_list[i]);
                let p_d = pathing_map[pos.y][pos.x] + 1;
                if (this.on_map(p) && this.map[p.y][p.x] && p_d < pathing_map[p.y][p.x]) {
                    pathing_map[p.y][p.x] = p_d;
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
    pilgrim_make_tree(loc_list){
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
        let voronoi_dist = make_array(max_dist, [this.map_s_y, this.map_s_x]); // the distance to nearest resource
        let voronoi_id = make_array( -1, [this.map_s_y, this.map_s_x]); // the index of the resource its near
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
            for (let i = 0; i < this.diff_list.length; i++){
                let p = {x: pos.x + this.diff_list[i].x, y:pos.y + this.diff_list[i].y, i: pos.i, d: pos.d + 1};
                // more edge cases if fuel distances
                if (this.on_map(p) && this.map[p.y][p.x] && voronoi_id[p.y][p.x] !== p.i){
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
        let node_dists = make_array(max_dist, [loc_list.length]);
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
        let covered = make_array(false, loc_list.length);
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
        let child_dists = make_array([], [this.map_s_y, this.map_s_x]); // the -1 is unimportant
        for (let y = 0; y < this.map_s_y; y++){
            for (let x = 0; x < this.map_s_x; x++){
                let i = voronoi_id[y][x];
                if (i < 0) {continue;} // this ought to be the walls
                child_dists[y][x] = make_array(max_dist, tree_info[voronoi_id[y][x]].children.length);
            }
        }
        path_q = [];
        for (let y = 0; y < this.map_s_y; y++){
            for (let x = 0; x < this.map_s_x; x++){
                let i = voronoi_id[y][x];
                if (i <= 0) {continue;} // root has no parent & walls dont path
                path_q.push({x: x, y: y, d: voronoi_dist[y][x], // most of these will get pruned, so maybe optimize
                    i: i, p: tree_info[i].parent, p_i: tree_info[i].p_index});
            }
        }
        while (path_q.length > 0){
            let e = path_q.shift();
            for (let d_i = 0; d_i < this.diff_list.length; d_i++){
                let f = {x:e.x + this.diff_list[d_i].x, y: e.y + this.diff_list[d_i].y, d: e.d + 1,
                    i: e.i, p: e.p, p_i: e.p_i};
                if (!this.on_map(f) || !this.map[f.y][f.x] || voronoi_id[f.y][f.x] !== f.p ||
                    child_dists[f.y][f.x][f.p_i] <= f.d){
                    continue;
                }
                child_dists[f.y][f.x][f.p_i] = f.d;
                path_q.push(f);
            }
        }
        return {tree_info: tree_info, voronoi_dist: voronoi_dist, voronoi_id: voronoi_id, child_dists: child_dists};
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
                    karb_locs.push({x:i, y:j});
                }
            }

        }
        this.path_karb = this.bfs(karb_locs);

        // this.fuel_tree_data = this.pilgrim_make_tree([this.me].concat(fuel_locs));
        // this.karb_tree_data = this.pilgrim_make_tree([this.me].concat(karb_locs));
        this.gather_karb = true; // TODO: make some algo for this
        this.tree_data = this.pilgrim_make_tree([this.me].concat(this.gather_karb?karb_locs:fuel_locs));
        this.current_node = 0;
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
        // this.log('move');
        return this.move(this.diff_list[dir_i].x, this.diff_list[dir_i].y);
    }
    get_tree_dist(p){
        /* Gets the distance associated with the location p.x, p.y to the node p.i*/
        let id = this.tree_data.voronoi_id[p.y][p.x];
        if (id === p.i){
            return this.tree_data.voronoi_dist[p.y][p.x];
        }
        else if (id === -1){
            return max_dist;
        }
        else if (id === this.tree_data.tree_info[p.i].parent){
            return this.tree_data.child_dists[p.y][p.x][this.tree_data.tree_info[p.i].p_index];
        }
        else {
            return max_dist;
        }
    }
    turn_pilgrim(){
        // this.log(this.current_node);
        let tree_info = this.tree_data.tree_info;
        // this.log(tree_info);
        let target = tree_info[this.current_node];
        // let vis_map = this.getVisibleRobotMap();
        let visible_robots = this.getVisibleRobots();
        let target_occupied = false;
        for (let i = 0; i < visible_robots.length; i++){
            let rob = visible_robots[i];
            if (rob.unit === SPECS.PILGRIM && rob.x === target.x && rob.y === target.y && rob.team === this.me.team){
                target_occupied = true;
            }
        }

        if (this.current_node === 0 ||
            (this.tree_data.voronoi_id[this.me.y][this.me.x] === this.current_node && !target_occupied)){
            if (this.current_node < 0){
                return; // TODO: make the bot do something in this case
            }
            let rand = Math.random() * (tree_info[this.current_node].node_weight - 1);
            let child = -1; // TODO: make leaf node contingency
            let tot = 0;
            for (let i = 0; i < tree_info[this.current_node].children.length; i++){

                child = tree_info[this.current_node].children[i];
                // this.log(child);
                tot += tree_info[child].node_weight;
                if (tot > rand){break;}
            }
            this.current_node = child;
            target = tree_info[this.current_node];

        }
        if (this.current_node < 0){
            return; // ditto as above
        }
        let curr_dist = this.get_tree_dist({x: this.me.x, y: this.me.y, i: this.current_node});
        for (let i = 0; i < this.diff_list.length; i++){
            let p = {x: this.me.x + this.diff_list[i].x, y: this.me.y + this.diff_list[i].y, i: this.current_node};
            if (this.on_map(p) && this.get_tree_dist(p) === curr_dist - 1 && vis_map[p.y][p.x] <= 0){
                return this.move(this.diff_list[i].x, this.diff_list[i].y);
            }
        }
        this.log("Help! I'm lost!"); // TODO: make lost contingincy
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
            return this.turn_crusader();
        }
        else if (this.me.unit === SPECS.PILGRIM){
            return this.turn_pilgrim();
        }
        else if (this.me.unit === SPECS.CASTLE) {
            // this.log(this.me.castle_talk);
            if (step % 10 === 0) {
                // this.log("Building a crusader at " + (this.me.x+1) + ", " + (this.me.y+1));
                // return this.buildUnit(SPECS.CRUSADER, 1, 1);
                return this.buildUnit(SPECS.PILGRIM, 1, 1);
            } else {
                return; // this.log("Castle health: " + this.me.health);
            }
        }

    }
}

var robot = new MyRobot();