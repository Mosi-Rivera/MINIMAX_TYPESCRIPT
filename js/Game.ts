const in_development = true;
let game_manager:GameManager;

//#region HELPERS_DEVELOPMENT
function DevelopmentError(str:string) : void {
    if (in_development)
        throw Error(str);
}
//#endregion

//#region HELPERS_EVENTS
class InvokableEvent
{
    public exec:Function;
    public context:Object;
    public parameters:any[];

    constructor(context:Object,exec:Function,parameters:any[] = [])
    {
        this.exec = exec;
        this.context = context;
        this.parameters = parameters;
    }

    public Invoke() : void
    {
        this.exec.apply(this.context,this.parameters);
    }
}
function AddEvent(eventArr:InvokableEvent[],event:InvokableEvent) : number
{
    let i:number = eventArr.length - 1,
            empty:boolean = true;
        while (i >= 0)
        {
            if (empty && eventArr[i])
            {
                if (eventArr[i + 1] === null)
                {
                    eventArr[i] = event;
                    return i + 1;
                }
                empty = false;
                eventArr.length = i + 1;
            }
            else if (!empty && !eventArr[i])
            {
                eventArr[i] = event;
                return i;
            }
            i--;
        }
        eventArr.push(event);
        return eventArr.length - 1;
}
function RemoveEvent(eventArr:InvokableEvent[],id:number,func:Function) : boolean
{
    if (eventArr[id].exec == func)
    {
        eventArr[id] = null;
        return true;
    }
    DevelopmentError("Invalid parameters in remove event function.");
    return false;
}
function HandleEvents(eventArr:InvokableEvent[]) : void
    {
        let i = 0,
            l = eventArr.length;
        while (i < l)
        {
            if (eventArr[i] !== null)
                eventArr[i].Invoke();
            i++
        }
    }
//#endregion

//#region HELPERS_GENERIC
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

function TileColor (tile:Tiles) : string
{
    if (tile == Tiles.blue)
        return 'blue';
    else if (tile == Tiles.red)
        return 'red';
    else if (tile == Tiles.neutral)
        return 'white';
    else if (tile == Tiles.obstacle)
        return 'black';
        DevelopmentError("Invalid tile type.");
;}
//#endregion

//#region CONSTS
const canvasBackground  : HTMLCanvasElement = document.getElementById('canvas-background') as HTMLCanvasElement;
const canvasMidground   : HTMLCanvasElement = document.getElementById('canvas-midground') as HTMLCanvasElement;
const canvasForeground  : HTMLCanvasElement = document.getElementById('canvas-foreground') as HTMLCanvasElement;
const canvasContainer   : HTMLElement = document.getElementById('canvas-container');
const ctxBackground = canvasBackground.getContext('2d');
const ctxMidground  = canvasMidground.getContext('2d');
const ctxForeground = canvasForeground.getContext('2d');

const obstaclePatternY:number[] = [0,2,1];

const enum CanvasEvents
{
    resize = 0,
    draw_board,
    draw
}

const enum CanvasLayers
{
    background = 0,
    midground,
    foreground
}

const enum DrawType
{
    sprite = 0,
    text,
    rect
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
    draw_position:Vector2;
    draw_type:DrawType;
    draw_rect:Vector2;
    draw_text:string;
    draw_sprite:any;
}

class CanvasManager
{
    private scaleX:number;
    private scaleY:number;
    public canvasWidth:number;
    public canvasHeight:number;
    private boardWidth:number;
    private boardHeight:number;
    private gridLineWidth:number;
    private tileWidth:number;
    private tileHeight:number;
    private resizeEvents:InvokableEvent[] = [];
    private drawBoardEvents:InvokableEvent[] = [];
    private drawEvents:InvokableEvent[] = [];
    constructor(scaleX:number,scaleY:number)
    {
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        let throttle = Throttle();
        window.addEventListener('resize',() => throttle.apply(this,[this.Resize,250]));
        this.Resize();
    }

    public AddEvent(event:InvokableEvent,type:CanvasEvents) : number
    {
        return AddEvent(this.GetEventArr(type),event);
    }

    public RemoveEvent(id:number,func:Function,type:CanvasEvents) : boolean
    {
        return RemoveEvent(this.GetEventArr(type),id,func);
    }

    private GetEventArr(type:CanvasEvents) : InvokableEvent[]
    {
        if (type == CanvasEvents.resize)
            return this.resizeEvents;
        else if (type == CanvasEvents.draw_board)
            return this.drawBoardEvents;
        else if (type == CanvasEvents.draw)
            return this.drawEvents;
        DevelopmentError("Invalid CanvasEvent type.");
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
        this.GetCanvasContext(canvas).clearRect(0,0,this.boardWidth,this.boardHeight);
    }

    public GetCanvas(canvas:CanvasLayers) : HTMLCanvasElement
    {
        if (canvas == CanvasLayers.background)
            return canvasBackground;
        else if (canvas == CanvasLayers.midground)
            return canvasMidground;
        else if (canvas == CanvasLayers.foreground)
            return canvasForeground;
        DevelopmentError("Invalid layer.");
        return null;
    }

