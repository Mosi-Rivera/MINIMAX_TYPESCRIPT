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
//CANVAS
var canvasBackground = document.getElementById('canvas-background');
var canvasMidground = document.getElementById('canvas-midground');
var canvasForeground = document.getElementById('canvas-foreground');
var canvasContainer = document.getElementById('canvas-container');
var ctxBackground = canvasBackground.getContext('2d');
var ctxMidground = canvasMidground.getContext('2d');
var ctxForeground = canvasForeground.getContext('2d');
//BUTTONS
var inputContainer = document.getElementById('input-container');
var buttonInputUp = document.getElementById('input-up');
var buttonInputDown = document.getElementById('input-down');
var buttonInputLeft = document.getElementById('input-left');
var buttonInputRight = document.getElementById('input-right');
var humanDeployContainer = document.getElementById('human-deploy-container');
var botDeployContainer = document.getElementById('bot-deploy-container');
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
    CanvasManager.prototype.CanvasToBoardPosition = function (x, y) {
        var _x = Math.floor(x / this.tileWidth);
        var _y = Math.floor(y / this.tileHeight);
        return new Vector2(_x, _y);
    };
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
            ctxBackground.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            ctxMidground.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            ctxForeground.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            return;
        }
        this.GetCanvasContext(canvas).clearRect(0, 0, this.canvasWidth, this.canvasHeight);
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
        var _this = this;
        this.last_tick = 0;
        this.running = false;
        this.raf_index = null;
        this.delta = 0;
        this.game = game;
        buttonInputUp.onclick = function () { return _this.MoveInput(0 /* up */); };
        buttonInputDown.onclick = function () { return _this.MoveInput(2 /* down */); };
        buttonInputLeft.onclick = function () { return _this.MoveInput(3 /* left */); };
        buttonInputRight.onclick = function () { return _this.MoveInput(1 /* right */); };
    }
    GameManager.prototype.Destroy = function () {
        buttonInputUp.onclick = null;
        buttonInputDown.onclick = null;
        buttonInputRight.onclick = null;
        buttonInputLeft.onclick = null;
        this.game.Destroy();
    };
    GameManager.prototype.MoveInput = function (direction) {
        this.game.PlayerInputMove(direction, 0 /* human */);
    };
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
    function GamePiece(active, piece_value_offset, value) {
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
        this.value = value;
        this.draw_text = value.toString();
        this.cooldown = (value - 1) * 2;
        this.base_cooldown = this.cooldown;
    }
    GamePiece.prototype.TurnEnd = function () {
        this.cooldown--;
        if (this.cooldown < 0)
            this.element.children[1].innerHTML = '';
        else
            this.element.children[1].innerHTML = this.cooldown.toString();
        if (this.active || this.cooldown > 0) {
            this.element.style.backgroundColor = 'black';
            this.element.children[0].style.color = '#464646';
            this.element.children[1].style.color = '#464646';
        }
        else {
            this.element.style.backgroundColor = this.piece_value_offset > 0 ? 'red' : 'blue';
            this.element.children[0].style.color = 'white';
            this.element.children[1].style.color = 'white';
        }
    };
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
        if (!b) {
            this.cooldown = this.base_cooldown;
        }
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
            while (l > 0) {
                _this.pieces.push(new GamePiece(false, piece_value_offset, (pieces_length - l--) + 1));
            }
        })(pieces_length);
    }
    Player.prototype.TurnEnd = function () {
        var i = 0, l = this.pieces.length;
        while (i < l)
            this.pieces[i++].TurnEnd();
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
        var _this = _super.call(this, pieces_length, piece_value_offset) || this;
        _this.color = -1 /* blue */;
        return _this;
    }
    return HumanPlayer;
}(Player));
var BotPlayer = /** @class */ (function (_super) {
    __extends(BotPlayer, _super);
    function BotPlayer(pieces_length, piece_value_offset) {
        var _this = _super.call(this, pieces_length, piece_value_offset) || this;
        _this.tiles_arr = [];
        _this.color = -2 /* red */;
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
//#endregion
//#region MINIMAX
function GAMESTATE_EVALUATOR(board, pieces_length) {
    var player_score = 0;
    var other_score = 0;
    var player_pieces = 0;
    var other_pieces = 0;
    var x = 0, y = 0, l = board.length;
    var tile;
    var sub_value;
    while (y < l) {
        x = 0;
        while (x < l) {
            tile = board[y][x];
            if (tile > 0) {
                if (tile <= pieces_length) {
                    if (tile == 1)
                        other_score += board.length;
                    else
                        other_score += tile * 2;
                    other_pieces++;
                }
                else {
                    var value = tile - pieces_length;
                    if (value == 1)
                        player_score += board.length;
                    else
                        player_score += value * 2;
                    player_pieces++;
                }
            }
            else if (tile == -2 /* red */)
                player_score++;
            else if (tile == -1 /* blue */)
                other_score++;
            x++;
        }
        y++;
    }
    if (player_pieces == 0)
        return -1000;
    else if (other_pieces == 0)
        return 1000;
    return player_score - other_score;
}
var BotGameCopy = /** @class */ (function () {
    function BotGameCopy(game) {
        this.board = BoardCopy(game.board);
        this.piece_length = game.piece_length;
        this.bot = new PlayerCopy(game.bot);
        this.human = new PlayerCopy(game.human);
    }
    return BotGameCopy;
}());
var PlayerCopy = /** @class */ (function () {
    function PlayerCopy(player) {
        this.color = player.color;
        this.tiles = player.tiles;
        this.piece_value_offset = player.piece_value_offset;
        this.pieces_length = player.pieces_length;
        var i = 0, l = player.pieces.length;
        this.pieces = [];
        this.pieces.length = l;
        while (i < l) {
            this.pieces[i] = new GamePieceCopy(player.pieces[i]);
            i++;
        }
    }
    PlayerCopy.prototype.AddTiles = function (n, x, y) {
        this.tiles += n;
    };
    return PlayerCopy;
}());
var GamePieceCopy = /** @class */ (function () {
    function GamePieceCopy(piece) {
        this.position = new Vector2(piece.position.x, piece.position.y);
        this.active = piece.active;
        this.value = piece.value;
        this.piece_value_offset = piece.piece_value_offset;
        this.board_value = piece.piece_value_offset + piece.value;
    }
    GamePieceCopy.prototype.SetActive = function (b) {
        this.active = b;
    };
    GamePieceCopy.prototype.SetPosition = function (x, y) {
        this.position.x = x;
        this.position.y = y;
    };
    GamePieceCopy.prototype.GetBoardValue = function () {
        return this.board_value;
    };
    return GamePieceCopy;
}());
function BoardCopy(board) {
    var x = 0, y = 0, l = board.length;
    var result = [];
    result.length = l;
    while (y < l) {
        result[y] = [];
        x = 0;
        while (x < l) {
            result[y][x] = board[y][x];
            x++;
        }
        y++;
    }
    return result;
}
function MINIMAX(depth, game, max) {
    if (max === void 0) { max = false; }
    var score = GAMESTATE_EVALUATOR(game.board, game.piece_length);
    var game_copy;
    if (score == 1000)
        return score;
    if (score == -1000)
        return score;
    if (depth <= 0)
        return score;
    var i = 0, l = 4;
    if (max) {
        while (i < l) {
            game_copy = new BotGameCopy(game);
            Game.PlayerMove(i++, game_copy.board, game_copy.piece_length, game_copy.bot, game_copy.human);
            score = Math.max(score, MINIMAX(depth - 1, game_copy, !max));
        }
    }
    else {
        while (i < l) {
            game_copy = new BotGameCopy(game);
            Game.PlayerMove(i++, game_copy.board, game_copy.piece_length, game_copy.human, game_copy.bot);
            score = Math.min(score, MINIMAX(depth - 1, game_copy, !max));
        }
    }
    return score;
}
function COUNT_PIECES(board, pieces_length) {
    var human_count = 0, bot_count = 0;
    var x = 0, y = 0, l = board.length;
    while (y < l) {
        x = 0;
        while (x < l) {
            var tile = board[y][x++];
            if (tile > 0) {
                if (tile <= pieces_length) {
                    human_count++;
                }
                else
                    bot_count++;
            }
        }
        y++;
    }
    console.log("Pieces Count: (human = " + human_count + " | bot = " + bot_count + ");");
    return { human_count: human_count, bot_count: bot_count };
}
function BOT_MOVE(depth, game) {
    var bot = game.bot;
    var pieces = bot.pieces;
    var game_copy = new BotGameCopy(game);
    var i = 0, l = pieces.length;
    var score = -1000; // GAMESTATE_EVALUATOR(game_copy.board,game_copy.bot);
    var result = 2 /* down */;
    var new_score;
    var summon_piece_index = null;
    var summon_piece_score = score;
    var summon_piece_position = null;
    while (i < l) {
        var piece = pieces[i];
        if (piece && !piece.active && piece.cooldown <= 0) {
            summon_piece_index = i;
            break;
        }
        i++;
    }
    console.log(summon_piece_index, "summon_piece_index");
    if (summon_piece_index !== null) {
        i = 0;
        l = bot.tiles_arr.length;
        while (i < l) {
            var tile = bot.tiles_arr[i++];
            var temp = game_copy.board[tile.y][tile.x];
            game_copy.board[tile.y][tile.x] = pieces[summon_piece_index].GetBoardValue();
            new_score = MINIMAX(depth - 1, game_copy);
            if (new_score > summon_piece_score) {
                summon_piece_position = tile.Clone();
                summon_piece_score = new_score;
            }
            game_copy.board[tile.y][tile.x] = temp;
        }
    }
    i = 0;
    l = 4;
    while (i < l) {
        game_copy = new BotGameCopy(game);
        Game.PlayerMove(i, game_copy.board, game_copy.piece_length, game_copy.bot, game_copy.human);
        new_score = MINIMAX(depth - 1, game_copy);
        if (new_score > score) {
            result = i;
            score = new_score;
        }
        i++;
    }
    if (summon_piece_index !== null) {
        if (summon_piece_score > score) {
            game.PlayerDeploy(1 /* bot */, summon_piece_position.x, summon_piece_position.y, summon_piece_index);
            return;
        }
    }
    Game.PlayerMove(result, game.board, game.piece_length, game.bot, game.human);
    game.TurnEnd();
}
var Game = /** @class */ (function () {
    function Game(difficulty, board_size) {
        var _this = this;
        this.summon_index = null;
        this.turn_counter = 1;
        this.turn_player = 0 /* human */;
        this.deploying = false;
        this.deploy_counter = 0;
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
        inputContainer.onclick = function (e) {
            if (_this.summon_index !== null) {
                var _position = canvas_manager.CanvasToBoardPosition(e.offsetX, e.offsetY);
                console.log(_position, e.offsetX, e.offsetY);
                if (Game.CheckPositionBounds(_this.board, _position.x, _position.y)) {
                    _this.PlayerDeploy(0 /* human */, _position.x, _position.y, _this.summon_index);
                    var player = _this.GetPlayer(0 /* human */);
                    var i = 0, l = _this.piece_length;
                    while (i < l)
                        player.pieces[i++].element.classList.remove('selected');
                    inputContainer.classList.remove('deploying');
                }
            }
        };
    }
    Game.prototype.Destroy = function () {
        canvas_manager.Reset();
        inputContainer.onclick = null;
        inputContainer.classList.remove('deploying');
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
    Game.CheckPositionBounds = function (board, x, y) {
        if (x < 0 || x >= board.length ||
            y < 0 || y >= board.length)
            return false;
        return true;
    };
    Game.prototype.PassTurn = function () {
        DevelopmentError("PassTurn function not implemented in Game inheritor.");
    };
    Game.prototype.TurnEnd = function () {
        this.turn_counter++;
        this.PassTurn();
        canvas_manager.ClearCanvas(2 /* foreground */);
        this.DrawTiles();
        this.DrawPieces();
    };
    Game.prototype.ResetTurnCounter = function () {
        this.turn_counter = 1;
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
                    ny = y + (direction_mult.y * j);
                    nx = x + (direction_mult.x * j);
                    if (!Game.CheckPositionBounds(this.board, nx, ny))
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
        if (this.deploying)
            return console.log("Deployment phase in progress.");
        if (this.turn_player != id)
            return console.log('Not turn player!');
        Game.PlayerMove(direction, this.board, this.piece_length, this.GetPlayer(id), this.GetOtherPlayer(id));
        this.TurnEnd();
    };
    Game.prototype.GetPlayerColor = function (id) {
        return this.GetPlayer(id).color;
    };
    Game.prototype.PlayerDeploy = function (id, x, y, piece_index) {
        if (this.turn_player != id)
            return console.log("Not turn player");
        var player = this.GetPlayer(id);
        if (this.board[y][x] !== player.color)
            return DevelopmentError("Invalid deploy position!");
        var piece = player.pieces[piece_index];
        if (!piece || piece.active)
            return DevelopmentError("Invalid piece index");
        piece.SetActive(true);
        piece.SetPosition(x, y);
        this.board[y][x] = piece.GetBoardValue();
        this.TurnEnd();
    };
    Game.PlayerMove = function (direction, board, piece_length, player, other_player) {
        var x = directions_multipliers[direction].x;
        var y = directions_multipliers[direction].y;
        var color = player.color;
        var other_color = other_player.color;
        var i = 0, l = player.pieces.length, j, k;
        var start_position;
        var enemy_range_min = other_player.piece_value_offset;
        var enemy_range_max = enemy_range_min + piece_length;
        while (i < l) {
            var piece = player.pieces[i++];
            piece.direction = direction;
            if (piece.active) {
                start_position = piece.position.Clone();
                j = 1;
                k = piece.value == 1 ? board.length : piece.value;
                while (j <= k) {
                    var _x = start_position.x + (x * j);
                    var _y = start_position.y + (y * j);
                    if (Game.CheckPositionBounds(board, _x, _y)) {
                        var tile_val = board[_y][_x];
                        if (tile_val > 0) {
                            if (piece.value !== 1) {
                                if (tile_val > enemy_range_min && tile_val <= enemy_range_max) {
                                    if (tile_val - enemy_range_min <= piece.value) {
                                        other_player.pieces[tile_val - enemy_range_min - 1].SetActive(false);
                                        other_player.AddTiles(-1, _x, _y);
                                        player.AddTiles(1, _x, _y);
                                        board[piece.position.y][piece.position.x] = color;
                                        piece.SetPosition(_x, _y);
                                        board[piece.position.y][piece.position.x] = piece.GetBoardValue();
                                    }
                                }
                            }
                            break;
                        }
                        else if (tile_val !== -3 /* obstacle */) {
                            if (tile_val === other_color)
                                other_player.AddTiles(-1, _x, _y);
                            player.AddTiles(1, _x, _y);
                            board[piece.position.y][piece.position.x] = color;
                            piece.SetPosition(_x, _y);
                            board[piece.position.y][piece.position.x] = piece.GetBoardValue();
                        }
                        else
                            break;
                    }
                    else
                        break;
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
        var _this = _super.call(this, difficulty, 9) || this;
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
            _this.board[piece.position.y][piece.position.x] = piece.GetBoardValue();
            piece = _this.bot.pieces[0];
            _x = Math.floor(_this.board[0].length / 2) + (width_is_even ? 0 : 1);
            _y = yDif - 1;
            piece.SetDirection(0 /* up */);
            piece.SetActive(true);
            piece.SetInitialPosition(_x, _y);
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
        {
            var i = 0, j = 0, l = _this.piece_length;
            var container = humanDeployContainer;
            var player = _this.human;
            while (i++ < 2) {
                j = 0;
                var _loop_1 = function () {
                    var piece = player.pieces[j];
                    var elem = document.createElement('div');
                    elem.appendChild(document.createElement('span'));
                    elem.appendChild(document.createElement('span'));
                    elem.children[0].innerHTML = piece.draw_text;
                    elem.children[1].innerHTML = piece.cooldown <= 0 ? '' : piece.cooldown.toString();
                    elem.style.backgroundColor = 'black';
                    elem.children[0].style.color = '#464646';
                    elem.children[1].style.color = '#464646';
                    container.appendChild(elem);
                    elem.style.width = (100 / this_1.piece_length) + '%';
                    piece.element = elem;
                    if (i == 1)
                        elem.onclick = function () {
                            var index = piece.value - 1;
                            if (_this.summon_index == index) {
                                _this.summon_index = null;
                                elem.classList.remove('selected');
                                inputContainer.classList.remove('deploying');
                                return;
                            }
                            if (!piece.active && piece.cooldown <= 0) {
                                _this.summon_index = index;
                                var i_1 = 0, l_1 = _this.piece_length;
                                while (i_1 < l_1)
                                    _this.human.pieces[i_1++].element.classList.remove('selected');
                                elem.classList.add('selected');
                                inputContainer.classList.add('deploying');
                            }
                        };
                    j++;
                };
                var this_1 = this;
                while (j < l) //human
                 {
                    _loop_1();
                }
                container = botDeployContainer;
                player = _this.bot;
            }
        }
        if (canvas_manager) {
            canvas_manager.SetBoardDimensions(_this.board.length);
            canvas_manager.ClearCanvas();
            canvas_manager.DrawBoard();
            _this.DrawTiles();
            _this.DrawPieces();
            canvas_manager.AddEvent(new InvokableEvent(_this, _this.DrawTiles, -1), 0 /* resize */);
            canvas_manager.AddEvent(new InvokableEvent(_this, _this.DrawPieces, -1), 0 /* resize */);
        }
        else
            DevelopmentError("canvas_manager is not initialized!");
        return _this;
    }
    BotGame.prototype.PassTurn = function () {
        var _this = this;
        if (this.turn_player === 1 /* bot */) {
            this.bot.TurnEnd();
            this.turn_player = 0 /* human */;
        }
        else {
            this.human.TurnEnd();
            this.turn_player = 1 /* bot */;
            setTimeout(function () {
                BOT_MOVE((_this.difficulty + 1) * 2, _this);
            }, 1500);
        }
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
        if (id === 1 /* bot */)
            return this.bot;
        return this.human;
    };
    BotGame.prototype.GetOtherPlayer = function (id) {
        if (id === 1 /* bot */)
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
        this.difficulty = 1 /* easy */;
        this.buttonEasy = document.getElementById('button-easy');
        this.buttonHard = document.getElementById('button-hard');
        this.buttonInsane = document.getElementById('button-insane');
        this.buttonEasy.onclick = function () { return _this.SetDifficulty(1 /* easy */); };
        this.buttonHard.onclick = function () { return _this.SetDifficulty(2 /* hard */); };
        this.buttonInsane.onclick = function () { return _this.SetDifficulty(3 /* insane */); };
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
        if (game_manager)
            game_manager.Destroy();
        game_manager = new GameManager(this.GetGame());
        game_manager.LogGame();
    };
    return AppManager;
}());
//#endregion
var canvas_manager = new CanvasManager(1, 1);
var app_manager = new AppManager();
