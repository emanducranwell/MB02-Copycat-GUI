#ifdef GL_ES
precision highp float;
#endif

uniform vec2 u_resolution;

uniform vec3 u_ball1;
uniform vec3 u_ball2;

float field(vec2 p, vec3 ball) {
    float dx = p.x - ball.x;
    float dy = p.y - ball.y;
    float r = ball.z;
    return (r * r) / (dx * dx + dy * dy + 0.001);
}

void main() {
    vec2 uv = gl_FragCoord.xy;

    float sum = 0.0;
    sum += field(uv, u_ball1);
    sum += field(uv, u_ball2);

    // Hard-edged blobs
    float threshold = 1.0;
    if (sum > threshold) {
        gl_FragColor = vec4(1.0);  // White
    } else {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);  // Black
    }
}
