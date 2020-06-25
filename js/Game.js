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
var game_manager;
//#region HELPERS
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
//#endregion
//#region CONSTS
var canvasBackground = document.getElementById('canvas-background');
var canvasMidground = document.getElementById('canvas-midground');
var canvasForeground = document.getElementById('canvas-foreground');
var canvasContainer = document.getElementById('canvas-container');
var ctxBackground = canvasBackground.getContext('2d');
var ctxMidground = canvasMidground.getContext('2d');
var ctxForeground = canvasForeground.getContext('2d');
var CanvasManager = /** @class */ (function () {
    function CanvasManager(scaleX, scaleY) {
        var _this = this;
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        var throttle = Throttle();
        window.addEventListener('resize', function () { return throttle.apply(_this, [_this.Resize, 250]); });
        this.Resize();
    }
    CanvasManager.prototype.ClearCanvas = function (canvas) {
        if (canvas === void 0) { canvas = null; }
        if (canvas == null) {
            ctxBackground.clearRect(0, 0, this.boardWidth, this.boardHeight);
            ctxMidground.clearRect(0, 0, this.boardWidth, this.boardHeight);
            ctxForeground.clearRect(0, 0, this.boardWidth, this.boardHeight);
            return;
        }
        if (canvas == 0 /* background */)
            ctxBackground.clearRect(0, 0, this.boardWidth, this.boardHeight);
        else if (canvas == 1 /* midground */)
            ctxMidground.clearRect(0, 0, this.boardWidth, this.boardHeight);
        else if (canvas == 2 /* foreground */)
            ctxForeground.clearRect(0, 0, this.boardWidth, this.boardHeight);
        else
            throw Error("Invalid layer");
    };
    CanvasManager.prototype.DrawBoard = function () {
        var i = 0;
        var x = this.canvasWidth / this.boardWidth;
        var y = this.canvasHeight / this.boardHeight;
        while (i < this.boardWidth) {
            ctxBackground.moveTo(i * x, 0);
            ctxBackground.lineTo(i++ * x, this.canvasHeight);
        }
        i = 0;
        while (i < this.boardHeight) {
            ctxBackground.moveTo(0, i * y);
            ctxBackground.lineTo(this.canvasWidth, i++ * y);
        }
        ctxBackground.strokeStyle = 'black';
        ctxBackground.stroke();
    };
    CanvasManager.prototype.SetBoardDimensions = function (x, y) {
        this.boardWidth = x;
        this.boardHeight = y;
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
        this.DrawBoard();
        console.log('resize');
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
        this.value = null;
        this.active = false;
        this.lerpTimer = 0;
        this.active = active;
        this.piece_value_offset = piece_value_offset;
    }
    GamePiece.prototype.GetBoardValue = function () {
        return this.value + this.piece_value_offset;
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
    function Game(difficulty, x, y) {
        var _this = this;
        this.difficulty = difficulty;
        if (canvas_manager) {
            canvas_manager.SetBoardDimensions(x, y);
            canvas_manager.ClearCanvas();
            canvas_manager.DrawBoard();
        }
        else
            throw Error("canvas_manager is not initialized!");
        (function (x, y) {
            if (x <= 0 || y <= 0)
                throw Error("Board dimensions must be greater than zero.");
            var _x = 0;
            var _y = 0;
            _this.board = [];
            while (_y < y) {
                _this.board[_y] = [];
                _x = 0;
                while (_x < x) {
                    _this.board[_y].push(0);
                    _x++;
                }
                _y++;
            }
        })(x, y);
    }
    Game.prototype.Update = function (delta) {
        throw Error('Update Function not implemented in Game inheritor.');
        return;
    };
    Game.prototype.GetTile = function (x, y) {
        return this.board[y][x];
    };
    Game.prototype.GetPlayer = function (id) {
        throw Error("Get player not implemented.");
        return null;
    };
    Game.prototype.GetOtherPlayer = function (id) {
        throw Error("Get player not implemented.");
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
        throw Error("PlayerMove did not catch the direction.");
    };
    Game.prototype.HandleMove = function (x, y, id) {
        var player = this.GetPlayer(id);
        var other_player = this.GetOtherPlayer(id);
        if (!player)
            throw Error('Error player is not defined.');
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
                        var tile_val = this.board[_x][_y];
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
        var _this = _super.call(this, difficulty, 9, 9) || this;
        _this.piece_length = 5;
        _this.botTurn = false;
        if (!_this.piece_length || _this.piece_length <= 0)
            throw Error("Piece length is not valid");
        _this.human = new HumanPlayer(_this.piece_length, 0);
        _this.bot = new BotPlayer(_this.piece_length, _this.piece_length);
        {
            var piece = void 0;
            piece = _this.human.pieces[0];
            piece.SetActive(true);
            piece.SetPosition(Math.floor(_this.board[0].length / 2), _this.board.length - 2);
            piece.SetValue(1);
            _this.board[piece.position.y][piece.position.x] = piece.GetBoardValue();
            piece = _this.bot.pieces[0];
            piece.SetActive(true);
            piece.SetPosition(Math.ceil(_this.board[0].length / 2), 2);
            piece.SetValue(1);
            _this.board[piece.position.y][piece.position.x] = piece.GetBoardValue();
        }
        return _this;
    }
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
        throw Error("Conditional not catching bot game.");
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
