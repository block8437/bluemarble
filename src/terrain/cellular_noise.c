#include <math.h>
#include <limits.h>
#include <stdio.h>
#include <float.h>
#include "random.h"

// Calculate the euclidean distance squared.
float euclidean_squared(float x1, float y1, float x2, float y2) {
    float dif_x = x1 - x2;
    float dif_y = y1 - y2;

    return (dif_x * dif_x) + (dif_y * dif_y);
}

// Calculate the cellular noise value.
float cellular_noise(float x, float y) {
    float points[3][3][2];

    int floor_x = (int) floorf(x);
    int floor_y = (int) floorf(y);

    for ( int i = 0; i < 3; i++ ) {
        for ( int j = 0; j < 3; j++ ) {
            int temp_x = floor_x + i - 1;
            int temp_y = floor_y + j - 1;

            points[i][j][0] = temp_x + random3(temp_x, temp_y, 1);
            points[i][j][1] = temp_y + random3(temp_x, temp_y, 2);
        }
    }

    float dist1 = FLT_MAX;
    float dist2 = FLT_MAX;

    for ( int i = 0; i < 3; i++ ) {
        for ( int j = 0; j < 3; j++ ) {
            float dist = euclidean_squared(x, y, points[i][j][0], points[i][j][1]);

            if ( dist < dist1 ) {
                if ( dist1 < dist2 ) {
                    dist2 = dist1;
                }

                dist1 = dist;
            }
            else if ( dist < dist2 ) {
                dist2 = dist;
            }
        }
    }

    return dist2 - dist1;
}
