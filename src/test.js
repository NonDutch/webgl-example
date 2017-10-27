"use strict";
const vs = `
attribute vec4 position;
attribute vec2 texcoord;

uniform mat4 matrix;

varying vec2 v_texcoord;

void main() {
  gl_Position = matrix * position;
  v_texcoord = texcoord;
}
`;
const fs = `
precision mediump float;

varying vec2 v_texcoord;

uniform sampler2D tex;
uniform vec2 mousePos;
uniform float minRadius;
uniform float maxRadius;

void main() {
  vec4 color0 = texture2D(tex, v_texcoord);
  vec4 bw = vec4(vec3(color0.r + color0.g + color0.b) / 3., color0.a);
  
  float dist = distance(mousePos, gl_FragCoord.xy);
  float range = maxRadius - minRadius;
  float mixAmount = clamp((dist - minRadius) / range, 0., 1.);
  
  gl_FragColor = mix(color0, bw, mixAmount);
}
`;
const m4 = twgl.m4;
const gl = document.querySelector("canvas").getContext("webgl");
const info = document.querySelector("#info");

// compiles shaders, link program, looks up locations
const programInfo = twgl.createProgramInfo(gl, [vs, fs]);

// calls gl.createBuffer, gl.bindBuffer, gl.bufferData for each array
const bufferInfo = twgl.primitives.createXYQuadBufferInfo(gl);

const textureInfo = {
    width: 1,
    height: 1,
};
const texture = twgl.createTexture(gl, {
    src: "http://i.imgur.com/NzBzAdN.jpg",
    crossOrigin: '',
    flipY: true,
}, (err, tex, img) => {
    textureInfo.width = img.width;
    textureInfo.height = img.height;
    render();
});

const mousePos = [0, 0];

function render() {
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.useProgram(programInfo.program);

    // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);

    // cover canvas with image
    const canvasAspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const imageAspect = textureInfo.width / textureInfo.height;

    // this assumes we want to fill vertically
    let horizontalDrawAspect = imageAspect / canvasAspect;
    let verticalDrawAspect = 1;
    // does it fill horizontally?
    if (horizontalDrawAspect < 1) {
        // no it does not so scale so we fill horizontally and
        // adjust vertical to match
        verticalDrawAspect /= horizontalDrawAspect;
        horizontalDrawAspect = 1;
    }
    const mat = m4.scaling([horizontalDrawAspect, verticalDrawAspect, 1]);

    // calls gl.activeTexture, gl.bindTexture, gl.uniform
    twgl.setUniforms(programInfo, {
        minRadius: 25,
        maxRadius: 100,
        tex: texture,
        matrix: mat,
        mousePos: mousePos,
    });

    twgl.drawBufferInfo(gl, bufferInfo);
}
render();

gl.canvas.addEventListener('mousemove', e => {
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();

    const x = (e.clientX - rect.left) * canvas.width / rect.width;
    const y = (e.clientY - rect.top)  * canvas.height / rect.height;
    mousePos[0] = x;
    mousePos[1] = canvas.height - y - 1;

    render();
});

window.addEventListener('resize', render);