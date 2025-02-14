#include <emscripten.h>
#include <emscripten/html5.h>

#include <stdio.h>
#include <time.h>
#include <math.h>

#define WIDTH 320
#define HEIGHT 240
#define PIXEL_COUNT 76800
#define BUFFER_SIZE 307200

unsigned char sand[WIDTH * HEIGHT];
bool ready = false;
uint8_t *wasmView; // shared pixel array
int dir = -1; // simulation direction

// Get sand value
unsigned char getVal(int x, int y)
{
    return (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) ? 2 : sand[y * WIDTH + x];
}

// https://lospec.com/palette-list/nicole-punk-82
const unsigned char colours[3][3] = {
    {0xfa,0xf5,0xd8},
    {0xf2,0xab,0x37},
    {0x21,0x18,0x1b}
};

// Set sand value, and colour
void setVal(int x, int y, unsigned char v)
{
    if (!(x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT))
    {
        sand[y * WIDTH + x] = v;

        if(ready){
            wasmView[(y * WIDTH + x) * 4 + 0] = colours[v][0];
            wasmView[(y * WIDTH + x) * 4 + 1] = colours[v][1];
            wasmView[(y * WIDTH + x) * 4 + 2] = colours[v][2];
            wasmView[(y * WIDTH + x) * 4 + 3] = 255;
        }
    }
}




// needed when using cpp to make function visible externally
extern "C"
{
   void reset();
    // EMSCRIPTEN_KEEPALIVE
    uint8_t *getArray(int n)
    {
        printf("SSB\n");
        wasmView = new uint8_t[n];
        for (int i = 0; i < n; i++)
        {
            wasmView[i] = i%4==2 ? 50 : i;
        }
        ready = true;
        reset();
        return wasmView;
    }

    // EMSCRIPTEN_KEEPALIVE
    int draw(float timeDelta, int mx, int my, bool mouseDown, bool bigBrush)
    {
        dir = dir == 1 ? -1 : 1; // flip each frame
        for (int y = HEIGHT - 1; y >= 0; y--)
        {
            for (int x2 = 0; x2 < WIDTH; x2++)
            {
                int x = dir > 0 ? x2 : WIDTH - 1 - x2;
                unsigned char b = getVal(x, y - 1);
                unsigned char c = getVal(x - 1 * dir, y);
                unsigned char d = getVal(x, y);
                if (d == 0)
                {
                    if (b == 1)
                    {
                        // down
                        setVal(x, y - 1, 0);
                        setVal(x, y, 1);
                    }
                    else
                    {
                        unsigned char a = getVal(x - 1 * dir, y - 1);
                        unsigned char c = getVal(x - 1 * dir, y);
                        if (a == 1 && b == 0 && c != 0)
                        {
                            // down-right
                            setVal(x - 1 * dir, y - 1, 0);
                            setVal(x, y, 1);
                        }
                    }
                }
            }
        }

        if (mouseDown)
        {
            if (bigBrush)
            {
                for (int dx = -5; dx <= 5; dx++)
                {
                    for (int dy = -5; dy <= 5; dy++)
                    {
                        if (getVal(mx + dx, my + dy) == 0)
                        {
                            setVal(mx + dx, my + dy, 1);
                        }
                    }
                }
            }
            else if (getVal(mx, my) == 0)
            {
                setVal(mx, my, 1);
            }
        }

        return 0;
    }

    void reset()
    {
    printf("Reset\n");
        for (int x = 0; x < WIDTH; x++)
        {
            for (int y = 0; y < HEIGHT; y++)
            {
                int r = rand() % 9;
                r = (((r * r) / 3)) % 3;

                setVal(x, y, (unsigned char)r);
            }
        }
    }
}

int main()
{
    printf("Hello WASM\n");

    reset();
    return 0;
}