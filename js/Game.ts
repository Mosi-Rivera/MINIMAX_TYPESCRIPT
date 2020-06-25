let game_manager:GameManager;

//#region HELPERS
function Throttle () : Function
{
	let to:any = true;
	return function (func, delay) : void
    {
        if (to)
        {
            window.clearTimeout(to);
        }
        to = window.setTimeout(() => func.apply(this),delay);
    }
}
//#endregion

//#region CONSTS
const canvasBackground  : HTMLCanvasElement = document.getElementById('canvas-background') as HTMLCanvasElement;
const canvasMidground   : HTMLCanvasElement = document.getElementById('canvas-midground') as HTMLCanvasElement;
const canvasForeground  : HTMLCanvasElement = document.getElementById('canvas-foreground') as HTMLCanvasElement;
const canvasContainer   : HTMLElement = document.getElementById('canvas-container');
const ctxBackground = canvasBackground.getContext('2d');
const ctxMidground  = canvasMidground.getContext('2d');
const ctxForeground = canvasForeground.getContext('2d');

const enum CanvasLayers
{
    background = 0,
    midground,
    foreground
}

const enum Players
{
    human = 0,
    bot
}

const enum Directions{
    up = 0,
    right,
    down,
    left
}

const enum Difficulties
{
    easy = 0,
    hard,
    insane
}

const enum Gametypes
{
    bot = 0,
    human
}

const enum Tiles
{
    obstacle = -3,
    red = -2,
    blue = -1,
    neutral = 0
}
//#endregion

//#region CANVAS_MANAGER
interface IDrawable
{
    drawPosition:Vector2;
}

class CanvasManager
{
    private scaleX:number;
    private scaleY:number;
    public canvasWidth:number;
    public canvasHeight:number;
    private boardWidth:number;
    private boardHeight:number;
    constructor(scaleX:number,scaleY:number)
    {
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        let throttle = Throttle();
        window.addEventListener('resize',() => throttle.apply(this,[this.Resize,250]));
        this.Resize();
    }

    public ClearCanvas(canvas:CanvasLayers = null) : void
    {
        if (canvas == null)
        {
            ctxBackground.clearRect(0,0,this.boardWidth,this.boardHeight);
            ctxMidground.clearRect(0,0,this.boardWidth,this.boardHeight);
            ctxForeground.clearRect(0,0,this.boardWidth,this.boardHeight);
            return;
        }
        if (canvas == CanvasLayers.background)
            ctxBackground.clearRect(0,0,this.boardWidth,this.boardHeight);
        else if (canvas == CanvasLayers.midground)
            ctxMidground.clearRect(0,0,this.boardWidth,this.boardHeight);
        else if (canvas == CanvasLayers.foreground)
            ctxForeground.clearRect(0,0,this.boardWidth,this.boardHeight);
        else throw Error("Invalid layer");
    }

    public DrawBoard() : void
    {
        let i = 0;
        let x = this.canvasWidth / this.boardWidth;
        let y = this.canvasHeight / this.boardHeight;
        while (i < this.boardWidth)
        {
            ctxBackground.moveTo(i * x,0);
            ctxBackground.lineTo(i++ * x,this.canvasHeight);
        }
        i = 0;
        while (i < this.boardHeight)
        {
            ctxBackground.moveTo(0,i * y);
            ctxBackground.lineTo(this.canvasWidth,i++ * y);
        }
        ctxBackground.strokeStyle = 'black';
        ctxBackground.stroke();
    }

    public SetBoardDimensions(x:number,y:number) : void
    {
        this.boardWidth = x;
        this.boardHeight = y;
    }

    public Resize() : void
    {
        this.canvasWidth    = canvasContainer.clientWidth * this.scaleX;
        this.canvasHeight   = canvasContainer.clientHeight * this.scaleY;
        canvasBackground.width  = this.canvasWidth;
        canvasBackground.height = this.canvasHeight;
        canvasMidground.width   = this.canvasWidth;
        canvasMidground.height  = this.canvasHeight;
        canvasForeground.width  = this.canvasWidth;
        canvasForeground.height = this.canvasHeight;
        this.DrawBoard();
        console.log('resize');
    }
}
//#endregion

//#region Vector2
class Vector2
{
    public x:number;
    public y:number;
    constructor(x:number = 0,y:number = 0)
    {
        this.x = x;
        this.y = y;
    }

    Clone() : Vector2
    {
        return new Vector2(this.x,this.y);
    }
}
//#endregion

//#region  GAME_MANAGER
class GameManager
{
    private last_tick:number = 0;
    private running:boolean = false;
    private raf_index:number = null;
    private delta:number = 0;
    private game:IGame;

    constructor(game:IGame) {
        this.game = game;
    }

    public start() : boolean
    {
        if (this.running) return false;
        this.last_tick = Date.now();
        this.running = true;
        return true;
    }

    public pause() : boolean
    {
        if (!this.running) return false;
        this.running = false;
        cancelAnimationFrame(this.raf_index);
        this.raf_index = null;
        return true;
    }

