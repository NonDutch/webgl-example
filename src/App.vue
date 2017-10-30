<template>
    <v-app :dark="darkmode">
        <v-toolbar fixed app>
            <v-toolbar-title v-text="title"></v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon @click="darkmode = !darkmode">
                <v-icon v-if="darkmode">brightness_5</v-icon>
                <v-icon v-if="!darkmode">brightness_2</v-icon>
            </v-btn>
        </v-toolbar>
        <main>
            <v-content>
                <v-container>
                    <v-layout row wrap>
                        <v-flex xs12 text-xs-center>
                            <v-menu offset-y absolute full-width>
                                <canvas slot="activator" ref="canvas"></canvas>
                                <v-list>
                                    <v-list-tile @click="download">
                                        <v-list-tile-title>Save</v-list-tile-title>
                                    </v-list-tile>
                                </v-list>
                            </v-menu>

                        </v-flex>

                        <v-flex xs4>
                            Brightness
                            <v-slider v-model="brightness" thumb-label @input="redraw('brightness', parseFloat(brightness / 50 - 1))" min="0"
                                      max="100"></v-slider>
                        </v-flex>

                        <v-flex xs4>
                            Contrast
                            <v-slider v-model="contrast" thumb-label @input="redraw('contrast', parseFloat(contrast / 100))" min="-100"
                                      max="100"></v-slider>
                        </v-flex>

                        <v-flex xs4>
                            Temperature
                            <v-slider v-model="temperature" thumb-label @input="redraw('temperature', parseFloat(temperature / 100))" min="-20"
                                      max="20"></v-slider>
                        </v-flex>

                        <v-flex xs4>
                            Saturation
                            <v-slider v-model="saturation" thumb-label @input="redraw('saturation', parseFloat(saturation / 100))" min="-100" max="100"></v-slider>
                        </v-flex>

                        <v-flex xs4>
                            Sepia
                            <v-slider v-model="sepia" thumb-label @input="redraw('sepia', parseFloat(sepia / 10))" min="0" max="10"></v-slider>
                        </v-flex>

                        <v-flex xs4>
                            Vibrance
                            <v-slider v-model="vibrance" thumb-label @input="redraw('vibrance', parseFloat(vibrance / 10))" min="-10" max="10"></v-slider>
                        </v-flex>

                        <v-flex xs12>
                            <v-btn color="primary" @click="download">Save</v-btn>
                        </v-flex>

                    </v-layout>

                    <input type="file" accept="image/*" @change="fileUpload" ref="fileSelector" style="display: none">
                    <v-btn
                            fixed
                            dark
                            fab
                            bottom
                            right
                            color="red"
                            @click="$refs.fileSelector.click()"
                    >
                        <v-icon>camera_alt</v-icon>
                    </v-btn>
                </v-container>
            </v-content>
        </main>
    </v-app>
</template>

