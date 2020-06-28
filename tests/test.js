function PlayerAttackTest()
{
    let game = game_manager.game;

    let p1 = game.GetPlayer(0);
    let p2 = game.GetPlayer(1);

    p2.pieces[0].active = true;
    p2.pieces[1].active = true;
    p2.pieces[2].active = true;
    p2.pieces[3].active = true;
    p2.pieces[0].SetValue(1);
    p2.pieces[1].SetValue(2);
    p2.pieces[2].SetValue(3);
    p2.pieces[3].SetValue(4);
    p2.pieces[0].SetInitialPosition(1,0);
    p2.pieces[1].SetInitialPosition(2,0);
    p2.pieces[2].SetInitialPosition(3,0);
    p2.pieces[3].SetInitialPosition(4,0);
    game.board[0][1] = p2.pieces[0].GetBoardValue();
    game.board[0][2] = p2.pieces[1].GetBoardValue();
    game.board[0][3] = p2.pieces[2].GetBoardValue();
    game.board[0][4] = p2.pieces[3].GetBoardValue();
    p2.pieces[0].SetDirection(2);
    p2.pieces[1].SetDirection(2);
    p2.pieces[2].SetDirection(2);
    p2.pieces[3].SetDirection(2);

    p1.pieces[0].active = true;
    p1.pieces[1].active = true;
    p1.pieces[2].active = true;
    p1.pieces[3].active = true;
    p1.pieces[0].SetValue(1);
    p1.pieces[1].SetValue(2);
    p1.pieces[2].SetValue(3);
    p1.pieces[3].SetValue(4);
    p1.pieces[0].SetInitialPosition(1,3);
    p1.pieces[1].SetInitialPosition(2,3);
    p1.pieces[2].SetInitialPosition(3,3);
    p1.pieces[3].SetInitialPosition(4,3);
    game.board[3][1] = p1.pieces[0].GetBoardValue();
    game.board[3][2] = p1.pieces[1].GetBoardValue();
    game.board[3][3] = p1.pieces[2].GetBoardValue();
    game.board[3][4] = p1.pieces[3].GetBoardValue();
    p1.pieces[0].SetDirection(0);
    p1.pieces[1].SetDirection(0);
    p1.pieces[2].SetDirection(0);
    p1.pieces[3].SetDirection(0);

    //game.RoundEnd();
}