    public Stop() : void
    {
        this.running = true;
        this.pause();
    }

    public Reset(game:IGame) : void
    {
        this.Stop();
        this.last_tick = 0;
        this.running = false;
        this.raf_index = null;
        this.delta = 0;
        this.game = game;
    }

    private Update() : void
    {
        let now = Date.now();
        this.delta = now - this.last_tick;
        this.game.Update(this.delta);
        this.last_tick = now;
        requestAnimationFrame(this.Update);
    }

    public LogGame() : void
    {
        console.log(this.game);
    }
}
//#endregion

//#region GAME_CLASSES

//#region GAME_PIECE
interface IGamePiece
{
    SetPosition(x:number,y:number) : void;
    SetActive(b:boolean) : void;
    SetValue(n:number) : void;
    GetBoardValue() : number;
}

class GamePiece implements IGamePiece
{
    public position         : Vector2 = new Vector2();
    public last_position    : Vector2 = new Vector2();
    public draw_position    : Vector2 = new Vector2();
    public value            : number  = null;
    public active           : boolean = false;
    public lerpTimer        : number  = 0;
    public piece_value_offset:number;
    
    constructor(active:boolean,piece_value_offset:number) 
    {
        this.active = active;
        this.piece_value_offset = piece_value_offset;
    }

    GetBoardValue() : number
    {
        return this.value + this.piece_value_offset;
    }

    SetPosition(x:number,y:number)
    {
        this.last_position.x = this.position.x;
        this.last_position.y = this.position.y;
        this.position.x = x;
        this.position.y = y;
    }

    SetLerpTimer(n:number)
    {
        this.lerpTimer = n;
    }

    SetDrawPosition(x:number,y:number)
    {
        this.draw_position.x = x;
        this.draw_position.y = y;
    }

    SetActive(b:boolean)
    {
        this.active = b;
    }

    SetValue(n:number)
    {
        this.value = n;
    }
}
//#endregion

//#region PLAYER
interface IPlayer
{
    AddTiles(n:number) : void;
    tiles:number;
    pieces_length:number;
    pieces:GamePiece[];
    piece_value_offset:number;
}

abstract class Player {
    public tiles:number = 1;
    public pieces_length:number = null;
    public pieces:GamePiece[];
    public piece_value_offset:number;

    constructor(pieces_length:number,piece_value_offset:number)
    {
        this.piece_value_offset = piece_value_offset;
        this.pieces_length = pieces_length;
        (
            (l:number) =>
            {
                this.pieces = [];
                while (l-- > 0) {
                    this.pieces.push(new GamePiece(false,piece_value_offset));
                }
            }
        )(pieces_length);
    }

    public AddTiles(n:number) : void
    {
        this.tiles += n;
    }
}

class HumanPlayer extends Player implements IPlayer
{
    constructor(pieces_length:number,piece_value_offset:number)
    {
        super(pieces_length,piece_value_offset);
    }
}

class BotPlayer extends Player implements IPlayer
{
    constructor(pieces_length:number,piece_value_offset:number)
    {
        super(pieces_length,piece_value_offset);
    }
}

//#endregion

//#region GAME
interface IGame
{
    Update(delta:number) : void;
    PlayerAction(action:number) : void;
    GetPlayer(id:Players) : IPlayer;
    GetOtherPlayer(id:Players) : IPlayer;
}
abstract class Game
{
    public board:number[][];
    public difficulty:Difficulties;
    constructor(difficulty:Difficulties,x:number,y:number)
    {
        this.difficulty = difficulty;
        if (canvas_manager) {
            canvas_manager.SetBoardDimensions(x,y);
            canvas_manager.ClearCanvas();
            canvas_manager.DrawBoard();
        } else
            throw Error("canvas_manager is not initialized!");
        ((x:number,y:number) : void =>
        {
            if (x <= 0 || y <= 0)
                throw Error("Board dimensions must be greater than zero.");
            let _x = 0;
            let _y = 0;
            this.board = [];
            while (_y < y) {
                this.board[_y] = [];
                _x = 0;
                while (_x < x) {
                    this.board[_y].push(0);
                    _x++;
                }
                _y++;
            }
        })(x,y);
    }

    public Update(delta:number) : void 
    {
        throw Error('Update Function not implemented in Game inheritor.')
        return;
    }

    public GetTile(x:number,y:number) : number
    {
        return this.board[y][x];
    }

    public GetPlayer(id:Players) : IPlayer
    {
        throw Error("Get player not implemented.");
        return null;
    }

    public GetOtherPlayer(id:Players) : IPlayer
    {
        throw Error("Get player not implemented.");
        return null;
    }

    public CheckPositionBounds(x:number,y:number) : boolean
    {
        if (
            x < 0 || x > this.board.length ||
            y < 0 || y > this.board[0].length
            )
            return false;
        return true;
    }