    public GetCanvasContext(canvas:CanvasLayers) : CanvasRenderingContext2D
    {
        if (canvas == CanvasLayers.background)
            return ctxBackground;
        else if (canvas == CanvasLayers.midground)
            return ctxMidground;
        else if (canvas == CanvasLayers.foreground)
            return ctxForeground;
        DevelopmentError("Invalid layer.");
        return null;
    }

    public Draw(drawable:IDrawable,canvas:CanvasLayers,color:string) : void
    {
        let ctx:CanvasRenderingContext2D = this.GetCanvasContext(canvas);
        let position:Vector2 = drawable.draw_position;
        ctx.fillStyle = color;
        if (drawable.draw_type == DrawType.text)
        {
            ctx.fillText(
                drawable.draw_text,
                ((position.x + 0.5) * this.tileWidth),
                ((position.y + 0.5) * this.tileHeight)
            );
            return;
        } 
        else if (drawable.draw_type == DrawType.rect)
        {
            let size = drawable.draw_rect;
            ctx.fillRect(position.x,position.y,size.x,size.y);
            return;
        }
        else if (drawable.draw_type == DrawType.sprite)
        {
            let size = drawable.draw_rect;
            ctx.drawImage(drawable.draw_sprite,position.x,position.y,size.x,size.y);
            return;
        }
        DevelopmentError("Invalid Draw Type.");
    }

    public DrawTile(x:number,y:number,color:string) : void
    {
        let ctx = this.GetCanvasContext(CanvasLayers.background);
        ctx.fillStyle = color;
        ctx.fillRect(this.tileWidth * x,this.tileHeight * y,this.tileWidth,this.tileHeight);
    }

    public DrawBoard() : void
    {
        let ctx = this.GetCanvasContext(CanvasLayers.midground);
        let i = 0;
        this.tileWidth = this.canvasWidth / this.boardWidth;
        this.tileHeight = this.canvasHeight / this.boardHeight;
        while (i < this.boardWidth)
        {
            ctx.moveTo(i * this.tileWidth,0);
            ctx.lineTo(i++ * this.tileWidth,this.canvasHeight);
        }
        i = 0;
        while (i < this.boardHeight)
        {
            ctx.moveTo(0,i * this.tileHeight);
            ctx.lineTo(this.canvasWidth,i++ * this.tileHeight);
        }
        ctx.strokeStyle = 'black';
        ctx.lineWidth = this.gridLineWidth;
        ctx.stroke();
    }

    public SetBoardDimensions(board_size) : void
    {
        this.boardWidth = board_size;
        this.boardHeight = board_size;
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
        this.gridLineWidth      = this.canvasWidth * 0.005;
        this.DrawBoard();
        ctxForeground.font = `${(this.tileHeight * 0.8)}px sans-serif`;
        ctxForeground.textAlign = 'center';
        ctxForeground.textBaseline = 'middle';
        HandleEvents(this.resizeEvents);
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
    direction:Directions;
    SetPosition(x:number,y:number) : void;
    SetActive(b:boolean) : void;
    SetValue(n:number) : void;
    GetBoardValue() : number;
    SetDirection(direction:Directions);
}

class GamePiece implements IGamePiece, IDrawable
{
    public direction        :Directions = Directions.up;
    public position         : Vector2 = new Vector2();
    public last_position    : Vector2 = new Vector2();
    public draw_position    : Vector2 = new Vector2();
    public draw_rect        : Vector2 = new Vector2();
    public draw_text        : string;
    public draw_color       : string;
    public draw_type        : DrawType = DrawType.text;
    public draw_sprite      : any;
    public value            : number  = null;
    public active           : boolean = false;
    public lerpTimer        : number  = 0;
    public piece_value_offset:number;
    
    constructor(active:boolean,piece_value_offset:number) 
    {
        this.active = active;
        this.piece_value_offset = piece_value_offset;
    }

    SetDirection(direction:Directions)
    {
        this.direction = direction;
    }

    GetBoardValue() : number
    {
        return this.value + this.piece_value_offset;
    }

