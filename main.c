#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int width;
int heigth;
int iters;

void init_board(char **board, int w, int h)
{
    int i =0;
    while (i != h)
    {
        int j = 0;
        while (j != w)
        {
            board[i][j] = ' ';
            j++;
        }
        board[i][j] = '\0';
        i++;
    }
    // board[i] = '\0';
}

void    show(char **board, int h)
{
    for (int i = 0; i < h; i++)
    {
        for (int j = 0; j < width; j++)
            putchar(board[i][j]);
        putchar('\n');
    }
}

int is_valid_move(int y, int x, char mv)
{
    if ((y == 0 && mv == 'w') || (y == heigth-1  && mv == 's'))
        return 0;
    if ((x == 0 && mv == 'a') || (x == width-1  && mv == 'd'))
        return 0;
    return 1;
}

void    draw(char ** board, char *path, int r)
{
    int x = 0;
    int y = 0;
    int state = 0;

    int i = 0;
    while (r--)
    {  
        char mv = path[i];

        if (mv != 'w' && mv != 'a' && mv != 's' && mv != 'd'&& mv != 'x')
        {
            i++;
            continue;
        }    
        if ( !is_valid_move(y, x, mv) )
        {
            i++;
            continue;
        }   

        if (mv == 'x' && state == 0)
            state = 1;
        else if (mv == 'x' && state == 1)
            state = 0;

        if (mv == 'w')
            y--;
        if (mv == 's')
            y++;
        if (mv == 'a')
            x--;
        if (mv == 'd')
            x++;
        
        if (state == 1)
            board[y][x] = 'O';
        
        i++;
    }
}

int check(char **board, int y, int x)
{
    int c_a = 0;

    if ((y-1 >= 0) && (x-1 >= 0) && board[y-1][x-1] == 'O')
        c_a++;

    if ((x-1 >= 0) && board[y][x-1]  == 'O')
        c_a++;
    if ((y+1 < heigth) && (x-1 >= 0) &&  board[y+1][x-1] == 'O')
         c_a++;
    
    if ((y-1 >= 0) && (x+1 < width) && board[y-1][x+1] == 'O')
            c_a++;
    if ((x+1 < width) && board[y][x+1] == 'O')
            c_a++;
    if ((y+1 < heigth) && (x+1 < width) && board[y+1][x+1] == 'O')
            c_a++;


    if ((y-1 >= 0) && board[y-1][x] == 'O')
            c_a++;
    if ( (y+1 < heigth) && board[y+1][x] == 'O')
            c_a++;
    
    
    return c_a;
}



int main(int ac, char **av)
{
    if (ac != 4)
        return 1;
    
    width = atoi(av[1]);
    heigth = atoi(av[2]);
    iters = atoi(av[3]);

    //init
    char **board = malloc((heigth + 1) * sizeof(char *));
    int k = 0; 
    while (k < heigth)
    {
        board[k] = malloc(width + 1);
        k++;
    }
    init_board(board, width, heigth);
    
    // DRAW path
    char path[1000];
    int r = read(0, &path, 1000);
    
    draw(board, path, r);
    

    for (int p = 0; p < iters; p++)
    {
        char new[heigth][width];
        // check the 8 surr na dupdate in new
        for (int y = 0; y < heigth; y++)
        {
            for (int x = 0; x < width; x++)
            {   
                int c = check(board, y, x);
                if (board[y][x] == 'O' && (c == 2 || c ==3))
                    new[y][x] = 'O';
                else if (board[y][x] == ' ' && c ==3)
                    new[y][x] = 'O';
                else
                    new[y][x] = ' ';

            }    
        }

        for (int i = 0; i < heigth; i++)
        {
            for (int j = 0; j < width; j++)
                board[i][j] = new[i][j];
        }
        
    }

    show(board, heigth);
    while (heigth--)
        free(board[heigth]);
    free(board);

}