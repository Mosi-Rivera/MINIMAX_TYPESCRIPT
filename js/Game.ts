const in_development = false;
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
    public exec:() => void|boolean;
    private context:Object;
    private parameters:any[];
    private repeat:number;
    constructor(context:Object,exec:() => void|boolean,repeat:number = 0,parameters:any[] = [])
    {
        this.exec = exec;
        this.context = context;
        this.parameters = parameters;
        this.repeat = repeat;
    }

    public Invoke() : InvokableEvent | null
    {
        this.exec.apply(this.context,this.parameters);
        if (this.repeat-- == 0)
            return null;
        return this;
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
function RemoveEvent(eventArr:InvokableEvent[],id:number,func:() => void|boolean) : boolean
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
                eventArr[i] = eventArr[i].Invoke();
            i++
        }
    }
//#endregion

//#region HELPERS_GENERIC
function Throttle () : (func:() => void, delay:number) => void
{
	let to:any = true;
	return function (func:() => void, delay:number) : void
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

//#region CONSTS
//CANVAS
const canvasBackground      : HTMLCanvasElement = document.getElementById('canvas-background') as HTMLCanvasElement;
const canvasMidground       : HTMLCanvasElement = document.getElementById('canvas-midground') as HTMLCanvasElement;
const canvasForeground      : HTMLCanvasElement = document.getElementById('canvas-foreground') as HTMLCanvasElement;
const canvasContainer       : HTMLElement = document.getElementById('canvas-container');
const ctxBackground         : CanvasRenderingContext2D = canvasBackground.getContext('2d');
const ctxMidground          : CanvasRenderingContext2D = canvasMidground.getContext('2d');
const ctxForeground         : CanvasRenderingContext2D = canvasForeground.getContext('2d');

//BUTTONS
const inputContainer        : HTMLElement = document.getElementById('input-container');
const buttonInputUp         : HTMLElement = document.getElementById('input-up');
const buttonInputDown       : HTMLElement = document.getElementById('input-down');
const buttonInputLeft       : HTMLElement = document.getElementById('input-left');
const buttonInputRight      : HTMLElement = document.getElementById('input-right');

const humanDeployContainer  : HTMLElement = document.getElementById('human-deploy-container');
const botDeployContainer    : HTMLElement = document.getElementById('bot-deploy-container');

//UI
const colorBarContainer     : HTMLElement = document.getElementById('color-bar-container');
const colorBarSliderHuman   : HTMLElement = document.getElementById('color-bar-slider-human');
const colorBarSliderBot     : HTMLElement = document.getElementById('color-bar-slider-bot');
const gameOverScreen        : HTMLElement = document.getElementById('game-over-screen');

const obstaclePatternY:number[] = [0,2,1];

const enum GamePieceEvent
{
    combat_end = 0,
    turn_start,
    turn_end,
    round_start,
    round_end,
    on_leave,
    on_enter
}

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
    rect,
    game_piece
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

const directions_multipliers:{[key:string]: Vector2} = {
    [Directions.up]     : new Vector2(0,-1),
    [Directions.right]  : new Vector2(1,0),
    [Directions.down]   : new Vector2(0,1),
    [Directions.left]   : new Vector2(-1,0)
};

const enum Difficulties
{
    easy = 1,
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
    private removeResizeListener:() => void;
    private addResizeListener:() => void;
    constructor(scaleX:number,scaleY:number)
    {
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        let throttle = Throttle();
        let resize = () => throttle.apply(this,[this.Resize,250]);
        this.addResizeListener = () : void =>
            window.addEventListener("resize",resize);
        this.removeResizeListener = () : void => 
            window.removeEventListener('resize',resize);
        this.addResizeListener();
        this.Resize();
    }

    public CanvasToBoardPosition(x:number,y:number) : Vector2
    {
        let _x:number = Math.floor(x / this.tileWidth);
        let _y:number = Math.floor(y / this.tileHeight);
        return new Vector2(_x,_y);
    }

    public Reset() : void
    {
        this.drawEvents.length = 0;
        this.resizeEvents.length = 0;
        this.drawBoardEvents.length = 0;
        this.ClearCanvas();
        this.removeResizeListener();
    }

    public AddEvent(event:InvokableEvent,type:CanvasEvents) : number
    {
        return AddEvent(this.GetEventArr(type),event);
    }

    public RemoveEvent(id:number,func:() => void|boolean,type:CanvasEvents) : boolean
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
            ctxBackground.clearRect(0,0,this.canvasWidth,this.canvasHeight);
            ctxMidground.clearRect(0,0,this.canvasWidth,this.canvasHeight);
            ctxForeground.clearRect(0,0,this.canvasWidth,this.canvasHeight);
            return;
        }
        this.GetCanvasContext(canvas).clearRect(0,0,this.canvasWidth,this.canvasHeight);
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
        if (drawable.draw_type == DrawType.game_piece)
        {
            let piece = drawable as GamePiece;
            let dir_mult = directions_multipliers[piece.direction];
            ctx.fillText(
                piece.draw_text,
                (position.x + 0.5) * this.tileWidth,
                (position.y + 0.5) * this.tileHeight
            );
            ctx.fillStyle = 'yellow';
            ctx.fillRect(
                (position.x * this.tileWidth) + (dir_mult.x == 1 ? (this.tileWidth * 0.9) : 0  + this.gridLineWidth/2),
                (position.y * this.tileHeight) + (dir_mult.y == 1 ? (this.tileHeight * 0.9) : 0  + this.gridLineWidth/2),
                dir_mult.x == 0 ? this.tileWidth  - (this.gridLineWidth) : (this.tileWidth * 0.1),
                dir_mult.y == 0 ? this.tileHeight  - (this.gridLineWidth) : this.tileHeight * 0.1
            );
            return;
        }
        else if (drawable.draw_type == DrawType.text)
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
        buttonInputUp.onclick       = () => this.MoveInput(Directions.up);
        buttonInputDown.onclick     = () => this.MoveInput(Directions.down);
        buttonInputLeft.onclick     = () => this.MoveInput(Directions.left);
        buttonInputRight.onclick    = () => this.MoveInput(Directions.right);
    }

    public Destroy() : void
    {
        buttonInputUp.onclick       = null;
        buttonInputDown.onclick     = null;
        buttonInputRight.onclick    = null;
        buttonInputLeft.onclick     = null;
        this.game.Destroy();
    }

    public MoveInput(direction:Directions) : void
    {
        this.game.PlayerInputMove(direction,Players.human);
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
    cooldown:number;
    SetPosition(x:number,y:number) : void;
    SetActive(b:boolean) : void;
    SetValue(n:number) : void;
    GetBoardValue() : number;
    SetDirection(direction:Directions);
}

