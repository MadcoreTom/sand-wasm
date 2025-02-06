#include <emscripten.h>
#include <emscripten/html5.h>
#include <stdio.h>
#include <time.h>
#include <math.h>

#define WIDTH 320
#define HEIGHT 240
#define PIXEL_COUNT 76800
#define BUFFER_SIZE 307200

unsigned char imageData[BUFFER_SIZE];

unsigned char sand[WIDTH * HEIGHT];

unsigned char getVal(int x, int y)
{
    return (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) ? 2 : sand[y * WIDTH + x];
}

void setVal(int x, int y, unsigned char v)
{
    if (!(x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT))
    {
        sand[y * WIDTH + x] = v;

        imageData[(y * WIDTH + x) * 4 + 0] = v == 0 ? 0 : 255;
        imageData[(y * WIDTH + x) * 4 + 1] = v != 1 ? 0 : 255;
        imageData[(y * WIDTH + x) * 4 + 2] = v != 2 ? 0 : 255;
        imageData[(y * WIDTH + x) * 4 + 3] = 255;
    }
}

int dir = -1;

// needed when using cpp to make function visible externally
extern "C"
{
    // EMSCRIPTEN_KEEPALIVE
    int draw(int seed, float timeDelta)
    {
        dir = dir == 1 ? -1 : 1; // flip each frame
        for (int y = HEIGHT - 1; y >= 0; y--)
        {
            for (int x2 = 0; x2 < WIDTH; x2++)
            {
                int x = dir > 0 ? x2 : WIDTH - 1 - x2;
                unsigned char a = getVal(x - 1 * dir, y - 1);
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
                    if (a == 1 && b == 0 && c != 0)
                    {
                        // down-right
                        setVal(x - 1 * dir, y - 1, 0);
                        setVal(x, y, 1);
                    }
                }
            }
        }

        setVal(0, 0, rand() % 3);

        // set the image data
        EM_ASM(
            {
                var canvas = document.querySelector('canvas');
                var ctx = canvas.getContext('2d');
                var imageData = ctx.createImageData($1, $2);
                imageData.data.set(HEAPU8.subarray($0, $0 + ($1 * $2 * 4)));
                ctx.putImageData(imageData, 0, 0);
            },
            imageData,
            WIDTH,
            HEIGHT);
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
    printf("Hello Main\n");

    reset();
    return 0;
}