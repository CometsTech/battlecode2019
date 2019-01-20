import {BCAbstractRobot, SPECS} from 'battlecode';
import * as utils from"./utilities.js"

let log_times = false;
let verbosity = 0;

/*
function make_array_helper(e, l_s, s, end) {
    /!** don't use this this is to help with make_array *!/
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
    /!** makes an n-d array. The array is filled with e.
     * To make a nxm matrix filled with zeros, call make_array(0, [n, m])*!/
    return make_array_helper(e, l_s, 0, l_s.length);
}*/

var pilgrim = {};
pilgrim.on_map = (self, a) => {
    /** Given a position, tells if it is on the map*/
    return a.x >= 0 && a.y >= 0 && a.x < this.map_s_x && a.y < this.map_s_y;
};
pilgrim.get_tree_dist = (self, p) => {
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
pilgrim.pilgrim_make_tree = (self, loc_list) => {
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
    let voronoi_dist = utils.make_array(max_dist, [self.map_s_y, self.map_s_x]); // the distance to nearest resource
    let voronoi_id = utils.make_array( -1, [self.map_s_y, self.map_s_x]); // the index of the resource its near
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
            if (this.on_map(self, p) && self.map[p.y][p.x] && voronoi_id[p.y][p.x] !== p.i){
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
    let node_dists = utils.make_array(max_dist, [loc_list.length]);
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
    let covered = utils.make_array(false, loc_list.length);
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
    let child_dists = utils.make_array([], [self.map_s_y, self.map_s_x]); // the -1 is unimportant
    for (let y = 0; y < self.map_s_y; y++){
        for (let x = 0; x < self.map_s_x; x++){
            let i = voronoi_id[y][x];
            if (i < 0) {continue;} // this ought to be the walls
            child_dists[y][x] = utils.make_array(max_dist, tree_info[voronoi_id[y][x]].children.length);
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
            if (!this.on_map(self, f) || !self.map[f.y][f.x] || voronoi_id[f.y][f.x] !== f.p ||
                child_dists[f.y][f.x][f.p_i] <= f.d){
                continue;
            }
            child_dists[f.y][f.x][f.p_i] = f.d;
            path_q.push(f);
        }
    }
    return {tree_info: tree_info, voronoi_dist: voronoi_dist, voronoi_id: voronoi_id, child_dists: child_dists};
};
pilgrim.init = (self) => {
    if (verbosity > 0) {
        self.log('init_pilgrim');
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
    self.diff_list = diff_list;
    self.rev_diff_list = rev_diff_list;

    /** BFS distances*/
    let fuel_locs = [];
    for (let j = 0; j < self.map_s_y; j++){
        for (let i = 0; i < self.map_s_x; i++){
            if (self.fuel_map[j][i]){
                fuel_locs.push({x:i, y:j});
            }
        }
    }
    self.path_fuel = self.bfs(fuel_locs);
    let karb_locs = [];
    for (let j = 0; j < self.map_s_y; j++){
        for (let i = 0; i < self.map_s_x; i++){
            if (self.karbonite_map[j][i]){
                karb_locs.push({x:i, y:j});
            }
        }

    }
    self.path_karb = this.bfs(karb_locs);

    // this.fuel_tree_data = this.pilgrim_make_tree([this.me].concat(fuel_locs));
    // this.karb_tree_data = this.pilgrim_make_tree([this.me].concat(karb_locs));
    self.gather_karb = true; // TODO: make some algo for this
    self.tree_data = self.pilgrim_make_tree([self.me].concat(self.gather_karb?karb_locs:fuel_locs));
    self.current_node = 0;
    if (verbosity > 1){
        self.log('fin init_pilgrim');
    }
    if (log_times){
        d = new Date();
        self.log(d.getTime() - tic);
    }


};

pilgrim.turn = (self) => {
    // self.log(self.current_node);
    let tree_info = self.tree_data.tree_info;
    // self.log(tree_info);
    let target = tree_info[self.current_node];
    // let vis_map = self.getVisibleRobotMap();
    let visible_robots = self.getVisibleRobots();
    let target_occupied = false;
    for (let i = 0; i < visible_robots.length; i++){
        let rob = visible_robots[i];
        if (rob.unit === SPECS.PILGRIM && rob.x === target.x && rob.y === target.y && rob.team === self.me.team){
            target_occupied = true;
        }
    }

    if (self.current_node === 0 ||
        (self.tree_data.voronoi_id[self.me.y][self.me.x] === self.current_node && !target_occupied)){
        if (self.current_node < 0){
            return; // TODO: make the bot do something in this case
        }
        let rand = Math.random() * (tree_info[self.current_node].node_weight - 1);
        let child = -1; // TODO: make leaf node contingency
        let tot = 0;
        for (let i = 0; i < tree_info[self.current_node].children.length; i++){

            child = tree_info[self.current_node].children[i];
            // this.log(child);
            tot += tree_info[child].node_weight;
            if (tot > rand){break;}
        }
        self.current_node = child;
        target = tree_info[self.current_node];

    }
    if (self.current_node < 0){
        return; // ditto as above
    }
    let curr_dist = this.get_tree_dist(self, {x: self.me.x, y: self.me.y, i: self.current_node});
    for (let i = 0; i < self.diff_list.length; i++){
        let p = {x: self.me.x + self.diff_list[i].x, y: self.me.y + self.diff_list[i].y, i: self.current_node};
        if (this.on_map(p) && this.get_tree_dist(p) === curr_dist - 1 && vis_map[p.y][p.x] <= 0){
            return self.move(self.diff_list[i].x, self.diff_list[i].y);
        }
    }
    self.log("Help! I'm lost!"); // TODO: make lost contingincy
};

export default pilgrim;

