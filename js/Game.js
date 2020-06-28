var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var _a;
var in_development = true;
var game_manager;
//#region HELPERS_DEVELOPMENT
function DevelopmentError(str) {
    if (in_development)
        throw Error(str);
}
//#endregion
//#region HELPERS_EVENTS
var InvokableEvent = /** @class */ (function () {
    function InvokableEvent(context, exec, repeat, parameters) {
        if (repeat === void 0) { repeat = 0; }
        if (parameters === void 0) { parameters = []; }
        this.exec = exec;
        this.context = context;
        this.parameters = parameters;
        this.repeat = repeat;
    }
    InvokableEvent.prototype.Invoke = function () {
        this.exec.apply(this.context, this.parameters);
        if (this.repeat-- == 0)
            return null;
        return this;
    };
    return InvokableEvent;
}());
function AddEvent(eventArr, event) {
    var i = eventArr.length - 1, empty = true;
    while (i >= 0) {
        if (empty && eventArr[i]) {
            if (eventArr[i + 1] === null) {
                eventArr[i] = event;
                return i + 1;
            }
            empty = false;
            eventArr.length = i + 1;
        }
        else if (!empty && !eventArr[i]) {
            eventArr[i] = event;
            return i;
        }
        i--;
    }
    eventArr.push(event);
    return eventArr.length - 1;
}
function RemoveEvent(eventArr, id, func) {
    if (eventArr[id].exec == func) {
        eventArr[id] = null;
        return true;
    }
    DevelopmentError("Invalid parameters in remove event function.");
    return false;
}
function HandleEvents(eventArr) {
    var i = 0, l = eventArr.length;
    while (i < l) {
        if (eventArr[i] !== null)
            eventArr[i] = eventArr[i].Invoke();
        i++;
    }
}
//#endregion
//#region HELPERS_GENERIC
function Throttle() {
    var to = true;
    return function (func, delay) {
        var _this = this;
        if (to) {
            window.clearTimeout(to);
        }
        to = window.setTimeout(function () { return func.apply(_this); }, delay);
    };
}
function TileColor(tile) {
    if (tile == -1 /* blue */)
        return 'blue';
    else if (tile == -2 /* red */)
        return 'red';
    else if (tile == 0 /* neutral */)
        return 'white';
    else if (tile == -3 /* obstacle */)
        return 'black';
    DevelopmentError("Invalid tile type.");
    ;
}
//#endregion
//#region Vector2
var Vector2 = /** @class */ (function () {
    function Vector2(x, y) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        this.x = x;
        this.y = y;
    }
    Vector2.prototype.Clone = function () {
        return new Vector2(this.x, this.y);
    };
    return Vector2;
}());
//#endregion
//#region CONSTS
var canvasBackground = document.getElementById('canvas-background');
var canvasMidground = document.getElementById('canvas-midground');
var canvasForeground = document.getElementById('canvas-foreground');
var canvasContainer = document.getElementById('canvas-container');
var ctxBackground = canvasBackground.getContext('2d');
var ctxMidground = canvasMidground.getContext('2d');
var ctxForeground = canvasForeground.getContext('2d');
var obstaclePatternY = [0, 2, 1];
var directions_multipliers = (_a = {},
    _a[0 /* up */] = new Vector2(0, -1),
    _a[1 /* right */] = new Vector2(1, 0),
    _a[2 /* down */] = new Vector2(0, 1),
    _a[3 /* left */] = new Vector2(-1, 0),
    _a);
