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
    function InvokableEvent(context, exec, parameters) {
        if (parameters === void 0) { parameters = []; }
        this.exec = exec;
        this.context = context;
        this.parameters = parameters;
    }
    InvokableEvent.prototype.Invoke = function () {
        this.exec.apply(this.context, this.parameters);
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
            eventArr[i].Invoke();
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
//#region CONSTS
var canvasBackground = document.getElementById('canvas-background');
var canvasMidground = document.getElementById('canvas-midground');
var canvasForeground = document.getElementById('canvas-foreground');
var canvasContainer = document.getElementById('canvas-container');
var ctxBackground = canvasBackground.getContext('2d');
var ctxMidground = canvasMidground.getContext('2d');
var ctxForeground = canvasForeground.getContext('2d');
var obstaclePatternY = [0, 2, 1];
var CanvasManager = /** @class */ (function () {
    function CanvasManager(scaleX, scaleY) {
        var _this = this;
        this.resizeEvents = [];
        this.drawBoardEvents = [];
        this.drawEvents = [];
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        var throttle = Throttle();
        window.addEventListener('resize', function () { return throttle.apply(_this, [_this.Resize, 250]); });
        this.Resize();
    }
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
        if (drawable.draw_type == 1 /* text */) {
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
        this.position = new Vector2();
        this.last_position = new Vector2();
        this.draw_position = new Vector2();
        this.draw_rect = new Vector2();
        this.draw_type = 1 /* text */;
        this.value = null;
        this.active = false;
        this.lerpTimer = 0;
        this.active = active;
        this.piece_value_offset = piece_value_offset;
    }
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
    Player.prototype.AddTiles = function (n) {
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
        return _super.call(this, pieces_length, piece_value_offset) || this;
    }
    return BotPlayer;
}(Player));
var Game = /** @class */ (function () {
    function Game(difficulty, board_size) {
        var _this = this;
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
        if (x < 0 || x > this.board.length ||
            y < 0 || y > this.board[0].length)
            return false;
        return true;
    };
    Game.prototype.PlayerMove = function (dir, id) {
        if (dir == 0 /* up */)
            return this.HandleMove(0, -1, id);
        else if (dir == 1 /* right */)
            return this.HandleMove(1, 0, id);
        else if (dir == 2 /* down */)
            return this.HandleMove(0, 1, id);
        else if (dir == 3 /* left */)
            return this.HandleMove(-1, 0, id);
        DevelopmentError("PlayerMove did not catch the direction.");
    };
    Game.prototype.HandleMove = function (x, y, id) {
        var player = this.GetPlayer(id);
        var other_player = this.GetOtherPlayer(id);
        if (!player)
            DevelopmentError('Error player is not defined.');
        var color = id == 0 /* human */ ? -1 /* blue */ : -2 /* red */;
        var other_color = id == 0 /* human */ ? -2 /* red */ : -1 /* blue */;
        var i = 0, l = player.pieces_length, j = 0, k;
        var start_position;
        while (i < l) {
            var piece = player.pieces[i++];
            if (piece && piece.active) {
                start_position = piece.position.Clone();
                j = 1;
                k = piece.value == 1 ? this.board.length : piece.value;
                while (j <= k) {
                    var _x = start_position.x + (x * j);
                    var _y = start_position.y + (y * j);
                    if (this.CheckPositionBounds(_x, _y)) {
                        var tile_val = this.board[_y][_x];
                        if (tile_val !== -1 /* blue */ && tile_val !== -2 /* red */ && tile_val !== 0 /* neutral */) {
                            this.board[piece.position.y][piece.position.x] = piece.GetBoardValue();
                            break;
                        }
                        else {
                            if (tile_val == other_color)
                                other_player.AddTiles(-1);
                            player.AddTiles(1);
                            this.board[piece.position.y][piece.position.x] = color;
                            piece.SetPosition(_x, _y);
                        }
                    }
                    else {
                        this.board[piece.position.y][piece.position.x] = piece.GetBoardValue();
                        break;
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
        var _this = _super.call(this, difficulty, 12) || this;
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
            var yPos = Math.ceil((_this.board.length / 3) / 2);
            piece = _this.human.pieces[0];
            piece.SetActive(true);
            piece.SetInitialPosition(Math.floor(_this.board[0].length / 2) - 1, _this.board.length - yPos);
            piece.SetValue(1);
            _this.board[piece.position.y][piece.position.x] = piece.GetBoardValue();
            piece = _this.bot.pieces[0];
            piece.SetActive(true);
            piece.SetInitialPosition(Math.floor(_this.board[0].length / 2) + (width_is_even ? 0 : 1), yPos - 1);
            piece.SetValue(1);
            _this.board[piece.position.y][piece.position.x] = piece.GetBoardValue();
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
            _this.draw_tiles_event_id = canvas_manager.AddEvent(new InvokableEvent(_this, _this.DrawTiles), 0 /* resize */);
            _this.draw_pieces_event_id = canvas_manager.AddEvent(new InvokableEvent(_this, _this.DrawPieces), 0 /* resize */);
        }
        else
            DevelopmentError("canvas_manager is not initialized!");
        return _this;
    }
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
