
import {BCAbstractRobot, SPECS} from 'battlecode';
import util from "./util.js";

let pilgrim = {};

let log_times = false;
let verbosity = 2;

let built = false;
let step = -1;
const max_dist = 100000;
const PATHING_TO_NODE = 0;
const JUST_REACHED_NODE = 1;
const PATHING_TO_MAKE_CHURCH = 2;
const PATHING_BACK = 3;
const PATHING_TO_CHURCH = 4;
const MINING = 5;

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
function pilgrim_make_tree(self, loc_list){
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
}
pilgrim.init = (self) => {
    /* State variables.*/
    self.state = 0;
    if (verbosity > 0) {
        self.log('init_pilgrim');
    }
    // return;
    /** Init move list. Similar to crusader*/
    let inv_diff_list = util.make_array(-1, [5, 5]);
    let diff_list = [];
    let rev_diff_list = [];
    for (let j = -2; j < 3; j++){
        for (let i = -2; i < 3; i++){
            if ((i * i + j * j <= 4) && (i !== 0 || j !== 0)){
                inv_diff_list[j + 2][i + 2] = diff_list.length;
                diff_list.push({x:i, y:j});
                rev_diff_list.push({x:-i, y:-j});
            }
        }
    }
    self.diff_list = diff_list;
    self.rev_diff_list = rev_diff_list;
    self.inv_diff_list = inv_diff_list;
    if (verbosity > 1){self.log('made move list');}
    // this.fuel_map = this.getFuelMap();
    // this.karb_map = this.getKarbMap();
    self.parent_castle = undefined;
    let nearby_bots = self.getVisibleRobots();
    for (let i = 0; i < nearby_bots.length; i++){
        if (nearby_bots[i].team === self.me.team &&
            (nearby_bots[i].unit === SPECS.CASTLE || nearby_bots[i].unit === SPECS.CHURCH)){
            if (Math.abs(nearby_bots[i].x - self.me.x) <= 1 && Math.abs(nearby_bots[i].y - self.me.y) <= 1){
                self.parent_castle = nearby_bots[i];
            }
            self.map[nearby_bots[i].y][nearby_bots[i].x] = false; // This probably doesn't carry over to next turn
        }
    }
    let parent_castle_neighbors = [];
    for (let dy = -1; dy < 2; dy++){
        for (let dx = -1; dx < 2; dx++){
            let p = util.add_pos(self.parent_castle, {x: dx, y: dy});
            if (util.on_map(self, p) && self.map[p.y][p.x]){
                parent_castle_neighbors.push(p);
            }
        }
    }
    self.parent_castle_path = util.bfs(self, parent_castle_neighbors);
    let d;
    let tic;
    if (log_times) {
        d = new Date();
        tic = d.getTime();
    }
    /** BFS distances*/
    let fuel_locs = [];
    for (let j = 0; j < self.map_s_y; j++){
        for (let i = 0; i < self.map_s_x; i++){
            if (self.fuel_map[j][i]){
                fuel_locs.push({x:i, y:j});
            }
        }
    }
    // self.path_fuel = util.bfs(self, fuel_locs);
    let karb_locs = [];
    for (let j = 0; j < self.map_s_y; j++){
        for (let i = 0; i < self.map_s_x; i++){
            if (self.karbonite_map[j][i]){
                karb_locs.push({x:i, y:j});
            }
        }

    }
    // return;
    // self.path_karb = util.bfs(self, karb_locs);
    if (verbosity > 1){self.log('made bfs distances');}
    // this.fuel_tree_data = this.pilgrim_make_tree([this.me].concat(fuel_locs));
    // this.karb_tree_data = this.pilgrim_make_tree([this.me].concat(karb_locs));
    self.gather_karb = true; // TODO: make some algo for this
    // if (self.me.turn === 1){
    //     self.gather_karb = true;
    // }
    // else if (self.me.turn === 2){
    //     self.gather_karb = false;
    // }
    // else{
    //     let fuel_weight = self.fuel / 10;
    //     let karb_weight = self.karbonite / 2;
    //     self.gather_karb = Math.random() * (fuel_weight + karb_weight) < fuel_weight;
    // }
    // return;
    self.tree_data = pilgrim_make_tree(self, [self.me].concat(karb_locs, fuel_locs));
    for (let i = 0; i < self.tree_data.tree_info.length; i++){
        let pos = self.tree_data.tree_info[i];
        self.tree_data.tree_info[i].is_karb = self.karbonite_map[pos.y][pos.x];
    }
    self.current_node = 0;
    if (verbosity > 1){
        self.log('fin init_pilgrim');
    }
    if (log_times){
        d = new Date();
        self.log(d.getTime() - tic);
    }

};
function get_tree_dist(self, p){
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
}
function turn_path_to_node(self) {
    if (self.current_node < 0) {
        self.log('end of line');
        if (Math.random() < 0.1){
            let valid_dirs = [];
            for (let i = 0; i < self.diff_list.length; i++) {
                let p = util.add_pos(self.me, self.diff_list[i]);
                if (util.on_map(self, p) && self.map[p.y][p.x] && self.diff_vis[i] <= 0) {
                    valid_dirs.push(self.diff_list[i]);
                }
            }
            // return;
            if (valid_dirs.length === 0){
                return;
            }
            // return;
            let i = util.rand_int(valid_dirs.length);
            return self.move(valid_dirs[i].x, valid_dirs[i].y);
        }
        return; // ditto as above
    }
    // this.log('turn_path_to_node');
    // for (let i = 1; i < this.tree_data.tree_info.length; i++){
    //     for (let y = 0; y < this.map_s_y; y++){
    //         let s = "";
    //         for (let x = 0; x < this.map_s_x; x++){
    //             let dist = this.get_tree_dist({x:x, y:y, i: i});
    //             s += (dist === max_dist)? 'X': dist%10;
    //         }
    //         this.log(s);
    //     }
    //     this.log('');
    // }
    // this.log(this.tree_data.tree_info);
    let tree_info = self.tree_data.tree_info;
    // this.log(tree_info);
    let target = tree_info[self.current_node];
    // let vis_map = self.getVisibleRobotMap();
    let visible_robots = self.getVisibleRobots();
    // let vis_map = this.get
    let target_occupied = false;
    for (let i = 0; i < visible_robots.length; i++) {
        // this.log(visible_robots[i]);
        let rob = visible_robots[i];
        if (rob.unit === SPECS.PILGRIM && rob.x === target.x && rob.y === target.y && rob.team === self.me.team && rob.id !== self.me.id) {
            target_occupied = true;
        }
    }
    // this.log(this.current_node);
    // if (target_occupied){
    //     this.log('target occupied');
    // }
    if ((self.current_node === 0 && !(self.gather_karb?self.karbonite_map: self.fuel_map)[target.y][target.x]) ||
        (self.tree_data.voronoi_id[self.me.y][self.me.x] === self.current_node && target_occupied)) {
        let weights = [];
        let children = tree_info[self.current_node].children;
        // let fuel_weight = 5 + 10 / Math.max(5, self.fuel - Math.min(self.me.turn * 4, 200));
        // let karb_weight = 3 + 2 / Math.max(1, self.karbonite - Math.min(self.me.turn, 50));
        let fuel_weight = 10 / (self.fuel);
        let karb_weight = 2 / (self.karbonite);
        for (let i = 0; i < children.length; i++){
            weights.push(tree_info[children[i]].node_weight *
                (tree_info[children[i]].is_karb? karb_weight: fuel_weight));
        }
        let child = -1;
        if (children.length > 0){
            child = children[util.rand_weight(weights)];
        }
        // let rand = Math.random() * (tree_info[self.current_node].node_weight - 1);
        // let child = -1; // TODO: make leaf node contingency
        // let tot = 0;
        // for (let i = 0; i < tree_info[self.current_node].children.length; i++) {
        //
        //     child = tree_info[self.current_node].children[i];
        //     // this.log(child);
        //     tot += tree_info[child].node_weight;
        //     if (tot > rand) {
        //         break;
        //     }
        // }
        self.current_node = child;
        if (child === -1){
            self.log('end of line');
            return;
        }
        // if (typeof child == 'undefined'){
        //     self.log('current node undefined')
        // }
        target = tree_info[self.current_node];

    }

    let curr_dist = get_tree_dist(self, {x: self.me.x, y: self.me.y, i: self.current_node});
    if (curr_dist === 0){
        self.log('arrived');
        self.log([self.me.x, self.me.y]);
        self.state = JUST_REACHED_NODE;
        return turn_on_reaching_node(self);
    }
    // this.log(curr_dist);
    let diff_vis = util.make_array(-1, [self.diff_list.length]);
    for (let i = 0; i < visible_robots.length; i++) {
        let rob = visible_robots[i];
        if (util.squared_distance(rob, self.me) <= 4 && rob.id !== self.me.id) {
            diff_vis[self.inv_diff_list[rob.y - self.me.y + 2][rob.x - self.me.x + 2]] = rob.id;
        }
    }
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && get_tree_dist(self, p) === curr_dist - 1 && diff_vis[i] <= 0) {
            return self.move(self.diff_list[i].x, self.diff_list[i].y);
        }
    }
    // return;
    if (Math.random() < 0.8){
        return;
    }
    let valid_dirs = [];
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && get_tree_dist(self, p) === curr_dist && diff_vis[i] <= 0) {
            valid_dirs.push(self.diff_list[i]);
        }
    }
    // return;
    if (valid_dirs.length === 0){
        self.log('path_to_node blocked');
        return;
    }
    // return;
    let i = util.rand_int(valid_dirs.length);
    return self.move(valid_dirs[i].x, valid_dirs[i].y);
    // this.log("Help! I'm lost!"); // TODO: make lost contingincy
}
function turn_on_reaching_node(self){
    self.log('turn_on_reaching_node');
    self.path_to_node = util.bfs(self, [self.me]);
    let nearby_units = self.vis_bots;
    let best_dist = max_dist + 1;
    let best_church = -1;
    // self.log(nearby_units);
    // self.log(self.me.team);
    for (let i = 0; i < nearby_units.length; i++){ // TODO: detect enemy castles
        if (nearby_units[i].team === self.me.team &&
            (nearby_units[i].unit === SPECS.CHURCH || nearby_units[i].unit === SPECS.CASTLE)){
            let church = nearby_units[i];
            let dist = self.path_to_node[church.y][church.x];
            if (dist < best_dist){
                best_church = church;
                best_dist = dist;
            }
        }
    }
    if (best_church === -1){
        self.has_church = false;
        return init_make_church(self);
    }
    else{
        self.has_church = true;
        let church_neighbors = [];
        for (let dy = -1; dy < 2; dy++){
            for (let dx = -1; dx < 2; dx++){
                let p = util.add_pos({x: dx, y:dy}, best_church);
                if (util.on_map(self, p) && (dx !== 0 || dy !== 0) && self.map[p.y][p.x]){
                    church_neighbors.push(p);
                }
            }
        }
        self.church = best_church;
        // this.log(church_neighbors);
        self.path_to_church = util.bfs(self, church_neighbors);
        self.state = MINING;
        return turn_mine(self);
    }
}
function init_make_church(self){
    self.log(self.fuel);
    self.log(self.karbonite);
    self.log(self.has_church);

    if (self.fuel < 200 || self.karbonite < 50 || self.has_church){
        self.state = MINING;
        return turn_mine(self);
    }
    //TODO: check if there is an existing church
    let build_neighbors = [];
    for (let dy = -1; dy < 2; dy++){
        for (let dx = -1; dx < 2; dx++){
            if ((dx !== 0 || dy !== 0)){
                build_neighbors.push({x:dx, y: dy});
            }
        }
    }
    let path_q = [self.me];
    let found_ok = false;
    while (path_q.length > 0){
        let pos = path_q.shift();
        let to_break = false;
        for (let i = 0; i < 8; i++){
            let p = util.add_pos(pos, build_neighbors[i]);
            if (util.on_map(self, p) && self.map[p.y][p.x] && !self.fuel_map[p.y][p.x] && !self.karbonite_map[p.y][p.x]) {
                self.church_target = pos;
                self.build_church_dir = build_neighbors[i];
                found_ok = true;
                to_break = true;
                break;
            }
        }
        if (to_break){break;}
        for (let i = 0; i < self.diff_list.length; i++) {
            let p = util.add_pos(pos, self.diff_list[i]);
            let p_d = self.path_to_node[pos.y][pos.x] + 1;
            self.log(p_d + " " + self.path_to_node[p.y][p.x]);
            if (util.on_map(self, p) && self.map[p.y][p.x] && p_d === self.path_to_node[p.y][p.x]) {
                path_q.push(p);
            }
        }
    }
    if (!found_ok){
        self.log('no tile found');
    }
    self.log("target pos:");
    // this.log(this.church_target);
    self.path_to_church_build = util.bfs(self,[self.church_target]); // TODO: Optimize
    // for (let y = 0; y < this.map_s_y; y++){
    //     let s = "";
    //     for (let x = 0; x < this.map_s_x; x++){
    //         let dist = this.path_to_church_build[y][x];
    //         s += (dist === max_dist)? 'X': dist%10;
    //     }
    //     this.log(s);
    // }
    self.state = PATHING_TO_MAKE_CHURCH;
    return turn_path_to_make_church(self);
}
function turn_path_to_make_church(self){
    if (self.path_to_church_build[self.me.y][self.me.x] === 0){
        self.log('arrived at church build site');
        if (self.fuel < 200 || self.karbonite < 50){
            self.state = PATHING_BACK;
            return turn_path_back(self);
        }
        self.state = PATHING_BACK;
        let church_loc = util.add_pos(self.me, self.build_church_dir);
        for (let i = 0; i < self.vis_bots.length; i++){
            let bot = self.vis_bots[i];
            if (bot.x === church_loc.x && bot.y === church_loc.y){
                self.log('church build site cccupied');
                return turn_path_back(self);
            }
        }
        let church_neighbors = [];
        for (let dy = -1; dy < 2; dy++){
            for (let dx = -1; dx < 2; dx++){
                let p = util.add_pos({x: dx, y:dy}, church_loc);
                // self.log(p);
                if (util.on_map(self, p) && (dx !== 0 || dy !== 0) && self.map[p.y][p.x]){
                    church_neighbors.push(p);
                }
            }
        }
        self.log(church_neighbors);
        self.path_to_church = util.bfs(self, church_neighbors);
        self.church = util.add_pos(self.me, self.build_church_dir);
        return self.buildUnit(SPECS.CHURCH, self.build_church_dir.x, self.build_church_dir.y);
    }
    let diff_vis = util.make_array(-1, [self.diff_list.length]);
    for (let i = 0; i < self.vis_bots.length; i++) {
        let rob = self.vis_bots[i];
        if (util.squared_distance(rob, self.me) <= 4 && rob.id !== self.me.id) {
            diff_vis[self.inv_diff_list[rob.y - self.me.y + 2][rob.x - self.me.x + 2]] = rob.id;
        }
    }
    let curr_dist = self.path_to_church_build[self.me.y][self.me.x];
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && self.path_to_church_build[p.y][p.x] === curr_dist - 1 && diff_vis[i] <= 0) {
            return self.move(self.diff_list[i].x, self.diff_list[i].y);
        }
    }
    let valid_dirs = [];
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && self.path_to_church_build[p.y][p.x] === curr_dist && diff_vis[i] <= 0) {
            valid_dirs.push(self.diff_list[i]);
        }
    }
    if (valid_dirs.length === 0){
        self.log('path_make_church blocked');
        return;
    }
    let i = util.rand_int(valid_dirs.length);
    return self.move(valid_dirs[i].x, valid_dirs[i].y);
}
function turn_path_back(self){
    let curr_dist = self.path_to_node[self.me.y][self.me.x];
    if (curr_dist === 0){
        self.state = MINING;
        return turn_mine(self);
    }
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && self.path_to_node[p.y][p.x] === curr_dist - 1 && self.diff_vis[i] <= 0) {
            return self.move(self.diff_list[i].x, self.diff_list[i].y);
        }
    }
    if (curr_dist === 1){
        self.state = PATHING_TO_NODE;
        return turn_path_to_node(self);
    }
    let valid_dirs = [];
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && self.path_to_node[p.y][p.x] === curr_dist && self.diff_vis[i] <= 0) {
            valid_dirs.push(self.diff_list[i]);
        }
    }
    if (valid_dirs.length === 0){
        self.log('path_back blocked');
        return;
    }
    let i = util.rand_int(valid_dirs.length);
    return self.move(valid_dirs[i].x, valid_dirs[i].y);
}
function turn_mine(self){
    if (self.me.fuel >= 100 || self.me.karbonite >= 20){
        let nearby_units = self.vis_bots;
        let best_dist = max_dist + 1;
        let best_church = -1;
        for (let i = 0; i < nearby_units.length; i++){
            if (nearby_units[i].team === self.me.team &&
                (nearby_units[i].unit === SPECS.CHURCH || nearby_units[i].unit === SPECS.CASTLE)){
                let church = nearby_units[i];
                let dist = self.path_to_node[church.y][church.x];
                if (dist < best_dist){
                    best_church = church;
                    best_dist = dist;
                }
            }
        }
        if (best_church === -1){
            // self.has_church = false; TODO: revisit
        }
        else{
            self.has_church = true;
            let church_neighbors = [];
            for (let dy = -1; dy < 2; dy++){
                for (let dx = -1; dx < 2; dx++){
                    let p = util.add_pos({x: dx, y:dy}, best_church);
                    if (util.on_map(self, p) && (dx !== 0 || dy !== 0) && self.map[p.y][p.x]){
                        church_neighbors.push(p);
                    }
                }
            }
            self.church = best_church;
            // this.log(church_neighbors);
            self.path_to_church = util.bfs(self, church_neighbors);
        }
        if (!self.has_church && self.fuel >= 200 && self.karbonite >= 50){
            return init_make_church(self);
        }
        self.state  = PATHING_TO_CHURCH;
        return turn_path_to_church(self);
    }
    return self.mine();
}
function turn_path_to_church(self){

    self.log('turn_path_to_church');
    /*if (this.fuel < 200 || this.karbonite < 50){
        if (this.me.fuel >= 100 || this.me.karbonite >= 20){
            this.state = PATHING_TO_PARENT;
            return this.turn_path_to_parent();
        }
        this.state = MINING
    }*/
    // TODO: contigency if church destroyed
    let dist_map = self.has_church? self.path_to_church: self.parent_castle_path;
    let target_loc = self.has_church? self.church: self.parent_castle;
    let curr_dist = dist_map[self.me.y][self.me.x];
    if (curr_dist === 0){

        self.log('arrived at deposit point');
        self.log(target_loc);
        self.log(self.me.karbonite + " " + self.me.fuel);
        self.log(self.me);
        self.state = PATHING_BACK;
        return self.give(target_loc.x - self.me.x, target_loc.y - self.me.y, self.me.karbonite, self.me.fuel);
    }
    if ((self.gather_karb && self.karbonite > 50 && self.fuel < 200) || (!self.gather_karb && 4 * curr_dist > self.me.fuel)){
        self.state = PATHING_BACK;
    }
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && dist_map[p.y][p.x] === curr_dist - 1 && self.diff_vis[i] <= 0) {
            return self.move(self.diff_list[i].x, self.diff_list[i].y);
        }
    }
    if (Math.random() < 0.15){
        self.state = PATHING_BACK;
    }
    let valid_dirs = [];
    for (let i = 0; i < self.diff_list.length; i++) {
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (util.on_map(self, p) && dist_map[p.y][p.x] === curr_dist && self.diff_vis[i] <= 0) {
            valid_dirs.push(self.diff_list[i]);
        }
    }
    if (valid_dirs.length === 0){
        self.log('path_to_church blocked');
        return
    }
    let i = util.rand_int(valid_dirs.length);
    return self.move(valid_dirs[i].x, valid_dirs[i].y);
}
pilgrim.turn = (self) => {
    // this.log(this.state);
    self.vis_bots = self.getVisibleRobots();
    let diff_vis = util.make_array(-1, [self.diff_list.length]);
    for (let i = 0; i < self.vis_bots.length; i++) {
        let rob = self.vis_bots[i];
        if (util.squared_distance(rob, self.me) <= 4 && rob.id !== self.me.id) {
            diff_vis[self.inv_diff_list[rob.y - self.me.y + 2][rob.x - self.me.x + 2]] = rob.id;
        }
    }
    self.diff_vis = diff_vis;
    // self.vis_map = self.getVisibleRobotMap(); // TODO slow
    switch (self.state){
        case PATHING_TO_NODE:
            // this.log('pathing to node');
            return turn_path_to_node(self);
        case PATHING_TO_MAKE_CHURCH:
            // this.log('pathing to make church');
            return turn_path_to_make_church(self);
        case PATHING_BACK:
            // this.log('pathing back');
            return turn_path_back(self);
        case MINING:
            // this.log('mining');
            return turn_mine(self);
        case PATHING_TO_CHURCH:
            // this.log('pathing to church');
            return turn_path_to_church(self);

    }
    self.log('halp!');
};

export default pilgrim;