    public PlayerMove(dir:Directions,id:Players) : void
    {
        if (dir == Directions.up)
            return this.HandleMove(0,-1,id);
        else if (dir == Directions.right)
            return this.HandleMove(1,0,id);
        else if (dir == Directions.down)
            return this.HandleMove(0,1,id);
        else if (dir == Directions.left)
            return this.HandleMove(-1,0,id);
        throw Error("PlayerMove did not catch the direction.");
    }

    private HandleMove(x:number,y:number,id:Players) : void
    {
        let player:IPlayer = this.GetPlayer(id);
        let other_player:IPlayer = this.GetOtherPlayer(id);
        if (!player)
            throw Error('Error player is not defined.');
        let color:Tiles = id == Players.human ? Tiles.blue : Tiles.red;
        let other_color:Tiles = id == Players.human ? Tiles.red : Tiles.blue;
        let i:number = 0,
            l:number = player.pieces_length,
            j:number = 0,
            k:number;
        let start_position:Vector2;
        while (i < l)
        {
            let piece:GamePiece = player.pieces[i++];
            if (piece && piece.active)
            {
                start_position = piece.position.Clone();
                j = 1;
                k = piece.value == 1 ? this.board.length : piece.value;
                while (j <= k)
                {
                    let _x = start_position.x + (x * j);
                    let _y = start_position.y + (y * j);
                    if (this.CheckPositionBounds(_x,_y))
                    {
                        let tile_val:number = this.board[_x][_y];
                        if (tile_val !== Tiles.blue && tile_val !== Tiles.red && tile_val !== Tiles.neutral) {
                            this.board[piece.position.y][piece.position.x] = piece.GetBoardValue();
                            break;
                        }
                        else {
                            if (tile_val == other_color)
                                other_player.AddTiles(-1);
                            player.AddTiles(1);
                            this.board[piece.position.y][piece.position.x] = color;
                            piece.SetPosition(_x,_y);
                        }
                    } 
                    else
                    {
                        this.board[piece.position.y][piece.position.x] = piece.GetBoardValue();
                        break;
                    }
                    j++;
                }
            }
        }
    }
}

class BotGame  extends Game implements IGame
{
    private human:IPlayer;
    private bot:IPlayer;
    private piece_length:number = 5;
    private botTurn:boolean = false;
    constructor(difficulty:Difficulties)
    {
        super(difficulty,9,9);
        if (!this.piece_length || this.piece_length <= 0)
            throw Error("Piece length is not valid");
        this.human = new HumanPlayer(this.piece_length,0);
        this.bot = new BotPlayer(this.piece_length,this.piece_length);
        {
            let piece:GamePiece;
            piece = this.human.pieces[0];
            piece.SetActive(true);
            piece.SetPosition(Math.floor(this.board[0].length / 2),this.board.length - 2);
            piece.SetValue(1);
            this.board[piece.position.y][piece.position.x] = piece.GetBoardValue();
            piece = this.bot.pieces[0];
            piece.SetActive(true);
            piece.SetPosition(Math.ceil(this.board[0].length / 2),2);
            piece.SetValue(1);
            this.board[piece.position.y][piece.position.x] = piece.GetBoardValue();
        }
    }

    GetPlayer(id:Players) : IPlayer
    {
        if (id == Players.bot)
            return this.bot;
        return this.human;
    }

    GetOtherPlayer(id:Players) : IPlayer
    {
        if (id == Players.bot)
            return this.human;
        return this.bot;
    }

    Update(delta:number) : void
    {

    }

    PlayerAction(action:number) : void
    {
        console.log(`Player action: ${action}`);
    }
}

//#endregion

//#endregion

//#region APP_MANAGER
class AppManager
{
    private game_type:Gametypes = Gametypes.bot;
    private difficulty:Difficulties = Difficulties.easy;

    private buttonEasy:HTMLElement;
    private buttonHard:HTMLElement;
    private buttonInsane:HTMLElement;

    constructor()
    {
        this.buttonEasy     = document.getElementById('button-easy');
        this.buttonHard     = document.getElementById('button-hard');
        this.buttonInsane   = document.getElementById('button-insane');
        this.buttonEasy.onclick     = () => this.SetDifficulty(Difficulties.easy);
        this.buttonHard.onclick     = () => this.SetDifficulty(Difficulties.hard);
        this.buttonInsane.onclick   = () => this.SetDifficulty(Difficulties.insane);
    }

    GetGame() : IGame
    {
        if (this.game_type == Gametypes.bot)
            return new BotGame(this.difficulty);
        throw Error("Conditional not catching bot game.");
        return new BotGame(this.difficulty); 
    }

    SetDifficulty(difficulty:Difficulties) : void{
        this.difficulty = difficulty;
    }

    SetGameType(type:Gametypes) : void
    {
        this.game_type = type;
    }

    public Start() : void
    {
        game_manager = new GameManager(this.GetGame());
        game_manager.LogGame();
    }
}
//#endregion
let canvas_manager:CanvasManager = new CanvasManager(1,1);
const app_manager:AppManager = new AppManager();