class GamePiece implements IGamePiece, IDrawable
{
    public direction            : Directions = Directions.up;
    public position             : Vector2 = new Vector2();
    public last_position        : Vector2 = new Vector2();
    public draw_position        : Vector2 = new Vector2();
    public draw_rect            : Vector2 = new Vector2();
    public element              : HTMLElement;
    public draw_text            : string;
    public draw_color           : string;
    public draw_type            : DrawType = DrawType.game_piece;
    public draw_sprite          : any;
    public value                : number  = null;
    public active               : boolean = false;
    public lerpTimer            : number  = 0;
    public piece_value_offset   : number;
    public cooldown             : number;
    private base_cooldown        : number;
    
    constructor(active:boolean,piece_value_offset:number,value:number) 
    {
        this.active = active;
        this.piece_value_offset = piece_value_offset;
        this.value = value;
        this.draw_text = value.toString();
        this.cooldown = value * 2;
        this.base_cooldown = this.cooldown;
    }

    TurnEnd() : void
    {
        this.cooldown--;
        if (this.cooldown < 0) 
            (this.element.children[1] as HTMLElement).innerHTML = '';
        else
            this.element.children[1].innerHTML = this.cooldown.toString();
        if (this.active || this.cooldown > 0) 
        {
            this.element.style.backgroundColor = 'black';
            (this.element.children[0] as HTMLElement).style.color = '#464646';
            (this.element.children[1] as HTMLElement).style.color = '#464646';
        }
        else 
        {
            this.element.style.backgroundColor = this.piece_value_offset > 0 ? 'red' : 'blue';
            (this.element.children[0] as HTMLElement).style.color = 'white';
            (this.element.children[1] as HTMLElement).style.color = 'white';
        }
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
        this.draw_position.x = x;
        this.draw_position.y = y;
        this.position.x = x;
        this.position.y = y;
    }

    SetDrawPosition(x:number,y:number)
    {
        this.draw_position.x = x;
        this.draw_position.y = y;
    }

