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
int dir = -1;      // simulation direction

// Get sand value
unsigned char getVal(int x, int y)
{
    return (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) ? 2 : sand[y * WIDTH + x];
}

// https://lospec.com/palette-list/nicole-punk-82
const unsigned char colours[3][3] = {
    {0xfa, 0xf5, 0xd8},
    {0xf2, 0xab, 0x37},
    {0x21, 0x18, 0x1b}};

const unsigned char rainbow[3][3] = {
    {0xff, 0x00, 0x4d},
    {0x00, 0xe4, 0x36},
    {0x29, 0xad, 0xff}};

// Set sand value, and colour
void setVal(int x, int y, unsigned char v)
{
    if (!(x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT))
    {
        sand[y * WIDTH + x] = v;

        if (ready)
        {
            wasmView[(y * WIDTH + x) * 4 + 0] = colours[v][0];
            wasmView[(y * WIDTH + x) * 4 + 1] = colours[v][1];
            wasmView[(y * WIDTH + x) * 4 + 2] = colours[v][2];
            wasmView[(y * WIDTH + x) * 4 + 3] = 255;
        }
    }
}

// Set sand value, and colour
void setSandRgb(int x, int y, unsigned char r, unsigned char g, unsigned char b)
{
    if (!(x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT))
    {
        sand[y * WIDTH + x] = 1;

        if (ready)
        {
            wasmView[(y * WIDTH + x) * 4 + 0] = r;
            wasmView[(y * WIDTH + x) * 4 + 1] = g;
            wasmView[(y * WIDTH + x) * 4 + 2] = b;
            wasmView[(y * WIDTH + x) * 4 + 3] = 255;
        }
    }
}

void swapVal(int x, int y, int x2, int y2)
{
    if (!(x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT))
    {
        int i = (y * WIDTH + x) * 4;
        int i2 = (y2 * WIDTH + x2) * 4;
        uint8_t aColR = wasmView[i + 0];
        uint8_t aColG = wasmView[i + 1];
        uint8_t aColB = wasmView[i + 2];
        uint8_t aColA = wasmView[i + 3];
        unsigned char aSand = sand[y * WIDTH + x];
        // set A
        wasmView[i + 0] = wasmView[i2 + 0];
        wasmView[i + 1] = wasmView[i2 + 1];
        wasmView[i + 2] = wasmView[i2 + 2];
        wasmView[i + 3] = wasmView[i2 + 3];
        sand[y * WIDTH + x] = sand[y2 * WIDTH + x2];
        // set B
        wasmView[i2 + 0] = aColR;
        wasmView[i2 + 1] = aColG;
        wasmView[i2 + 2] = aColB;
        wasmView[i2 + 3] = aColA;
        sand[y2 * WIDTH + x2] = aSand;
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
            wasmView[i] = i % 4 == 2 ? 50 : i;
        }
        ready = true;
        reset();
        return wasmView;
    }

    // EMSCRIPTEN_KEEPALIVE
    int draw(int seed, float timeDelta, int mx, int my, bool mouseDown, bool bigBrush)
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
                        swapVal(x, y, x, y - 1);
                    }
                    else
                    {
                        unsigned char a = getVal(x - 1 * dir, y - 1);
                        unsigned char c = getVal(x - 1 * dir, y);
                        if (a == 1 && b == 0 && c != 0)
                        {
                            // down-right
                            swapVal(x, y, x - 1 * dir, y - 1);
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
                            setSandRgb(mx + dx, my + dy, rainbow[seed % 3][0], rainbow[seed % 3][1], rainbow[seed % 3][2]);
                        }
                    }
                }
            }
            else if (getVal(mx, my) == 0)
            {
                setSandRgb(mx, my, rainbow[seed % 3][0], rainbow[seed % 3][1], rainbow[seed % 3][2]);
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