var CanvasManager = /** @class */ (function () {
    function CanvasManager(scaleX, scaleY) {
        var _this = this;
        this.resizeEvents = [];
        this.drawBoardEvents = [];
        this.drawEvents = [];
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        var throttle = Throttle();
        var resize = function () { return throttle.apply(_this, [_this.Resize, 250]); };
        this.addResizeListener = function () {
            return window.addEventListener("resize", resize);
        };
        this.removeResizeListener = function () {
            return window.removeEventListener('resize', resize);
        };
        this.addResizeListener();
        this.Resize();
    }
    CanvasManager.prototype.Reset = function () {
        this.drawEvents.length = 0;
        this.resizeEvents.length = 0;
        this.drawBoardEvents.length = 0;
        this.ClearCanvas();
        this.removeResizeListener();
    };
    CanvasManager.prototype.AddEvent = function (event, type) {
        return AddEvent(this.GetEventArr(type), event);
    };
    CanvasManager.prototype.RemoveEvent = function (id, func, type) {
        return RemoveEvent(this.GetEventArr(type), id, func);
    };
    CanvasManager.prototype.GetEventArr = function (type) {
        if (type == 0 /* resize */)
            return this.resizeEvents;
        else if (type == 1 /* draw_board */)
            return this.drawBoardEvents;
        else if (type == 2 /* draw */)
            return this.drawEvents;
        DevelopmentError("Invalid CanvasEvent type.");
    };
    CanvasManager.prototype.ClearCanvas = function (canvas) {
        if (canvas === void 0) { canvas = null; }
        if (canvas == null) {
            ctxBackground.clearRect(0, 0, this.boardWidth, this.boardHeight);
            ctxMidground.clearRect(0, 0, this.boardWidth, this.boardHeight);
            ctxForeground.clearRect(0, 0, this.boardWidth, this.boardHeight);
            return;
        }
        this.GetCanvasContext(canvas).clearRect(0, 0, this.boardWidth, this.boardHeight);
    };
    CanvasManager.prototype.GetCanvas = function (canvas) {
        if (canvas == 0 /* background */)
            return canvasBackground;
        else if (canvas == 1 /* midground */)
            return canvasMidground;
        else if (canvas == 2 /* foreground */)
            return canvasForeground;
        DevelopmentError("Invalid layer.");
        return null;
    };
    CanvasManager.prototype.GetCanvasContext = function (canvas) {
        if (canvas == 0 /* background */)
            return ctxBackground;
        else if (canvas == 1 /* midground */)
            return ctxMidground;
        else if (canvas == 2 /* foreground */)
            return ctxForeground;
        DevelopmentError("Invalid layer.");
        return null;
    };
    CanvasManager.prototype.Draw = function (drawable, canvas, color) {
        var ctx = this.GetCanvasContext(canvas);
        var position = drawable.draw_position;
        ctx.fillStyle = color;
        if (drawable.draw_type == 3 /* game_piece */) {
            var piece = drawable;
            var dir_mult = directions_multipliers[piece.direction];
            ctx.fillText(piece.draw_text, (position.x + 0.5) * this.tileWidth, (position.y + 0.5) * this.tileHeight);
            ctx.fillStyle = 'yellow';
            ctx.fillRect((position.x * this.tileWidth) + (dir_mult.x == 1 ? (this.tileWidth * 0.9) : 0 + this.gridLineWidth / 2), (position.y * this.tileHeight) + (dir_mult.y == 1 ? (this.tileHeight * 0.9) : 0 + this.gridLineWidth / 2), dir_mult.x == 0 ? this.tileWidth - (this.gridLineWidth) : (this.tileWidth * 0.1), dir_mult.y == 0 ? this.tileHeight - (this.gridLineWidth) : this.tileHeight * 0.1);
            return;
        }
        else if (drawable.draw_type == 1 /* text */) {
            ctx.fillText(drawable.draw_text, ((position.x + 0.5) * this.tileWidth), ((position.y + 0.5) * this.tileHeight));
            return;
        }
        else if (drawable.draw_type == 2 /* rect */) {
            var size = drawable.draw_rect;
            ctx.fillRect(position.x, position.y, size.x, size.y);
            return;
        }
        else if (drawable.draw_type == 0 /* sprite */) {
            var size = drawable.draw_rect;
            ctx.drawImage(drawable.draw_sprite, position.x, position.y, size.x, size.y);
            return;
        }
        DevelopmentError("Invalid Draw Type.");
    };
    CanvasManager.prototype.DrawTile = function (x, y, color) {
        var ctx = this.GetCanvasContext(0 /* background */);
        ctx.fillStyle = color;
        ctx.fillRect(this.tileWidth * x, this.tileHeight * y, this.tileWidth, this.tileHeight);
    };
    CanvasManager.prototype.DrawBoard = function () {
        var ctx = this.GetCanvasContext(1 /* midground */);
        var i = 0;
        this.tileWidth = this.canvasWidth / this.boardWidth;
        this.tileHeight = this.canvasHeight / this.boardHeight;
        while (i < this.boardWidth) {
            ctx.moveTo(i * this.tileWidth, 0);
            ctx.lineTo(i++ * this.tileWidth, this.canvasHeight);
        }
        i = 0;
        while (i < this.boardHeight) {
            ctx.moveTo(0, i * this.tileHeight);
            ctx.lineTo(this.canvasWidth, i++ * this.tileHeight);
        }
        ctx.strokeStyle = 'black';
        ctx.lineWidth = this.gridLineWidth;
        ctx.stroke();
    };
    CanvasManager.prototype.SetBoardDimensions = function (board_size) {
        this.boardWidth = board_size;
        this.boardHeight = board_size;
    };
    CanvasManager.prototype.Resize = function () {
        this.canvasWidth = canvasContainer.clientWidth * this.scaleX;
        this.canvasHeight = canvasContainer.clientHeight * this.scaleY;
        canvasBackground.width = this.canvasWidth;
        canvasBackground.height = this.canvasHeight;
        canvasMidground.width = this.canvasWidth;
        canvasMidground.height = this.canvasHeight;
        canvasForeground.width = this.canvasWidth;
        canvasForeground.height = this.canvasHeight;
        this.gridLineWidth = this.canvasWidth * 0.005;
        this.DrawBoard();
        ctxForeground.font = (this.tileHeight * 0.8) + "px sans-serif";
        ctxForeground.textAlign = 'center';
        ctxForeground.textBaseline = 'middle';
        HandleEvents(this.resizeEvents);
    };
    return CanvasManager;
}());
//#endregion
//#region  GAME_MANAGER
var GameManager = /** @class */ (function () {
    function GameManager(game) {
        this.last_tick = 0;
        this.running = false;
        this.raf_index = null;
        this.delta = 0;
        this.game = game;
    }
    GameManager.prototype.start = function () {
        if (this.running)
            return false;
        this.last_tick = Date.now();
        this.running = true;
        return true;
    };
    GameManager.prototype.pause = function () {
        if (!this.running)
            return false;
        this.running = false;
        cancelAnimationFrame(this.raf_index);
        this.raf_index = null;
        return true;
    };
    GameManager.prototype.Stop = function () {
        this.running = true;
        this.pause();
    };
    GameManager.prototype.Reset = function (game) {
        this.Stop();
        this.last_tick = 0;
        this.running = false;
        this.raf_index = null;
        this.delta = 0;
        this.game = game;
    };
    GameManager.prototype.Update = function () {
        var now = Date.now();
        this.delta = now - this.last_tick;
        this.game.Update(this.delta);
        this.last_tick = now;
        requestAnimationFrame(this.Update);
    };
    GameManager.prototype.LogGame = function () {
        console.log(this.game);
    };
    return GameManager;
}());
var GamePiece = /** @class */ (function () {
    function GamePiece(active, piece_value_offset) {
        this.direction = 0 /* up */;
        this.combat_end_events = [];
        this.turn_start_events = [];
        this.turn_end_events = [];
        this.round_start_events = [];
        this.round_end_events = [];
        this.on_enter_events = [];
        this.on_leave_events = [];
        this.position = new Vector2();
        this.last_position = new Vector2();
        this.draw_position = new Vector2();
        this.draw_rect = new Vector2();
        this.draw_type = 3 /* game_piece */;
        this.value = null;
        this.active = false;
        this.lerpTimer = 0;
        this.active = active;
        this.piece_value_offset = piece_value_offset;
    }
    GamePiece.prototype.SetDirection = function (direction) {
        this.direction = direction;
    };
    GamePiece.prototype.AddEvent = function (event, type) {
        console.log('type_add_event: ' + type);
        return AddEvent(this.GetEventArr(type), event);
    };
    GamePiece.prototype.RemoveEvent = function (id, func, type) {
        return RemoveEvent(this.GetEventArr(type), id, func);
    };
    GamePiece.prototype.GetEventArr = function (type) {
        if (0 /* combat_end */ == type)
            return this.combat_end_events;
        else if (1 /* turn_start */ == type)
            return this.turn_start_events;
        else if (2 /* turn_end */ == type)
            return this.turn_end_events;
        else if (3 /* round_start */ == type)
            return this.round_start_events;
        else if (4 /* round_end */ == type)
            return this.round_end_events;
        else if (6 /* on_enter */ == type)
            return this.on_enter_events;
        else if (5 /* on_leave */ == type)
            return this.on_leave_events;
        DevelopmentError("GetEventArr did not catch GamePieceEvent.");
    };
    GamePiece.prototype.GetBoardValue = function () {
        return this.value + this.piece_value_offset;
    };
    GamePiece.prototype.SetInitialPosition = function (x, y) {
        this.last_position.x = this.position.x;
        this.last_position.y = this.position.y;
        this.position.x = x;
        this.position.y = y;
        this.draw_position.x = x;
        this.draw_position.y = y;
    };
    GamePiece.prototype.SetPosition = function (x, y) {
        this.last_position.x = this.position.x;
        this.last_position.y = this.position.y;
        this.draw_position.x = x;
        this.draw_position.y = y;
        this.position.x = x;
        this.position.y = y;
    };
    GamePiece.prototype.SetLerpTimer = function (n) {
        this.lerpTimer = n;
    };
    GamePiece.prototype.SetDrawPosition = function (x, y) {
        this.draw_position.x = x;
        this.draw_position.y = y;
    };
    GamePiece.prototype.SetActive = function (b) {
        this.active = b;
    };
    GamePiece.prototype.SetValue = function (n) {
        this.value = n;
        this.draw_text = n.toString();
    };
    return GamePiece;
}());
var Player = /** @class */ (function () {
    function Player(pieces_length, piece_value_offset) {
        var _this = this;
        this.tiles = 1;
        this.pieces_length = null;
        this.piece_value_offset = piece_value_offset;
        this.pieces_length = pieces_length;
        (function (l) {
            _this.pieces = [];
            while (l-- > 0) {
                _this.pieces.push(new GamePiece(false, piece_value_offset));
            }
        })(pieces_length);
    }
    Player.prototype.SetLastDirection = function (direction) {
        this.last_direction = direction;
    };
    Player.prototype.RoundEnd = function () {
        var i = 0, l = this.pieces.length;
        while (i < l) {
            HandleEvents(this.pieces[i].round_end_events);
            HandleEvents(this.pieces[i].combat_end_events);
            i++;
        }
    };
    Player.prototype.AddTiles = function (n, x, y) {
        if (x === void 0) { x = null; }
        if (y === void 0) { y = null; }
        this.tiles += n;
    };
    return Player;
}());
var HumanPlayer = /** @class */ (function (_super) {
    __extends(HumanPlayer, _super);
    function HumanPlayer(pieces_length, piece_value_offset) {
        return _super.call(this, pieces_length, piece_value_offset) || this;
    }
    return HumanPlayer;
}(Player));
var BotPlayer = /** @class */ (function (_super) {
    __extends(BotPlayer, _super);
    function BotPlayer(pieces_length, piece_value_offset) {
        var _this = _super.call(this, pieces_length, piece_value_offset) || this;
        _this.tiles_arr = [];
        return _this;
    }
    BotPlayer.prototype.AddTiles = function (n, x, y) {
        if (x === void 0) { x = null; }
        if (y === void 0) { y = null; }
        this.tiles += n;
        if (n !== null && y != null) {
            if (n < 0)
                this.tiles_arr = this.tiles_arr.filter(function (vector2) { return !(vector2.x == x && vector2.y == y); });
            else
                this.tiles_arr.push(new Vector2(x, y));
        }
    };
    return BotPlayer;
}(Player));
var Game = /** @class */ (function () {
    function Game(difficulty, board_size, turns_per_round) {
        var _this = this;
        this.turn_player = 0 /* human */;
        this.deploying = false;
        this.deploy_counter = 0;
        this.turns_per_round = turns_per_round;
        if (board_size < 6 || board_size % 3 != 0)
            DevelopmentError("Invalid board size");
        this.difficulty = difficulty;
        (function (board_size) {
            var _x = 0;
            var _y = 0;
            _this.board = [];
            while (_y < board_size) {
                _this.board[_y] = [];
                _x = 0;
                while (_x < board_size) {
                    _this.board[_y].push(0);
                    _x++;
                }
                _y++;
            }
        })(board_size);
    }
    Game.prototype.Destroy = function () {
        canvas_manager.Reset();
    };
    Game.prototype.Update = function (delta) {
        DevelopmentError('Update Function not implemented in Game inheritor.');
        return;
    };
    Game.prototype.DrawPieces = function () {
        DevelopmentError('DrawPieces function not implemented in Game inheritor.');
        return;
    };
    Game.prototype.DrawTiles = function () {
        var x = 0, y = 0, lx = this.board[0].length, ly = this.board.length;
        while (y < ly) {
            x = 0;
            while (x < lx) {
                var tile = this.board[y][x];
                if (tile > 0)
                    tile = tile > this.piece_length ? -2 /* red */ : -1 /* blue */;
                canvas_manager.DrawTile(x, y, TileColor(tile));
                x++;
            }
            y++;
        }
    };
    Game.prototype.GetTile = function (x, y) {
        return this.board[y][x];
    };
    Game.prototype.GetPlayer = function (id) {
        DevelopmentError("Get player not implemented.");
        return null;
    };
    Game.prototype.GetOtherPlayer = function (id) {
        DevelopmentError("Get player not implemented.");
        return null;
    };
    Game.prototype.CheckPositionBounds = function (x, y) {
        if (x < 0 || x >= this.board.length ||
            y < 0 || y >= this.board.length)
            return false;
        return true;
    };
    Game.prototype.PassTurn = function () {
        DevelopmentError("PassTurn function not implemented in Game inheritor.");
    };
    Game.prototype.TurnEnd = function () {
        if (this.turn_counter >= this.turns_per_round)
            this.RoundEnd();
        this.turn_counter++;
        this.PassTurn();
        this.DrawTiles();
        this.DrawPieces();
    };
    Game.prototype.ResetTurnCounter = function () {
        this.turn_counter = 1;
    };
    Game.prototype.RoundEnd = function () {
        this.PlayerAttack(1 /* bot */);
        this.PlayerAttack(0 /* human */);
        this.GetPlayer(1 /* bot */).RoundEnd();
        this.GetPlayer(0 /* human */).RoundEnd();
        this.ResetTurnCounter();
        this.StartDeployTurn();
    };
    Game.prototype.StartDeployTurn = function () {
        this.deploy_counter = 0;
        this.deploying = true;
        if (!this.CheckPlayerCanDeploy(0 /* human */))
            this.deploy_counter++;
        if (!this.CheckPlayerCanDeploy(1 /* bot */))
            this.deploy_counter++;
        if (this.deploy_counter >= 2)
            this.EndDeployTurn();
    };
    Game.prototype.CheckPlayerCanDeploy = function (id) {
        var player = this.GetPlayer(id);
        var pieces = player.pieces;
        var i = 0, l = player.pieces.length;
        while (i < l) {
            if (!pieces[i++].active) {
                return true;
            }
        }
        return false;
    };
    Game.prototype.EndDeployTurn = function () {
        this.deploying = false;
    };
    Game.prototype.PlayerAttack = function (id) {
        var player = this.GetPlayer(id);
        var other_player = this.GetOtherPlayer(id);
        var pieces = player.pieces, i = 0, l = pieces.length, j, k;
        var piece;
        var x, y, nx, ny;
        var direction_mult;
        var target;
        var target_piece;
        var enemy_range_min = other_player.piece_value_offset;
        var enemy_range_max = other_player.piece_value_offset + this.piece_length;
        while (i < l) {
            piece = pieces[i];
            if (piece.active && piece.value != 1) {
                x = piece.position.x;
                y = piece.position.y;
                j = 1;
                k = piece.value;
                direction_mult = directions_multipliers[piece.direction];
                while (j <= k) {
                    console.log(j);
                    ny = y + (direction_mult.y * j);
                    nx = x + (direction_mult.x * j);
                    console.log(nx, ny, piece.value, id);
                    if (!this.CheckPositionBounds(nx, ny))
                        break;
                    target = this.board[ny][nx];
                    if (target == -3 /* obstacle */)
                        break;
                    if (target > enemy_range_min && target <= enemy_range_max) {
                        target_piece = other_player.pieces[(target - enemy_range_min) - 1];
                        if (piece.value >= target_piece.value)
                            target_piece.AddEvent(new InvokableEvent(target_piece, function () {
                                this.SetActive(false);
                            }), 0 /* combat_end */);
                    }
                    j++;
                }
            }
            i++;
        }
    };
    Game.prototype.PlayerInputMove = function (direction, id) {
        if (this.turn_player != id)
            return console.log('Not turn player!');
        this.PlayerMove(direction, id);
    };
    Game.prototype.GetPlayerColor = function (id) {
        if (id == 0 /* human */)
            return -1 /* blue */;
        return -2 /* red */;
    };
    Game.prototype.PlayerInputDeploy = function (x, y, index, id) {
        if (!this.CheckPositionBounds(x, y))
            return;
        if (this.board[y][x] != this.GetPlayerColor(id))
            return; //TODO: Handle invalid deploy input;
        var player = this.GetPlayer(id);
        var pieces = player.pieces;
        var i = 0, l = pieces.length;
        var piece;
        while (i < l) {
            piece = pieces[i++];
            if (!piece.active) {
                piece.SetInitialPosition(x, y);
                piece.SetValue(i + 1);
                piece.SetDirection(player.last_direction);
                this.board[y][x] = piece.GetBoardValue();
                break;
            }
        }
        this.deploy_counter++;
        if (this.deploy_counter >= 0)
            this.EndDeployTurn();
    };
    Game.prototype.PlayerMove = function (direction, id) {
        var x = directions_multipliers[direction].x;
        var y = directions_multipliers[direction].y;
        var player = this.GetPlayer(id);
        var other_player = this.GetOtherPlayer(id);
        if (!player)
            DevelopmentError('Error player is not defined.');
        var color = id == 0 /* human */ ? -1 /* blue */ : -2 /* red */;
        var other_color = id == 0 /* human */ ? -2 /* red */ : -1 /* blue */;
        var i = 0, l = player.pieces_length, j = 0, k;
        var start_position;
        player.SetLastDirection(direction);
        while (i < l) {
            var piece = player.pieces[i++];
            piece.direction = direction;
            if (piece.active && piece.value % 2 != 0) {
                start_position = piece.position.Clone();
                j = 1;
                k = piece.value == 1 ? this.board.length : piece.value;
                while (j <= k) {
                    var _x = start_position.x + (x * j);
                    var _y = start_position.y + (y * j);
                    if (this.CheckPositionBounds(_x, _y)) {
                        var tile_val = this.board[_y][_x];
                        if (tile_val !== -1 /* blue */ && tile_val !== -2 /* red */ && tile_val !== 0 /* neutral */)
                            break;
                        else {
                            if (tile_val == other_color)
                                other_player.AddTiles(-1, _x, _y);
                            player.AddTiles(1, _x, _y);
                            this.board[piece.position.y][piece.position.x] = color;
                            piece.SetPosition(_x, _y);
                            this.board[piece.position.y][piece.position.x] = piece.GetBoardValue();
                        }
                    }
                    j++;
                }
            }
        }
    };
    return Game;
}());
var BotGame = /** @class */ (function (_super) {
    __extends(BotGame, _super);
    function BotGame(difficulty) {
        var _this = _super.call(this, difficulty, 12, 3) || this;
        _this.botTurn = false;
        _this.piece_length = 5;
        if (!_this.piece_length || _this.piece_length <= 0)
            DevelopmentError("Piece length is not valid");
        _this.human = new HumanPlayer(_this.piece_length, 0);
        _this.bot = new BotPlayer(_this.piece_length, _this.piece_length);
        {
            //Set Initial Positions
            var piece = void 0;
            var width_is_even = _this.board[0].length % 2 == 0;
            var yDif = Math.ceil((_this.board.length / 3) / 2);
            var _x = void 0, _y = void 0;
            piece = _this.human.pieces[0];
            piece.SetDirection(2 /* down */);
            piece.SetActive(true);
            piece.SetInitialPosition(Math.floor(_this.board[0].length / 2) - 1, _this.board.length - yDif);
            piece.SetValue(1);
            _this.board[piece.position.y][piece.position.x] = piece.GetBoardValue();
            piece = _this.bot.pieces[0];
            _x = Math.floor(_this.board[0].length / 2) + (width_is_even ? 0 : 1);
            _y = yDif - 1;
            piece.SetDirection(0 /* up */);
            piece.SetActive(true);
            piece.SetInitialPosition(_x, _y);
            piece.SetValue(1);
            _this.board[piece.position.y][piece.position.x] = piece.GetBoardValue();
            _this.bot.AddTiles(0, _x, _y);
        }
        {
            //Generate Obstacles
            var i = 0, j = void 0, l = _this.board.length / 3, posX = void 0, posY = void 0;
            while (i < l) {
                j = 0;
                while (j < l) {
                    posX = (j * 3) + Math.floor(Math.random() * 3);
                    posY = (i * 3) + obstaclePatternY[j % 3];
                    if (_this.board[posY][posX] > 0)
                        posX > 0 ? posX-- : posX++;
                    _this.board[posY][posX] = -3 /* obstacle */;
                    j++;
                }
                i++;
            }
        }
        if (canvas_manager) {
            canvas_manager.SetBoardDimensions(_this.board.length);
            canvas_manager.ClearCanvas();
            canvas_manager.DrawBoard();
            _this.DrawTiles();
            _this.DrawPieces();
            _this.draw_tiles_event_id = canvas_manager.AddEvent(new InvokableEvent(_this, _this.DrawTiles, -1), 0 /* resize */);
            _this.draw_pieces_event_id = canvas_manager.AddEvent(new InvokableEvent(_this, _this.DrawPieces, -1), 0 /* resize */);
        }
        else
            DevelopmentError("canvas_manager is not initialized!");
        return _this;
    }
    BotGame.prototype.PassTurn = function () {
        if (this.turn_player == 1 /* bot */)
            this.turn_player = 0 /* human */;
        else
            this.turn_player = 1 /* bot */;
    };
    BotGame.prototype.DrawPieces = function () {
        var i = 0, l = this.piece_length;
        while (i < l) {
            var piece = this.human.pieces[i++];
            if (piece && piece.active)
                canvas_manager.Draw(piece, 2 /* foreground */, 'white');
        }
        i = 0;
        while (i < l) {
            var piece = this.bot.pieces[i++];
            if (piece && piece.active)
                canvas_manager.Draw(piece, 2 /* foreground */, 'black');
        }
    };
    BotGame.prototype.GetPlayer = function (id) {
        if (id == 1 /* bot */)
            return this.bot;
        return this.human;
    };
    BotGame.prototype.GetOtherPlayer = function (id) {
        if (id == 1 /* bot */)
            return this.human;
        return this.bot;
    };
    BotGame.prototype.Update = function (delta) {
    };
    BotGame.prototype.PlayerAction = function (action) {
        console.log("Player action: " + action);
    };
    return BotGame;
}(Game));
//#endregion
//#endregion
//#region APP_MANAGER
var AppManager = /** @class */ (function () {
    function AppManager() {
        var _this = this;
        this.game_type = 0 /* bot */;
        this.difficulty = 0 /* easy */;
        this.buttonEasy = document.getElementById('button-easy');
        this.buttonHard = document.getElementById('button-hard');
        this.buttonInsane = document.getElementById('button-insane');
        this.buttonEasy.onclick = function () { return _this.SetDifficulty(0 /* easy */); };
        this.buttonHard.onclick = function () { return _this.SetDifficulty(1 /* hard */); };
        this.buttonInsane.onclick = function () { return _this.SetDifficulty(2 /* insane */); };
    }
    AppManager.prototype.GetGame = function () {
        if (this.game_type == 0 /* bot */)
            return new BotGame(this.difficulty);
        DevelopmentError("Conditional not catching bot game.");
        return new BotGame(this.difficulty);
    };
    AppManager.prototype.SetDifficulty = function (difficulty) {
        this.difficulty = difficulty;
    };
    AppManager.prototype.SetGameType = function (type) {
        this.game_type = type;
    };
    AppManager.prototype.Start = function () {
        game_manager = new GameManager(this.GetGame());
        game_manager.LogGame();
    };
    return AppManager;
}());
//#endregion
var canvas_manager = new CanvasManager(1, 1);
var app_manager = new AppManager();