<script>
    import VSlider from "vuetify/es5/components/VSlider/VSlider";

    export default {
        components: {VSlider},
        data() {
            return {
                title: 'WebGL Photoshop',
                darkmode: true,
                brightness: 50,
                contrast: 0,
                temperature: 0,
                saturation: 0,
                sepia: 0,
                vibrance: 0
            }
        },

        mounted() {
            this.renderImage('public/test_image.jpg');
        },

        methods: {
            download() {
                this.$refs.canvas.toBlob(blob => {
                    const anchor = document.createElement('a');

                    anchor.href = URL.createObjectURL(blob);
                    anchor.download = Date.now() + '.png';

                    anchor.click();
                });
            },

            redraw(component, newValue) {
                this.gl.uniform1f(this[`${component}Location`], newValue);
                this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
            },

            fileUpload() {
                const reader = new FileReader();
                reader.readAsDataURL(this.$refs.fileSelector.files[0]);
                reader.onload = (e) => {
                    this.renderImage(e.target.result);
                };
            },

            renderImage(imageSrc) {
                const image = new Image();
                const canvas = this.$refs.canvas;

                image.src = imageSrc;

                image.onload = () => {
                    canvas.width = image.naturalWidth;
                    canvas.height = image.naturalHeight;

                    const gl = canvas.getContext('webgl', {preserveDrawingBuffer: true});
                    this.gl = gl;

                    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

                    gl.clearColor(1, 0, 0, 1);
                    gl.clear(gl.COLOR_BUFFER_BIT);

                    const vertShaderSource = `
                        attribute vec2 position;

                        varying vec2 texCoords;

                        void main() {
                            texCoords = (position + 1.0) / 2.0;
                            texCoords.y = 1.0 - texCoords.y;
                            gl_Position = vec4(position, 0, 1.0);
                        }
                    `;

                    const fragShaderSource = `
                        precision highp float;

                        varying vec2 texCoords;

                        uniform sampler2D textureSampler;

                        uniform float brightness;
                        uniform float contrast;
                        uniform float temperature;
                        uniform float saturation;
                        uniform float sepia;
                        uniform float vibrance;

                        void main() {
                            vec4 color = texture2D(textureSampler, texCoords);
                                color.r += temperature;

                                float r = color.r;
                                float g = color.g;
                                float b = color.b;

                                color.r = min(1.0, (r * (1.0 - (0.607 * sepia))) + (g * (0.769 * sepia)) + (b * (0.189 * sepia)));
                                color.g = min(1.0, (r * 0.349 * sepia) + (g * (1.0 - (0.314 * sepia))) + (b * 0.168 * sepia));
                                color.b = min(1.0, (r * 0.272 * sepia) + (g * 0.534 * sepia) + (b * (1.0 - (0.869 * sepia))));

                                color.rgb += brightness;
                                if (contrast > 0.0) {
                                    color.rgb = (color.rgb - 0.5) / (1.0 - contrast) + 0.5;
                                } else {
                                    color.rgb = (color.rgb - 0.5) * (1.0 + contrast) + 0.5;
                                }

                                float average = (color.r + color.g + color.b) / 3.0;

                                if (saturation > 0.0) {
                                    color.rgb += (average - color.rgb) * (1.0 - 1.0 / (1.001 - saturation));
                                } else {
                                    color.rgb += (average - color.rgb) * (-saturation);
                                }

                                float vibranceAverage = (color.r + color.g + color.b) / 3.0;
                                float mx = max(color.r, max(color.g, color.b));
                                float amt = (mx - vibranceAverage) * (-vibrance * 3.0);
                                color.rgb = mix(color.rgb, vec3(mx), amt);

                                gl_FragColor = color;
                        }
                    `;

                    const vertShader = gl.createShader(gl.VERTEX_SHADER);
                    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);

                    gl.shaderSource(vertShader, vertShaderSource);
                    gl.shaderSource(fragShader, fragShaderSource);

                    gl.compileShader(vertShader);
                    gl.compileShader(fragShader);

                    const program = gl.createProgram();
                    gl.attachShader(program, vertShader);
                    gl.attachShader(program, fragShader);

                    gl.linkProgram(program);

                    gl.useProgram(program);

                    this.brightnessLocation = gl.getUniformLocation(program, 'brightness');
                    this.contrastLocation = gl.getUniformLocation(program, 'contrast');
                    this.temperatureLocation = gl.getUniformLocation(program, 'temperature');
                    this.saturationLocation = gl.getUniformLocation(program, 'saturation');
                    this.sepiaLocation = gl.getUniformLocation(program, 'sepia');
                    this.vibranceLocation = gl.getUniformLocation(program, 'vibrance');

                    const vertices = new Float32Array([
                        -1, -1,
                        -1, 1,
                        1, 1,

                        -1, -1,
                        1, 1,
                        1, -1,
                    ]);

                    const vertexBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

                    const positionLocation = gl.getAttribLocation(program, 'position');

                    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
                    gl.enableVertexAttribArray(positionLocation);

                    const texture = gl.createTexture();
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

                    gl.drawArrays(gl.TRIANGLES, 0, 6);
                };
            }
        },
    }
</script>

<style>
    canvas {
        width: 100%;
    }
</style>
