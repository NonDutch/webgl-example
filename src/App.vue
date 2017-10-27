<template>
    <v-app light>
        <v-toolbar fixed app :clipped-left="clipped">
            <v-toolbar-title v-text="title"></v-toolbar-title>
        </v-toolbar>
        <main>
            <v-content>
                <v-container fluid>
                    <canvas ref="testCanvas"></canvas>

                    <input type="file" accept="image/*" @change="fileUpload" ref="fileSelector" style="display: none">

                    Brightness
                    <v-slider v-model="brightness" thumb-label @input="onBrightnessChange" step="10" min="0" max="100"></v-slider>

                    Temperature
                    <v-slider v-model="temperature" thumb-label @input="onTemperatureChange" step="1" min="-20" max="20"></v-slider>



                    <v-btn
                            absolute
                            dark
                            fab
                            bottom
                            right
                            color="pink"
                            style="bottom: 20px"
                            @click="showFileSelector()"
                    >
                        <v-icon>add</v-icon>
                    </v-btn>
                </v-container>
            </v-content>
        </main>
    </v-app>
</template>

<script>
    import VSlider from "vuetify/es5/components/VSlider/VSlider";

    export default {
        components: { VSlider },
        data() {
            return {
                clipped: false,
                drawer: true,
                fixed: false,
                miniVariant: false,
                title: 'Webgl photoshop',
                brightness: 50,
                temperature: 0
            }
        },

        methods: {
            showFileSelector() {
                this.$refs.fileSelector.click();
            },

            onBrightnessChange() {
                const convertedValue = this.brightness/50 - 1;
                this.gl.uniform1f(this.brightnessLocation, parseFloat(convertedValue));
                this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
            },

            onTemperatureChange() {
                this.gl.uniform1f(this.temperatureLocation, parseFloat(this.temperature/100));
                this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
            },

            fileUpload() {
                const reader = new FileReader();
                const canvas = this.$refs.testCanvas;
                reader.readAsDataURL(this.$refs.fileSelector.files[ 0 ]);
                reader.onload = (e) => {
                    const image = new Image();
                    image.src = e.target.result;

                    image.onload = () => {
                        canvas.width = image.naturalWidth;
                        canvas.height = image.naturalHeight;

                        const gl = canvas.getContext('webgl');
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
                    uniform float temperature;

                    void main() {
                        vec4 color = texture2D(textureSampler, texCoords);
                          color.r += temperature;
                          color.rgb += brightness;
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

                        gl.linkProgram(program)

                        gl.useProgram(program);

                        const brightnessLocation = gl.getUniformLocation(program, 'brightness');
                        this.brightnessLocation = brightnessLocation;
                        const temperatureLocation = gl.getUniformLocation(program, 'temperature');
                        this.temperatureLocation = temperatureLocation;

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
