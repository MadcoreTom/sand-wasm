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

int main() {
    printf("Hello Main\n");

    for (int x = 0; x < WIDTH; x++)
    {
        for (int y = 0; y < HEIGHT; y++)
        {
            imageData[(y * WIDTH + x) * 4 + 0] = rand() % 255;
            imageData[(y * WIDTH + x) * 4 + 1] = rand() % 255;
            imageData[(y * WIDTH + x) * 4 + 2] = rand() % 255;
            imageData[(y * WIDTH + x) * 4 + 3] = 255;
        }
    }
    return 0;
}

// needed when using cpp to make function visible externally
extern "C"
{
    // EMSCRIPTEN_KEEPALIVE
    int draw(int seed, float timeDelta)
    {
        imageData[0] = rand() % 255;

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
            HEIGHT
        );
        return 0;
    }
}