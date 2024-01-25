// const vertexShader = `

// uniform float time;
// uniform float uProgress;
// uniform float uSpeed;
// uniform float roundMedia;

// uniform vec2 uResolution;
// uniform vec2 uQuadSize;
// uniform vec4 uCorners;
// uniform vec2 uPosition;
// varying vec2 vSize;

// varying vec2 vUv;
// varying vec2 vResolution;

// void main() {
//     float sine = sin(PI * uProgress);
//     float waves = sine * 8.0 * sin(50.0 * length(uv) + 15.0 * uProgress);
//     vUv = uv;
//     vec3 pos = position;

//     if (roundMedia == 1.0) {
//          pos.z += sin(PI * vUv.x) * 0.1;
//     }

//     vec4 defaultState = modelMatrix * vec4(pos, 1.0);
//     vec4 endState = vec4(pos, 1.0);

//     endState.x *= uResolution.x;
//     endState.y *= uResolution.y;
//     endState.z += uCorners.x;

//     float cornersProgress = mix(
//         mix(uCorners.x, uCorners.y, waves),
//         mix(uCorners.z, uCorners.w, waves),
//         uv.y
//     );

//     vec4 finalState = mix(defaultState, endState, cornersProgress);

//     vSize = mix(uQuadSize, uResolution, cornersProgress);

//     gl_Position = projectionMatrix * viewMatrix * finalState;
// }

// `;

const vertexShader = `
    uniform float time;
    uniform float uProgress;
    uniform float uSpeed;
    uniform float roundMedia;
    uniform vec2 uResolution;
    uniform vec2 uQuadSize;
    uniform vec4 uCorners;
    uniform vec2 uPosition;

    varying vec2 vSize;
    varying vec2 vUv;
    varying vec2 vResolution;

    void main()
    {
        vUv = uv;

        vec4 pos = modelMatrix * vec4(position, 1.0);
        float curvature = 0.5; // Adjust this value to change the amount of curvature

        pos.z += sin(PI * vUv.x) * 0.5;

        float cornersProgress = mix(
            mix(uCorners.x, uCorners.y, 1.0),
            mix(uCorners.z, uCorners.w, 1.0),
            vUv.y
        );

        vSize = mix(uQuadSize, uResolution, cornersProgress);

        gl_Position = projectionMatrix * viewMatrix * pos;
    }
`;

export default vertexShader;