    SetInitialPosition(x:number,y:number)
    {
        this.last_position.x = this.position.x;
        this.last_position.y = this.position.y;
        this.position.x = x;
        this.position.y = y;
        this.draw_position.x = x;
        this.draw_position.y = y;
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
        this.draw_text = n.toString();
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
    private tiles_arr:Vector2[];

    constructor(pieces_length:number,piece_value_offset:number)
    {
        super(pieces_length,piece_value_offset);
    }

    public AddTiles(n:number,x:number = null,y:number = null) : void
    {
        this.tiles += n;
        if (n !== null && y != null)
        {
            if (n < 0)
                this.tiles_arr = this.tiles_arr.filter(vector2 => !(vector2.x == x && vector2.y == y));
            else
                this.tiles_arr.push(new Vector2(x,y));
        }
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
    public piece_length:number;
    constructor(difficulty:Difficulties,board_size:number)
    {
        if (board_size < 6 || board_size % 3 != 0)
            DevelopmentError("Invalid board size");
        this.difficulty = difficulty;
        ((board_size:number) : void =>
        {
            let _x = 0;
            let _y = 0;
            this.board = [];
            while (_y < board_size) {
                this.board[_y] = [];
                _x = 0;
                while (_x < board_size) {
                    this.board[_y].push(0);
                    _x++;
                }
                _y++;
            }
        })(board_size);
    }

    public Update(delta:number) : void 
    {
        DevelopmentError('Update Function not implemented in Game inheritor.')
        return;
    }

    public DrawPieces() : void
    {
        DevelopmentError('DrawPieces function not implemented in Game inheritor.');
        return;
    }

    public DrawTiles () : void
    {
        let x = 0,
            y = 0,
            lx = this.board[0].length,
            ly = this.board.length;
        while (y < ly)
        {
            x = 0;
            while (x < lx)
            {
                let tile = this.board[y][x];
                if (tile > 0)
                    tile = tile > this.piece_length ? Tiles.red : Tiles.blue;
                canvas_manager.DrawTile(x,y,TileColor(tile));
                x++;
            }
            y++;
        }
    }

    public GetTile(x:number,y:number) : number
    {
        return this.board[y][x];
    }

    public GetPlayer(id:Players) : IPlayer
    {
        DevelopmentError("Get player not implemented.");
        return null;
    }

    public GetOtherPlayer(id:Players) : IPlayer
    {
        DevelopmentError("Get player not implemented.");
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

    public RoundEndAttack() : void
    {

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
        DevelopmentError("PlayerMove did not catch the direction.");
    }

    private HandleMove(x:number,y:number,id:Players) : void
    {
        let player:IPlayer = this.GetPlayer(id);
        let other_player:IPlayer = this.GetOtherPlayer(id);
        if (!player)
            DevelopmentError('Error player is not defined.');
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
                        let tile_val:number = this.board[_y][_x];
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
    private bot:BotPlayer;
    private botTurn:boolean = false;
    private draw_tiles_event_id:number;
    private draw_pieces_event_id:number;
    constructor(difficulty:Difficulties)
    {
        super(difficulty,12);
        this.piece_length = 5;
        if (!this.piece_length || this.piece_length <= 0)
            DevelopmentError("Piece length is not valid");
        this.human = new HumanPlayer(this.piece_length,0);
        this.bot = new BotPlayer(this.piece_length,this.piece_length);
        {
            //Set Initial Positions
            let piece:GamePiece;
            let width_is_even:boolean = this.board[0].length % 2 == 0;
            let yDif = Math.ceil((this.board.length / 3) / 2);
            let _x,_y;
            piece = this.human.pieces[0];
            piece.SetDirection(Directions.down);
            piece.SetActive(true);
            piece.SetInitialPosition(Math.floor(this.board[0].length / 2) - 1, this.board.length - yDif);
            piece.SetValue(1);
            this.board[piece.position.y][piece.position.x] = piece.GetBoardValue();
            piece = this.bot.pieces[0];
            _x = Math.floor(this.board[0].length / 2) + (width_is_even ? 0 : 1);
            _y = yDif - 1;
            piece.SetDirection(Directions.up);
            piece.SetActive(true);
            piece.SetInitialPosition(_x, _y);
            piece.SetValue(1);
            this.board[piece.position.y][piece.position.x] = piece.GetBoardValue();
            this.bot.AddTiles(0,_x,_y);
        }
        {
            //Generate Obstacles
            let i:number = 0,
                j:number,
                l:number = this.board.length/3,
                posX:number,
                posY:number;
            while (i < l)
            {
                j = 0;
                while (j < l)
                {
                    posX = (j * 3) + Math.floor(Math.random() * 3);
                    posY = (i * 3) + obstaclePatternY[j % 3];
                    if (this.board[posY][posX] > 0)
                        posX > 0 ? posX-- : posX++;
                    this.board[posY][posX] = Tiles.obstacle;
                    j++;
                }
                i++;
            }
        }
        if (canvas_manager) {
            canvas_manager.SetBoardDimensions(this.board.length);
            canvas_manager.ClearCanvas();
            canvas_manager.DrawBoard();
            this.DrawTiles();
            this.DrawPieces();
            this.draw_tiles_event_id = canvas_manager.AddEvent(
                new InvokableEvent(this,this.DrawTiles),
                CanvasEvents.resize
            );
            this.draw_pieces_event_id = canvas_manager.AddEvent(
                new InvokableEvent(this,this.DrawPieces),
                CanvasEvents.resize    
            );
        }
        else
            DevelopmentError("canvas_manager is not initialized!");
    }

    DrawPieces()
    {
        let i:number = 0,
            l:number = this.piece_length;
        while (i < l)
        {
            let piece:GamePiece = this.human.pieces[i++];
            if (piece && piece.active)
                canvas_manager.Draw(piece,CanvasLayers.foreground,'white');
        }
        i = 0;
        while (i < l)
        {
            let piece:GamePiece = this.bot.pieces[i++];
            if (piece && piece.active)
                canvas_manager.Draw(piece,CanvasLayers.foreground,'black');
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
        DevelopmentError("Conditional not catching bot game.");
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