    SetActive(b:boolean)
    {
        this.active = b;
        if (!b)
        {
            this.cooldown = this.base_cooldown;
        }
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
    AddTiles(n:number,x:number,y:number) : void;
    tiles:number;
    pieces_length:number;
    pieces:GamePiece[];
    piece_value_offset:number;
    TurnEnd():void;
    color:Tiles;
}

abstract class Player {
    public tiles:number = 1;
    public pieces_length:number = null;
    public pieces:GamePiece[];
    public piece_value_offset:number;
    public color:Tiles;
    constructor(pieces_length:number,piece_value_offset:number)
    {
        this.piece_value_offset = piece_value_offset;
        this.pieces_length = pieces_length;
        (
            (l:number) =>
            {
                this.pieces = [];
                while (l > 0) {
                    this.pieces.push(new GamePiece(false,piece_value_offset,(pieces_length - l--) + 1));
                }
            }
        )(pieces_length);
    }

    public TurnEnd ()
    {
        let i = 0,
            l = this.pieces.length;
        while (i < l)
            this.pieces[i++].TurnEnd();
    }

    public AddTiles(n:number,x:number = null,y:number = null) : void
    {
        this.tiles += n;
    }
}

class HumanPlayer extends Player implements IPlayer
{
    constructor(pieces_length:number,piece_value_offset:number)
    {
        super(pieces_length,piece_value_offset);
        this.color = Tiles.blue;
    }
}

class BotPlayer extends Player implements IPlayer
{
    public tiles_arr:Vector2[] = [];

