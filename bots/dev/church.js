import {BCAbstractRobot, SPECS} from 'battlecode';
import util from './util.js';

const nearby_loc_radius = 64;

var church = {};

church.init = (self) => {
    self.visible_close_to_far = util.close_to_far(1, SPECS.UNITS[SPECS.CASTLE].VISION_RADIUS);

    let nearby_rec_locs = [];
    for (let y = 0; y < self.map_s_y; y++){
        for (let x = 0; x < self.map_s_x; x++){
            if (util.squared_distance({x: x, y: y}, self.me) <= nearby_loc_radius &&
                (self.fuel_map[y][x] || self.karbonite_map[y][x])){ // pretty arbitrary
                nearby_rec_locs.push({x: x, y: y});
            }
        }
    }
    self.nearby_rec_locs = nearby_rec_locs;
};
function turn_defend(self){
    // TODO broadcast relevant signal to turtle about killing radio-ing enemies
    if (self.nearest.nearest_enemy_attacker === undefined) {
        let near_worker = self.enemies[0];
        self.log("I see a worker!");
        self.log(near_worker);
        let make_dir = util.closest_direction(near_worker.dx, near_worker.dy);
        self.log(make_dir);
        // TODO SET SIGNAL TO TELL CRUSADER TO MOVE IN MAKE DIR AS WELL (to bring it closer to the worker)
        if (util.can_buildUnit(self, SPECS.CRUSADER, make_dir.dx, make_dir.dy, 0.5)) {
            return self.buildUnit(SPECS.CRUSADER, make_dir.dx, make_dir.dy);
        }
        // if the optimal spot is taken, just build randomly
        // TOOD make this smarter
        let try_build = rand_build(self, SPECS.CRUSADER, self.availableDirections, 0.4);
        if (try_build ===  undefined) {
            return;
        }
        else {
            return try_build;
        }
    }
    else {
        self.near_attacker = self.nearest.nearest_enemy_attacker;
        self.log("Must defend myself!");
        self.log(self.near_attacker);
        let make_dir = util.closest_direction(self.near_attacker.dx, self.near_attacker.dy);
        self.log(make_dir);
        let sqd = util.squared_distance({x: self.near_attacker.dx, y: self.near_attacker.dy}, {x: make_dir.dx, y: make_dir.dy});
        // If close enough, spawning a preacher/crusader is good defense
        // TODO SET OVERRIDE SIGNAL TO TELL unit to attack regardless
        if (sqd <= 16) {
            self.log("Trying to make unit to defend me.")
            if (util.can_buildUnit(self, SPECS.PREACHER, make_dir.dx, make_dir.dy, 1)) {
                return self.buildUnit(SPECS.PREACHER, make_dir.dx, make_dir.dy);
            }
            if (util.can_buildUnit(self, SPECS.CRUSADER, make_dir.dx, make_dir.dy, 1)) {
                return self.buildUnit(SPECS.CRUSADER, make_dir.dx, make_dir.dy);
            }
        }
        // If unit isn't close enough to hit with a powerful unit, try just shooting it with castle
        // If unit hasn't entered attack range, but in vision range, build preacher and send after
        // TODO Check if the unit can actually reach attack range
        // TODO SET OVERRIDE SIGNAL TO TELL unit to move more
        else {
            if (util.can_buildUnit(self, SPECS.PREACHER, make_dir.dx, make_dir.dy)) {
                return self.buildUnit(SPECS.PREACHER, make_dir.dx, make_dir.dy);
            }
            let try_build = rand_build(self, SPECS.PREACHER, self.availableDirections, 0.5);
            if (try_build === undefined) {
                return;
            }
            else {
                return try_build;
            }
        }

    }
    return turn_attack(self);
}
church.turn = (self) => {
    self.vis_bots = self.getVisibleRobots();
    self.availableDirections = util.find_open_adjacents(self);
    self.neighbor_vis = util.make_array(-1, [3, 3]);
    self.neighbor_vis[1][1] = self.me.id;
    for (let i = 0; i < self.vis_bots.length; i++){
        let bot = self.vis_bots[i];
        // self.log(bot);
        if (util.squared_distance(bot, self.me) < 3){
            self.neighbor_vis[bot.y - self.me.y + 1][bot.x - self.me.x + 1] = bot.id;
        }
    }

    self.nearest = util.nearest_units(self, self.visible_close_to_far);
    self.friendlies = self.nearest.friendlies;
    self.enemies = self.nearest.enemies;
    let num_occupied_sites = 0;
    for (let i = 0; i < self.friendlies.length; i++){
        let e = self.friendlies[i];
        if ((e.dx * e.dx + e.dy * e.dy) <= nearby_loc_radius &&
            (self.fuel_map[e.robot.y][e.robot.x] || self.karbonite_map[e.robot.y][e.robot.x])){
            num_occupied_sites++;
        }
    }
    self.log("occupaiton nos");
    self.log(self.nearby_rec_locs.length);
    self.log(num_occupied_sites);
    if (num_occupied_sites + 1 < self.nearby_rec_locs.length){
        return rand_build(self, SPECS.PILGRIM, self.availableDirections, 0.02);
    }
    // if (self.enemies.length > 0) {
    //     return turn_defend(self);
    // }
};

function rand_build(self, unit, dirs, override_savings=0){
    let ok_dirs = [];
    for (let i = 0; i < dirs.length; i++){
        if (util.can_buildUnit(self, unit, dirs[i][0], dirs[i][1], override_savings)){
            ok_dirs.push(i);
        }
    }
    if (ok_dirs.length === 0){
        // self.log('church cant build');
        return undefined;
    }
    // self.log('church can build jfalasjf;lsdajfl;ksajflk;ajlkfjdsalfjaks;ljfl;dsajfkl;asjflsajfl;sjfl;kasjflasjf');
    let i = ok_dirs[util.rand_int(ok_dirs.length)];
    self.log(dirs[i][0] + " " + dirs[i][1]);

    return self.buildUnit(unit, dirs[i][0], dirs[i][1]);
}

export default church;
