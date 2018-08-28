function v2(x, y) {
	return { type: "v2", value: new THREE.Vector2(x, y) };
}

class ShaderVariable {
	constructor(program) {
		this.program = program;

		this.buffer = new THREE.WebGLRenderTarget(program.width, program.height, {
			minFilter: THREE.LinearFilter,
			stencilBuffer: false,
			depthBuffer: false,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
		});
	}

	get rawData() {
		const { width, height } = this.buffer;

		const data = new Float32Array(width * height * 4);
		this.program.renderer.readRenderTargetPixels(this.buffer, 0, 0, width, height, data);

		return data;
	}
}

class ShaderFunction {
	constructor(program, file, constants = {}, variables = {}, output = undefined) {
		if ( output && !(output instanceof ShaderVariable) ) {
			throw new Error("Output to a ShaderFunction must either be undefined or a ShaderVariable");
		}

		this.program = program;
		this.scene = new THREE.Scene();
		this.file = file;

		this.constants = constants;
		this.variables = variables;
		this.output = output;

		this.uniforms = {};

		this._updateUniforms();
		this._loadShaders();
	}

	_loadShaders() {
		this._material = new THREE.ShaderMaterial({
			uniforms: this.uniforms,
			vertexShader: shaders['terrain/fallthrough.vert'],
			fragmentShader: shaders[this.file]
		});

		// const square = new Float32Array([
		// 	-1.0, -1.0,  1.0,
		// 	 1.0, -1.0,  1.0,
		// 	 1.0,  1.0,  1.0,

		// 	 1.0,  1.0,  1.0,
		// 	-1.0,  1.0,  1.0,
		// 	-1.0, -1.0,  1.0
		// ]);

		// const geometry = new THREE.BufferGeometry();
		// geometry.addAttribute('position', new THREE.BufferAttribute(square, 3));
		this._mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.program.width, this.program.height, this.program.width, this.program.height), this._material);
		this.scene.add(this._mesh);
	}

	_updateUniforms() {
		for ( const variable in this.variables ) {
			if ( !(this.variables[variable] instanceof ShaderVariable ) ) {
				throw new Error(variable + " must be a ShaderVariable");
			}

			const texture = this.variables[variable].buffer.texture;
			this.uniforms[variable] = { type: 't', value: texture };
		}

		for ( const constant in this.constants ) {
			const value = this.constants[constant];
			this.uniforms[constant] = value;
		}
	}

	render() {
		this._updateUniforms();

		if ( this.output ) {
			this.program.renderer.render(this.scene, this.program.camera, this.output.buffer);
		}
		else {
			this.program.renderer.render(this.scene, this.program.camera);
		}
	}
}

class ShaderProgram {
	constructor() {
		this._abstractCheck();

		this.camera = new THREE.Camera();
		this.camera.position.z = 1;

		this.width = 128;
		this.height = 128;

		this.initRenderer();
	}

	_abstractCheck() {
		if ( this.constructor.name == "ShaderProgram" ) {
			throw new Error("ShaderProgram is an abstract class, subclass it.");
		}
	}

	initRenderer() {
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize(this.width, this.height);

		this.container = document.getElementById('container');
		this.container.appendChild(this.renderer.domElement);
	}

	start() {
		this.frame();
	}

	frame() {
		this._abstractCheck();

		window.requestAnimationFrame(() => {
			this.frame();
		});
	}
}