    constructor(pieces_length:number,piece_value_offset:number)
    {
        super(pieces_length,piece_value_offset);
        this.color = Tiles.red;
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

//#region MINIMAX
function GAMESTATE_EVALUATOR(board:number[][],pieces_length:number) : number
{
    let player_score:number = 0;
    let other_score:number = 0;
    let player_pieces:number = 0;
    let other_pieces:number = 0;
    let x:number = 0,
        y:number = 0,
        l:number = board.length;
    let tile:Tiles;
    let sub_value:number;
    while (y < l)
    {
        x = 0;
        while (x < l)
        {
            tile = board[y][x];
            if (tile > 0)
            {
                if (tile <= pieces_length) 
                {
                    if (tile == 1)
                        other_score += board.length;
                    else
                        other_score += tile * 2;
                    other_pieces++;
                } else {
                    let value = tile - pieces_length;
                    if (value == 1)
                        player_score += board.length;
                    else
                        player_score += value * 2;
                    player_pieces++;
                }
            }
            else if (tile == Tiles.red)
                player_score++;
            else if (tile == Tiles.blue)
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
class BotGameCopy
{
    board:number[][];
    piece_length:number;
    human:PlayerCopy;
    bot:PlayerCopy;
    constructor(game:BotGame | BotGameCopy) {
        this.board = BoardCopy(game.board);
        this.piece_length = game.piece_length;
        this.bot = new PlayerCopy(game.bot);
        this.human = new PlayerCopy(game.human);
    }
}
class PlayerCopy
{
    pieces_length:number;
    piece_value_offset:number;
    pieces:GamePieceCopy[];
    tiles:number;
    color:Tiles;
    constructor(player:IPlayer | PlayerCopy)
    {
        this.color = player.color;
        this.tiles = player.tiles;
        this.piece_value_offset = player.piece_value_offset;
        this.pieces_length = player.pieces_length;
        let i = 0,
            l = player.pieces.length;
        this.pieces = [];
        this.pieces.length = l;
        while (i < l) {
            this.pieces[i] = new GamePieceCopy(player.pieces[i]);
            i++;
        }
    }
    AddTiles(n:number,x:number,y:number)
    {
        this.tiles += n;
    }
}
class GamePieceCopy
{
    direction:Directions;
    position:Vector2;
    active:boolean;
    value:number;
    board_value:number;
    piece_value_offset:number;
    constructor(piece:GamePiece | GamePieceCopy)
    {
        this.position = new Vector2(piece.position.x,piece.position.y);
        this.active = piece.active;
        this.value = piece.value;
        this.piece_value_offset = piece.piece_value_offset;
        this.board_value = piece.piece_value_offset + piece.value;
    }
    SetActive(b:boolean) : void
    {
        this.active = b;
    }
    SetPosition(x:number,y:number) : void
    {
        this.position.x = x;
        this.position.y = y;
    }
    GetBoardValue() : number
    {
        return this.board_value;
    }
}
function BoardCopy(board:number[][]) : number[][]
{
    let x:number = 0,
        y:number = 0,
        l = board.length;
    let result = [];
    result.length = l;
    while(y < l) {
        result[y] = [];
        x = 0;
        while (x < l)
        {
            result[y][x] = board[y][x];
            x++;
        }
        y++;
    }
    return result;
}
function MINIMAX(depth:number,game:BotGameCopy,max:boolean = false) : number
{
    let score:number = GAMESTATE_EVALUATOR(game.board,game.piece_length);
    let game_copy:BotGameCopy;
    if (score == 1000)
        return score;
    if (score == -1000)
        return score;
    if (depth <= 0)
        return score;
    
    let i:number = 0,
        l:number = 4;
    if (max)
    {
        while (i < l)
        {
            game_copy = new BotGameCopy(game);
            Game.PlayerMove(i++,game_copy.board,game_copy.piece_length,game_copy.bot,game_copy.human);
            score = Math.max(score,MINIMAX(depth - 1,game_copy,!max));
        }
    }
    else
    {
        while (i < l)
        {
            game_copy = new BotGameCopy(game);
            Game.PlayerMove(i++,game_copy.board,game_copy.piece_length,game_copy.human,game_copy.bot);
            score = Math.min(score,MINIMAX(depth - 1,game_copy,!max));
        }
    }
    return score;
}
function BOT_MOVE (depth:number,game:BotGame)
{
    let bot:BotPlayer = game.bot;
    let pieces:GamePiece[] = bot.pieces;
    let game_copy:BotGameCopy = new BotGameCopy(game);
    let i:number = 0,
        l:number = pieces.length;
    let score:number = -1000;// GAMESTATE_EVALUATOR(game_copy.board,game_copy.bot);
    let result:Directions = Directions.down;
    let new_score:number;
    let summon_piece_index:number = null;
    let summon_piece_score:number = score;
    let summon_piece_position:Vector2 = null;
    while (i < l)
    {
        let piece:GamePiece = pieces[i];
        if (piece && !piece.active && piece.cooldown <= 0)
        {
            summon_piece_index = i;
            break;
        }
        i++;
    }
    console.log(summon_piece_index,"summon_piece_index");
    if (summon_piece_index !== null)
    {
        i = 0;
        l = bot.tiles_arr.length;
        while (i < l)
        {
            let tile:Vector2  = bot.tiles_arr[i++];
            let temp = game_copy.board[tile.y][tile.x];
            game_copy.board[tile.y][tile.x] = pieces[summon_piece_index].GetBoardValue();
            new_score = MINIMAX(depth - 1,game_copy);
            if (new_score > summon_piece_score)
            {
                summon_piece_position = tile.Clone();
                summon_piece_score = new_score;
            }
            game_copy.board[tile.y][tile.x] = temp;
        }
    }
    i = 0;
    l = 4;
    while (i < l)
    {
        game_copy = new BotGameCopy(game);
        Game.PlayerMove(
            i,
            game_copy.board,
            game_copy.piece_length,
            game_copy.bot,
            game_copy.human
        );
        new_score = MINIMAX(depth - 1,game_copy);
        if (new_score > score)
        {
            result = i;
            score = new_score;
        }
        i++;
    }
    if (summon_piece_index !== null)
    {
        if (summon_piece_score > score)
        {
            game.PlayerDeploy(Players.bot,summon_piece_position.x,summon_piece_position.y,summon_piece_index);
            return;
        }
    }
    Game.PlayerMove(result,game.board,game.piece_length,game.bot,game.human);
    game.TurnEnd();
}
//#endregion

//#region GAME
interface IGame
{
    Update(delta:number) : void;
    GetPlayer(id:Players) : IPlayer;
    GetOtherPlayer(id:Players) : IPlayer;
    PlayerInputMove(direction:Directions,id:Players):void
    Destroy():void;
    turn_player:number;
    piece_length:number;
    board:number[][];
}

abstract class Game
{
    public board:number[][];
    public summon_index:number = null;
    public difficulty:Difficulties;
    public piece_length:number;
    public turn_counter:number = 1;
    public turn_player:Players = Players.human;
    public deploying:boolean = false;
    public deploy_counter:number = 0;
    public min_tiles_to_win:number;

    constructor(difficulty:Difficulties,board_size:number)
    {
        if (board_size < 6 || board_size % 3 != 0)
            DevelopmentError("Invalid board size");
        {
            let board_size_squared = Math.pow(board_size,2)
            this.min_tiles_to_win =  (board_size_squared - (board_size_squared / 9)) * 0.7;
        }
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
        inputContainer.onclick = (e) => {
            if (this.summon_index !== null)
            {
                let _position:Vector2 = canvas_manager.CanvasToBoardPosition(e.offsetX,e.offsetY);
                console.log(_position,e.offsetX,e.offsetY);
                if (Game.CheckPositionBounds(this.board,_position.x,_position.y))
                {
                    this.PlayerDeploy(Players.human,_position.x,_position.y,this.summon_index);
                    let player = this.GetPlayer(Players.human);
                    let i = 0,
                        l = this.piece_length;
                    while (i < l)
                        player.pieces[i++].element.classList.remove('selected');
                    inputContainer.classList.remove('deploying'); 
                }
            }
        }
    }

    public Destroy() : void
    {
        canvas_manager.Reset();
        inputContainer.onclick = null;
        inputContainer.classList.remove('deploying');
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

    public static CheckPositionBounds(board:number[][],x:number,y:number) : boolean
    {
        if (
            x < 0 || x >= board.length ||
            y < 0 || y >= board.length
            )
            return false;
        return true;
    }

    public PassTurn() : void
    {
        DevelopmentError("PassTurn function not implemented in Game inheritor.");
    }

    public SetColorBar(sum_bot:number,sum_human:number) : void
    {
        colorBarSliderHuman.style.height    = `${(sum_human/this.min_tiles_to_win) * 100}%`
        colorBarSliderBot.style.height      = `${(sum_bot/this.min_tiles_to_win) * 100}%`;
    }

    public IsGameOver() : boolean
    {
        let result:boolean = false;
        let bot:IPlayer = this.GetPlayer(Players.bot);
        let human:IPlayer = this.GetPlayer(Players.human);
        let bot_tiles:number = 0;
        let human_tiles:number = 0;
        let bot_pieces:number = 0;
        let human_pieces:number = 0;
        let y = 0,
            i = 0,
            x = 0,
            l = this.board.length;
        while (y < l)
        {
            x = 0;
            while (x < l)
            {
                let tile = this.board[y][x];
                if (tile == Tiles.red)
                    bot_tiles++;
                else if (tile == Tiles.blue)
                    human_tiles++;
                x++;
            }
            y++;
        }
        if (this.turn_player == Players.bot ? (bot_tiles > this.min_tiles_to_win) : (human_tiles > this.min_tiles_to_win))
            result =  true;
        i = 0,
        l = this.piece_length;
        while (i < l)
        {
            if (bot.pieces[i].active)
                bot_pieces++;
            if (human.pieces[i].active)
                human_pieces++;
            i++;
        }
        if (this.turn_player == Players.bot ? (human_pieces == 0) : (bot_pieces == 0))
            result =  true;
        this.SetColorBar(bot_pieces + bot_tiles,human_pieces + human_tiles);
        return result;
    }

    public HandleGameOver() : void
    {
        canvas_manager.ClearCanvas(CanvasLayers.foreground);
        this.DrawTiles();
        this.DrawPieces();
        gameOverScreen.style.display = 'flex';
        gameOverScreen.children[0].innerHTML = this.turn_player == Players.bot ? 'YOU LOSE.' : 'YOU WIN!';
        this.turn_player = -1;
    }

    public TurnEnd() : void
    {
        if (this.IsGameOver()) {
            this.HandleGameOver();
            return;
        }
        this.turn_counter++;
        this.PassTurn();
        if (this.turn_player == Players.bot)
            inputContainer.classList.add('hide');
        else
            inputContainer.classList.remove('hide');
        canvas_manager.ClearCanvas(CanvasLayers.foreground);
        this.DrawTiles();
        this.DrawPieces();
    }

    public ResetTurnCounter() : void
    {
        this.turn_counter = 1;
    }

    public PlayerInputMove(direction:Directions,id:Players) : void {
        if (this.deploying)
            return console.log("Deployment phase in progress.");
        if (this.turn_player != id)
            return console.log('Not turn player!');
        Game.PlayerMove(
            direction,
            this.board,
            this.piece_length,
            this.GetPlayer(id),
            this.GetOtherPlayer(id)
        );
        this.TurnEnd();
    }

    public PlayerDeploy(id:Players,x:number,y:number,piece_index:number)
    {
        if (this.turn_player != id)
            return console.log("Not turn player");
        let player = this.GetPlayer(id);
        if (this.board[y][x] !== player.color)
            return DevelopmentError("Invalid deploy position!");
        let piece = player.pieces[piece_index];
        if (!piece || piece.active) 
            return DevelopmentError("Invalid piece index");
        piece.SetActive(true);
        piece.SetPosition(x,y);
        this.board[y][x] = piece.GetBoardValue();
        this.TurnEnd();
    }

    public static PlayerMove(direction:Directions,board:number[][],piece_length:number,player:IPlayer | PlayerCopy,other_player:IPlayer | PlayerCopy) : void
    {
        let x = directions_multipliers[direction].x;
        let y = directions_multipliers[direction].y;
        let color:Tiles = player.color;
        let other_color:Tiles = other_player.color;
        let i:number = 0,
            l:number = player.pieces.length,
            j:number,
            k:number;
        let start_position:Vector2;
        let enemy_range_min:number = other_player.piece_value_offset;
        let enemy_range_max:number = enemy_range_min + piece_length;
        while (i < l)
        {
            let piece:GamePiece | GamePieceCopy = player.pieces[i++];
            piece.direction = direction;
            if (piece.active)
            {
                start_position = piece.position.Clone();
                j = 1;
                k = piece.value == 1 ? board.length : piece.value;
                while (j <= k)
                {
                    let _x = start_position.x + (x * j);
                    let _y = start_position.y + (y * j);
                    if (Game.CheckPositionBounds(board,_x,_y))
                    {
                        let tile_val:number = board[_y][_x];
                        if (tile_val > 0)
                        {
                            if (piece.value !== 1)
                            {
                                if (tile_val > enemy_range_min && tile_val <= enemy_range_max)
                                {
                                    if (tile_val - enemy_range_min <= piece.value)
                                    {
                                        other_player.pieces[tile_val - enemy_range_min - 1].SetActive(false);
                                        other_player.AddTiles(-1,_x,_y);
                                        player.AddTiles(1,_x,_y);
                                        board[piece.position.y][piece.position.x] = color;
                                        piece.SetPosition(_x,_y);
                                        board[piece.position.y][piece.position.x] = piece.GetBoardValue();
                                    }
                                }
                            }
                            break;
                        }
                        else if (tile_val !== Tiles.obstacle) {
                            if (tile_val === other_color)
                                other_player.AddTiles(-1,_x,_y);
                            player.AddTiles(1,_x,_y);
                            board[piece.position.y][piece.position.x] = color;
                            piece.SetPosition(_x,_y);
                            board[piece.position.y][piece.position.x] = piece.GetBoardValue();
                        } else
                            break;
                    } else
                        break;
                    j++;
                }
            }
        }
    }
}

class BotGame  extends Game implements IGame
{
    public human:IPlayer;
    public bot:BotPlayer;
    private botTurn:boolean = false;
    private draw_tiles_event_id:number;
    private draw_pieces_event_id:number;
    constructor(difficulty:Difficulties)
    {
        super(difficulty,9); //This is a mess but I dont want to clean it up :(
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
            this.board[piece.position.y][piece.position.x] = piece.GetBoardValue();
            piece = this.bot.pieces[0];
            _x = Math.floor(this.board[0].length / 2) + (width_is_even ? 0 : 1);
            _y = yDif - 1;
            piece.SetDirection(Directions.up);
            piece.SetActive(true);
            piece.SetInitialPosition(_x, _y);
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
        {
            let i = 0,
                j = 0,
                l = this.piece_length;
            let container:HTMLElement = humanDeployContainer;
            let player:IPlayer = this.human;
            while (i++ < 2)
            {
                j = 0;
                while (j < l) //human
                {
                    let piece = player.pieces[j];
                    let elem:HTMLElement = document.createElement('div');
                    elem.appendChild(document.createElement('span'));
                    elem.appendChild(document.createElement('span'));
                    elem.children[0].innerHTML = piece.draw_text;
                    elem.children[1].innerHTML =  piece.cooldown <= 0 ? '' : piece.cooldown.toString();
                    elem.style.backgroundColor = 'black';
                    (elem.children[0] as HTMLElement).style.color = '#464646';
                    (elem.children[1] as HTMLElement).style.color = '#464646';
                    container.appendChild(elem);
                    elem.style.width = (100 / this.piece_length) + '%';
                    piece.element = elem;
                    if (i == 1)
                        elem.onclick = () => {
                            let index:number = piece.value - 1;
                            if (this.summon_index == index) {
                                this.summon_index = null;
                                elem.classList.remove('selected');
                                inputContainer.classList.remove('deploying');
                                return;
                            }
                            if (!piece.active && piece.cooldown <= 0)
                            {
                                this.summon_index = index;
                                let i = 0,
                                    l = this.piece_length;
                                while (i < l)
                                    this.human.pieces[i++].element.classList.remove('selected');
                                elem.classList.add('selected');
                                inputContainer.classList.add('deploying');
                            }
                        };
                    j++;
                }
                container = botDeployContainer;
                player = this.bot;
            }
        }
        if (canvas_manager) {
            canvas_manager.SetBoardDimensions(this.board.length);
            canvas_manager.ClearCanvas();
            canvas_manager.DrawBoard();
            this.DrawTiles();
            this.DrawPieces();
            canvas_manager.AddEvent(
                new InvokableEvent(this,this.DrawTiles,-1),
                CanvasEvents.resize
            );
            canvas_manager.AddEvent(
                new InvokableEvent(this,this.DrawPieces,-1),
                CanvasEvents.resize    
            );
        }
        else
            DevelopmentError("canvas_manager is not initialized!");
    }

    PassTurn() : void
    {
        if (this.turn_player === Players.bot)
        {
            this.bot.TurnEnd();
            this.turn_player = Players.human;
        }
        else {
            this.human.TurnEnd();
            this.turn_player = Players.bot;
            setTimeout(() => {
                BOT_MOVE((this.difficulty + 1) * 2,this);
            }, 1500);
        }
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
        if (id === Players.bot)
            return this.bot;
        return this.human;
    }

    GetOtherPlayer(id:Players) : IPlayer
    {
        if (id === Players.bot)
            return this.human;
        return this.bot;
    }

    Update(delta:number) : void //I was going to animate the board but I have cooler shit to do.
    {}
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
    private buttonGameStart:HTMLElement;
    private screenMenu:HTMLElement;
    private screenGame:HTMLElement;
    private gameOverScreen:HTMLElement;

    constructor()
    {
        this.gameOverScreen = gameOverScreen;
        gameOverScreen.onclick = () => {
            this.screenMenu.style.display = 'flex';
            gameOverScreen.style.display = 'none';
        }
        this.screenMenu     = document.getElementById('main-menu');
        this.screenGame     = document.getElementById('game-container');
        this.buttonEasy     = document.getElementById('button-easy');
        this.buttonHard     = document.getElementById('button-hard');
        this.buttonInsane   = document.getElementById('button-insane');
        this.buttonGameStart = document.getElementById('button-start');
        this.buttonEasy.onclick = () =>
        {
            this.SetDifficulty(Difficulties.easy);
            this.buttonEasy.classList.add('difficulty-selected');
            this.buttonHard.classList.remove('difficulty-selected');
            this.buttonInsane.classList.remove('difficulty-selected');
        }
        this.buttonHard.onclick = () =>
        {
            this.SetDifficulty(Difficulties.hard);
            this.buttonEasy.classList.remove('difficulty-selected');
            this.buttonHard.classList.add('difficulty-selected');
            this.buttonInsane.classList.remove('difficulty-selected');
        }
        this.buttonInsane.onclick = () =>
        {
            this.SetDifficulty(Difficulties.insane);
            this.buttonEasy.classList.remove('difficulty-selected');
            this.buttonHard.classList.remove('difficulty-selected');
            this.buttonInsane.classList.add('difficulty-selected');
        }
        this.buttonGameStart.onclick = () => this.Start();
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
        if (game_manager)
            game_manager.Destroy();
        this.screenMenu.style.display = 'none';
        game_manager = new GameManager(this.GetGame());
        game_manager.LogGame();
    }
}
//#endregion
let canvas_manager:CanvasManager = new CanvasManager(1,1);
const app_manager:AppManager = new AppManager();