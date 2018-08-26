const shaders = {
    "terrain/colorShader.frag": "uniform sampler2D height_map;\n\nvec3 land_low =   vec3(0.0,     0.25,    0.0);\nvec3 land_high =  vec3(0.45312, 0.71093, 0.51953);\n\nvec3 water_low =  vec3(0.0,     0.0,     0.21484);\nvec3 water_high = vec3(0.0,     0.20703, 0.41406);\n\nvec3 mount_low =  vec3(0.57421, 0.61328, 0.65234);\nvec3 mount_high = vec3(0.88281, 0.87109, 0.84375);\n\nfloat flood = 0.2;\nfloat mount = 0.85;\n\nvoid main() {\n    vec2 our_pos = gl_FragCoord.xy;\n    vec4 our_coord = texture2D(height_map, our_pos);\n\n    float height = our_coord.x;\n    float water_height = our_coord.y;\n\n    vec3 ground_color = height < mount ?\n                            mix(land_low, land_high, height)\n                          : mix(mount_low, mount_high, height);\n\n    vec3 water_color = mix(water_low, water_high, water_height);    \n\n    vec3 mix_color = mix(ground_color, water_color, water_height / (water_height + height));\n\n    gl_FragColor = vec4(mix_color, 1.0);\n}\n",
    "terrain/fallthrough.vert": "/**\n * Quick fallthrough vertex shader for GPGPU code\n */\n\nvoid main() {\n\tgl_Position = vec4( position, 1.0 );\n}\n",
    "terrain/mapgen.frag": "const float general_skew = 0.3660254037844386;\nconst float general_unskew = 0.21132486540518713; \n\nconst float gain = 0.65;\nconst float lacunarity = 2.0;\nuniform vec2 map_size;\n\nfloat grad_s[8];\nfloat grad_c[8];\n\nvoid setup_grad() {\n    grad_s[0] = 1.0;\n    grad_s[1] = 0.70710678146758598750;\n    grad_s[2] = 0.00000000079489665423;\n    grad_s[3] = -0.70710678034343221743;\n    grad_s[4] = -1.0;\n    grad_s[5] = -0.70710678259173953553;\n    grad_s[6] = -0.00000000238468996268;\n    grad_s[7] = 0.70710677921927866940;\n\n    grad_c[0] = 0.0;\n    grad_c[1] = 0.70710678090550915798;\n    grad_c[2] = 1.0;\n    grad_c[3] = 0.70710678202966281702;\n    grad_c[4] = 0.00000000158979330845;\n    grad_c[5] = -0.70710677978135549893;\n    grad_c[6] = -1.00000000000000000000;\n    grad_c[7] = -0.70710678315381647607;\n}\n\n// Do a dot product using the gradients\nfloat dot_product(int i, vec2 pos) {\n    if ( i == 0 ) {\n        return grad_s[0] * pos.x + grad_c[0] * pos.y;\n    }\n    else if ( i == 1 ) {\n        return grad_s[1] * pos.x + grad_c[1] * pos.y;\n    }\n    else if ( i == 2 ) {\n        return grad_s[2] * pos.x + grad_c[2] * pos.y;\n    }\n    else if ( i == 3 ) {\n        return grad_s[3] * pos.x + grad_c[3] * pos.y;\n    }\n    else if ( i == 4 ) {\n        return grad_s[4] * pos.x + grad_c[4] * pos.y;\n    }\n    else if ( i == 5 ) {\n        return grad_s[5] * pos.x + grad_c[5] * pos.y;\n    }\n    else if ( i == 6 ) {\n        return grad_s[6] * pos.x + grad_c[6] * pos.y;\n    }\n    else if ( i == 7 ) {\n        return grad_s[7] * pos.x + grad_c[7] * pos.y;\n    }\n}\n\n// Standard rand function.\nfloat rand(vec2 co) {\n    return fract(sin(dot(co.xy,vec2(12.9898,78.233))) * 43758.5453);\n}\n\n// Standard rand function extended to support 3 field vector.\nfloat rand(vec3 co) {\n    return fract(sin(dot(co.xyz,vec3(12.9898,78.233,99.134))) * 43758.5453);\n}\n\n// Get the euclideon distance squared\n// (x1-x2)^2 + (y1-y2)^2\nfloat euclidean_squared(vec2 a, vec2 b) {\n    float dif_x = a.x - b.x;\n    float dif_y = a.y - b.y;\n\n    return (dif_x * dif_x) + (dif_y * dif_y);\n}\n\n// Generate Simplex Noise 2D\nfloat simplex(vec2 pos) {\n    float skew_value = (pos.x + pos.y) * general_skew;\n\n    vec2 cornerb = floor(pos.xy + skew_value);\n\n    float unskew_value = (cornerb.x + cornerb.y) * general_unskew;\n\n    vec2 disb = (pos - cornerb) + unskew_value;\n\n    vec2 cornerm = cornerb;\n\n    if ( disb.x > disb.y ) {\n        cornerm += vec2(1.0, 0.0);\n    }\n    else {\n        cornerm += vec2(0.0, 1.0);\n    }\n\n    vec2 cornert = cornerb + vec2(1.0, 1.0);\n\n    vec2 dism = (disb - (cornerm - cornerb)) + general_unskew;\n    vec2 dist = disb - 1.0 + general_unskew + general_unskew;\n\n    int gradb = int(rand(cornerb) * 7.0);\n    int gradm = int(rand(cornerm) * 7.0);\n    int gradt = int(rand(cornert) * 7.0);\n\n    float noiseb = 0.0;\n    float noisem = 0.0;\n    float noiset = 0.0;\n\n    float tempdis = 0.5 - (disb.x * disb.x) - (disb.y * disb.y);\n\n    if ( tempdis > 0.0 ) {\n        tempdis *= tempdis;\n        noiseb = tempdis * tempdis * dot_product(gradb, disb);\n    }\n\n    tempdis = 0.5 - (dism.x * dism.x) - (dism.y * dism.y);\n\n    if ( tempdis > 0.0 ) {\n        tempdis *= tempdis;\n        noisem = tempdis * tempdis * dot_product(gradm, dism);\n    }\n\n    tempdis = 0.5 - (dist.x * dist.x) - (dist.y * dist.y);\n\n    if ( tempdis > 0.0 ) {\n        tempdis *= tempdis;\n        noiset = tempdis * tempdis * dot_product(gradt, dist);\n    }\n\n    return noiseb + noisem + noiset;\n}\n\n    // Generate Cellular Noise\nfloat cellular(vec2 pos) {\n    vec2 points[9];\n    float x = pos.x;\n    float y = pos.y;\n\n    int floor_x = int(x);\n    int floor_y = int(y);\n\n    for ( int i = 0; i < 3; i++ ) {\n        for ( int j = 0; j < 3; j++ ) {\n            float temp_x = float(floor_x + i - 1);\n            float temp_y = float(floor_y + j - 1);\n\n            points[(j * 3) + i] = vec2(\n                temp_x + rand(vec3(temp_x, temp_y, 1)),\n                temp_y + rand(vec3(temp_x, temp_y, 2))\n            );\n        }\n    }\n\n    float dist1 = 999999.0;\n    float dist2 = 999999.0;\n\n    for ( int i = 0; i < 3; i++ ) {\n        for ( int j = 0; j < 3; j++ ) {\n            float dist = euclidean_squared(pos, points[(j * 3) + i]);\n\n            if ( dist < dist1 ) {\n                if ( dist1 < dist2 ) {\n                    dist2 = dist1;\n                }\n\n                dist1 = dist;\n            }\n            else if ( dist < dist2 ) {\n                dist2 = dist;\n            }\n        }\n    }\n\n    return dist2 - dist1;\n}\n\nvoid main() {\n    setup_grad();\n    \n    float totalCell = 0.0;\n    float totalSimp = 0.0;\n    float frequency = 4.0 / map_size.x;\n    float amplitude = 1.0;\n    vec2 pos = gl_FragCoord.xy;\n\n    int octave = 0;\n\n    // 2 octaves of cellular noise\n    for ( int i = 0; i < 2; i++ ) {\n        int offset = octave * 7;\n        totalCell += cellular(pos * frequency + vec2(offset, offset)) * amplitude;\n\n        frequency *= lacunarity;\n        amplitude *= gain;\n        octave++;\n    }\n\n    amplitude *= 30.0;\n\n    // Rest of them be simplex noise\n    for ( int j = 0; j < 8; j++ ) {\n        int offset = octave * 7;\n        totalSimp += (simplex(pos * frequency + vec2(offset, offset)) * amplitude);\n\n        frequency *= lacunarity;\n        amplitude *= gain;\n        octave++;\n    }\n\n    float total = totalCell + totalSimp;\n    gl_FragColor = vec4(total, 0.0, 0.0, 0.0);\n}",
    "terrain/passes/hydraulic/erosion_deposition.frag": "/**\n * Simulate the Erosion and the Deposition of sediment suspended in water\n */\n\nuniform sampler2D height_map; // Current heightmap\nuniform sampler2D velocity_field; // The velocity field\n\nconst float sediment_capacity = 1.0; // Sediment capacity constant\nconst float sediment_disolve = 1.0; // Sediment disolving constant\nconst float sediment_deposit = 1.0; // Sediment deposition constant\n\nfloat pow2(float x) {\n    return x * x;\n}\n\nvoid main() {\n    vec2 pos = gl_FragCoord.xy;\n\n    vec4 our_coord = texture2D(height_map, pos);\n    vec2 offset = vec2(1.0, 0.0);\n\n    // Calculate neighbor heights\n    float our_left   = texture2D(height_map, pos - offset.xy).x;\n    float our_right  = texture2D(height_map, pos + offset.xy).x;\n    float our_top    = texture2D(height_map, pos - offset.yx).x;\n    float our_bottom = texture2D(height_map, pos + offset.yx).x;\n\n    // Use finite difference method to get normal\n    vec3 normal = normalize(vec3(\n        our_left - our_right,\n        our_top - our_bottom,\n        2.0\n    ));\n\n    // Calculate the localgle\n    float r = pow2(normal.x) +\n              pow2(normal.y) +\n              pow2(normal.z);\n\n    float angle = acos(normal.z / r);\n\n    // Get the length of our current vector.\n    vec4 our_vec = texture2D(velocity_field, pos);\n    float vec_len = sqrt(pow2(our_vec.x) + pow2(our_vec.y) + pow2(our_vec.z));\n\n    // Calculate our sediment capacity\n    float capacity = sediment_capacity * sin(angle) * vec_len;\n\n    // Calculate the new terrain/sediment heights\n    gl_FragColor.yw = our_coord.yw;\n\n    if ( capacity > our_coord.z ) {\n        // Disolve some of the terrain into the water\n        gl_FragColor.x = our_coord.x - (sediment_disolve * (capacity - our_coord.z));\n        gl_FragColor.z = our_coord.z + (sediment_disolve * (capacity - our_coord.z));\n    }\n    else {\n        // Deposit some of the disolved sediment into the terrain\n        gl_FragColor.x = our_coord.x + (sediment_deposit * (our_coord.z - capacity));\n        gl_FragColor.z = our_coord.z - (sediment_deposit * (our_coord.z - capacity));\n    }\n}\n",
    "terrain/passes/hydraulic/outflow_flux.frag": "/**\n * Calculate the flux values for the virtual pipes during hydraulic erosion\n */\n\n\nuniform sampler2D flux_map; // Current flux map\nuniform sampler2D height_map; // Current heightmap. Fields: (land, water, sediment, unused)\nuniform vec2 map_size;\nuniform float dt; // Time delta\n\nconst float gravity = 9.8; // Acceleration due to gravity\nconst float A = 0.00005; // Cross sectional area of the virtual pipe\nconst float l = 1.0; // Length of the virtual pipe\nconst float dX = 1.0; // Distance between two grid points\nconst float dY = 1.0; // ^^\n\nconst float static_mult = A * gravity * (1.0 / l); // Precompute part of the computation\n\nvec4 get_delta(vec2 pos, float our_height) {\n    vec2 offset = vec2(1.0, 0.0);\n    vec4 out_delta;\n\n    if ( pos.x > 0.0 ) {\n        // Get the delta for the left\n        vec4 left_coord = texture2D(height_map, pos - offset.xy);\n        out_delta.x = our_height - (left_coord.x + left_coord.y);\n    }\n    else {\n        out_delta.x = 0.0;\n    }\n\n    if ( pos.x < map_size.x ) {\n        // Get the delta for the right\n        vec4 right_coord = texture2D(height_map, pos + offset.xy);\n        out_delta.y = our_height - (right_coord.x + right_coord.y);\n    }\n    else {\n        out_delta.y = 0.0;\n    }\n\n    if ( pos.y > 0.0 ) {\n        // Get the delta for the top\n        vec4 top_coord = texture2D(height_map, pos - offset.yx);\n        out_delta.z = our_height - (top_coord.x + top_coord.y);\n    }\n    else {\n        out_delta.z = 0.0;\n    }\n\n    if ( pos.y < map_size.y ) {\n        // Get the delta for the bottom\n        vec4 bottom_coord = texture2D(height_map, pos + offset.yx);\n        out_delta.w = our_height - (bottom_coord.x + bottom_coord.y);\n    }\n    else {\n        out_delta.w = 0.0;\n    }\n\n    return out_delta;\n}\n\nvoid main() {\n    vec2 pos = gl_FragCoord.xy;\n\n    // Precompute as much as possible\n    float precomp = dt * static_mult;\n\n    // Get our information\n    vec4 our_coord = texture2D(height_map, pos);\n    float our_height = our_coord.x + our_coord.y;\n    vec4 in_flux = texture2D(flux_map, pos);\n\n    // Calculate the deltas\n    vec4 deltas = get_delta(pos, our_height);\n\n    // Use a mixture of the precomputed values and the deltas to calculate flux\n    vec4 out_flux = vec4(\n        max(0.0, precomp * deltas.x + in_flux.x),\n        max(0.0, precomp * deltas.y + in_flux.y),\n        max(0.0, precomp * deltas.z + in_flux.z),\n        max(0.0, precomp * deltas.w + in_flux.w)\n    );\n\n    // Calculate the scaling factor\n    float sum = out_flux.x + out_flux.y + out_flux.z + out_flux.w;\n\n    // Calculate the scaling factor\n    float scale = min(1.0, (our_coord.y * dX * dY) / (sum * dt));\n\n    // Apply the scaling factor\n    gl_FragColor = out_flux * scale;\n}\n",
    "terrain/passes/hydraulic/transportation_evaporation.frag": "/**\n * Simulate the movement of disolved sediment and evaporate water\n */\n\nuniform sampler2D height_map; // Current heightmap\nuniform sampler2D velocity_field; // The velocity field\nuniform float dt; // Time delta\nuniform vec2 map_size;\n\nconst float evaporation = 0.05; // % of water to evaporate\n\n// Determine if a value is in-grid or not\nbool in_grid(vec2 pos) {\n    return pos.x > 0.0 && pos.x < map_size.x &&\n           pos.y > 0.0 && pos.y < map_size.y;\n}\n\nvoid main() {\n    vec2 pos = gl_FragCoord.xy;\n\n    vec4 our_coord = texture2D(height_map, pos);\n    vec4 our_velocity = texture2D(velocity_field, pos);\n\n    // Take a eulerian step back\n    vec2 back_pos = pos - (our_velocity.xy * dt);\n\n    gl_FragColor.xw = our_coord.xw;\n\n    if ( in_grid(back_pos) ) {\n        // Copy the value\n        gl_FragColor.z = texture2D(height_map, back_pos).z;\n    }\n    else {\n        // TODO - interpoliate between four nearest neighbors\n        // Until then.... do nothing? this doesnt seem like a stable\n        // solution.\n    }\n\n    // Evaporate\n    gl_FragColor.y = our_coord.y * ((1.0 - evaporation) * dt);\n}\n",
    "terrain/passes/hydraulic/velocity_field.frag": "/**\n * Recalculate vector field based off of flow of the water\n */\n\nuniform sampler2D flux_map;\nuniform sampler2D height_map; // Map at end of iteration (land, water, sediment, avg B)\n\nconst float dX = 1.0; // Distance between two grid points\nconst float dY = 1.0; // ^^\n\nvec4 get_influx(vec2 pos) {\n    vec2 offset = vec2(1.0, 0.0);\n\n    // Get the influx values\n    vec4 influx = vec4(\n        texture2D(flux_map, pos - offset.xy).y,\n        texture2D(flux_map, pos + offset.xy).x,\n        texture2D(flux_map, pos - offset.yx).w,\n        texture2D(flux_map, pos + offset.yx).z\n    );\n\n    return influx;\n}\n\nvoid main() {\n    vec2 pos = gl_FragCoord.xy;\n\n    // Calculuate the influx\n    vec4 influx = get_influx(pos);\n\n    // Calculuate the outflux\n    float our_left_flux = texture2D(flux_map, pos).x;\n    float our_right_flux = texture2D(flux_map, pos).y;\n    float our_top_flux = texture2D(flux_map, pos).z;\n    float our_bottom_flux = texture2D(flux_map, pos).w;\n\n    // Calculate the average water height\n    float avg_water_height = texture2D(height_map, pos).w;\n\n    // Calculate amount of water moving through X/Y pipes\n    float avg_water_x = (influx.x - our_left_flux + our_right_flux - influx.y) / 2.0;\n    float avg_water_y = (influx.z - our_top_flux + our_bottom_flux - influx.w) / 2.0;\n\n    // Recalculate vector components\n    gl_FragColor = vec4(\n        avg_water_x / (dY * avg_water_height),\n        avg_water_y / (dX * avg_water_height),\n        0.0, 0.0\n    );\n}\n",
    "terrain/passes/hydraulic/water_increment.frag": "uniform sampler2D height_map;\n\nvoid main() {\n\tvec2 pos = gl_FragCoord.xy / 64.0;\n\tvec4 our_coord = texture2D(height_map, pos);\n\n\t// Update the water height\n\tgl_FragColor.xwz = our_coord.xwz;\n\tgl_FragColor.y = our_coord.y + 0.1;\n}",
    "terrain/passes/hydraulic/water_surface.frag": "/**\n * Calculate the new water surface levels\n */\n\nuniform sampler2D height_map; // Current heightmap.\nuniform sampler2D flux_map; // Current fluxmap. Fields (left, right, top bottom)\n\nconst float dX = 1; // Distance between two grid points\nconst float dY = 1; // ^^\n\nvec4 get_influx(vec2 pos) {\n    vec2 offset = vec2(1.0, 0.0);\n\n    // Get the influx values\n    vec4 influx = vec4(\n        texture2D(flux_map, pos - offset.xy).y,\n        texture2D(flux_map, pos + offset.xy).x,\n        texture2D(flux_map, pos - offset.yx).w,\n        texture2D(flux_map, pos + offset.yx).z\n    );\n\n    return influx;\n}\n\nvoid main() {\n    vec2 pos = gl_FragCoord.xy;\n    vec4 our_coord = texture2D(height_map, pos);\n\n    // Calculate our total outflux\n    vec4 outflux = texture2D(flux_map, pos);\n\n    float outflux_total = outflux.x +\n                          outflux.y +\n                          outflux.z +\n                          outflux.w;\n\n    // Calculuate component influx values\n    vec4 influx = get_influx(pos);\n\n    // Calculate total influx\n    float influx_total = influx.x +\n                         influx.y +\n                         influx.z +\n                         influx.w;\n\n    // Net Volume = in - out\n    float net_volume = influx_total - outflux_total;\n\n    // Calculate new water height\n    gl_FragColor.xz = our_coord.xz;\n    gl_FragColor.y += (net_volume) / (dX * dY);\n    gl_FragColor.w = (gl_FragColor.y - our_coord.y) / 2;\n}\n"
};