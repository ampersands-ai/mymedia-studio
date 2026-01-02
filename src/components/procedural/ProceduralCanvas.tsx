/// <reference types="@webgpu/types" />
import { forwardRef, useEffect, useRef, useState, useImperativeHandle } from 'react';
import { ShaderParams } from '@/types/procedural-background';
import { Canvas2DFallback } from './Canvas2DFallback';

interface ProceduralCanvasProps {
  params: ShaderParams;
}

// Vertex shader for instanced cubes
const vertexShaderCode = /* wgsl */`
struct Uniforms {
  viewProjectionMatrix: mat4x4<f32>,
  time: f32,
  cameraSpeed: f32,
  metallic: f32,
  padding: f32,
  colorPrimary: vec4<f32>,
  colorSecondary: vec4<f32>,
  backgroundColor: vec4<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) instanceColor: vec4<f32>,
}

@vertex
fn main(
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) instancePos: vec3<f32>,
  @location(3) instanceScale: f32,
  @location(4) instanceColorMix: f32,
  @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
  var output: VertexOutput;
  
  // Animate instance position
  let time = uniforms.time * uniforms.cameraSpeed;
  let animOffset = f32(instanceIndex) * 0.01;
  
  // Rotation based on time
  let angle = time + animOffset;
  let cosA = cos(angle);
  let sinA = sin(angle);
  
  // Rotate the vertex position
  var rotatedPos = position;
  rotatedPos.x = position.x * cosA - position.z * sinA;
  rotatedPos.z = position.x * sinA + position.z * cosA;
  
  // Scale and translate
  let worldPos = rotatedPos * instanceScale + instancePos;
  
  // Add some floating animation
  let floatOffset = sin(time * 2.0 + animOffset * 10.0) * 0.3;
  var finalPos = worldPos;
  finalPos.y += floatOffset;
  
  output.position = uniforms.viewProjectionMatrix * vec4<f32>(finalPos, 1.0);
  output.worldPos = finalPos;
  output.normal = normal;
  output.instanceColor = mix(uniforms.colorPrimary, uniforms.colorSecondary, instanceColorMix);
  
  return output;
}
`;

// Fragment shader with metallic lighting
const fragmentShaderCode = /* wgsl */`
struct Uniforms {
  viewProjectionMatrix: mat4x4<f32>,
  time: f32,
  cameraSpeed: f32,
  metallic: f32,
  padding: f32,
  colorPrimary: vec4<f32>,
  colorSecondary: vec4<f32>,
  backgroundColor: vec4<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn main(
  @location(0) worldPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) instanceColor: vec4<f32>
) -> @location(0) vec4<f32> {
  // Simple directional lighting
  let lightDir = normalize(vec3<f32>(0.5, 1.0, 0.5));
  let viewDir = normalize(-worldPos);
  let halfDir = normalize(lightDir + viewDir);
  
  // Diffuse
  let diffuse = max(dot(normal, lightDir), 0.0);
  
  // Specular (Blinn-Phong)
  let specular = pow(max(dot(normal, halfDir), 0.0), 64.0 * uniforms.metallic);
  
  // Fresnel effect for metallic look
  let fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0) * uniforms.metallic;
  
  // Combine lighting
  let ambient = 0.15;
  let lighting = ambient + diffuse * 0.6 + specular * 0.8 + fresnel * 0.3;
  
  // Apply lighting to color
  var finalColor = instanceColor.rgb * lighting;
  
  // Add metallic reflection
  let reflectionColor = vec3<f32>(1.0, 0.95, 0.9);
  finalColor = mix(finalColor, reflectionColor, specular * uniforms.metallic * 0.5);
  
  return vec4<f32>(finalColor, 1.0);
}
`;

// Helper to convert hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ];
  }
  return [0.5, 0.5, 0.5];
}

// Generate cube vertices
function generateCubeVertices(): { vertices: Float32Array; indices: Uint16Array } {
  const size = 0.5;
  const vertices = new Float32Array([
    // Front face
    -size, -size,  size,  0,  0,  1,
     size, -size,  size,  0,  0,  1,
     size,  size,  size,  0,  0,  1,
    -size,  size,  size,  0,  0,  1,
    // Back face
    -size, -size, -size,  0,  0, -1,
    -size,  size, -size,  0,  0, -1,
     size,  size, -size,  0,  0, -1,
     size, -size, -size,  0,  0, -1,
    // Top face
    -size,  size, -size,  0,  1,  0,
    -size,  size,  size,  0,  1,  0,
     size,  size,  size,  0,  1,  0,
     size,  size, -size,  0,  1,  0,
    // Bottom face
    -size, -size, -size,  0, -1,  0,
     size, -size, -size,  0, -1,  0,
     size, -size,  size,  0, -1,  0,
    -size, -size,  size,  0, -1,  0,
    // Right face
     size, -size, -size,  1,  0,  0,
     size,  size, -size,  1,  0,  0,
     size,  size,  size,  1,  0,  0,
     size, -size,  size,  1,  0,  0,
    // Left face
    -size, -size, -size, -1,  0,  0,
    -size, -size,  size, -1,  0,  0,
    -size,  size,  size, -1,  0,  0,
    -size,  size, -size, -1,  0,  0,
  ]);

  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3,       // Front
    4, 5, 6, 4, 6, 7,       // Back
    8, 9, 10, 8, 10, 11,    // Top
    12, 13, 14, 12, 14, 15, // Bottom
    16, 17, 18, 16, 18, 19, // Right
    20, 21, 22, 20, 22, 23, // Left
  ]);

  return { vertices, indices };
}

// Generate instance data based on arrangement
function generateInstanceData(
  count: number,
  arrangement: ShaderParams['arrangement']
): Float32Array {
  const data = new Float32Array(count * 5); // x, y, z, scale, colorMix
  
  for (let i = 0; i < count; i++) {
    const offset = i * 5;
    let x = 0, y = 0, z = 0;
    
    switch (arrangement) {
      case 'radial': {
        const rings = Math.sqrt(count);
        const ring = Math.floor(i / rings);
        const angleIndex = i % rings;
        const angle = (angleIndex / rings) * Math.PI * 2;
        const radius = (ring / rings) * 50;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
        y = (Math.random() - 0.5) * 30;
        break;
      }
      case 'spiral': {
        const t = i / count;
        const spiralAngle = t * Math.PI * 20;
        const spiralRadius = t * 60;
        x = Math.cos(spiralAngle) * spiralRadius;
        z = Math.sin(spiralAngle) * spiralRadius;
        y = (t - 0.5) * 80;
        break;
      }
      case 'grid': {
        const gridSize = Math.cbrt(count);
        const xi = i % gridSize;
        const yi = Math.floor(i / gridSize) % gridSize;
        const zi = Math.floor(i / (gridSize * gridSize));
        const spacing = 5;
        x = (xi - gridSize / 2) * spacing;
        y = (yi - gridSize / 2) * spacing;
        z = (zi - gridSize / 2) * spacing;
        break;
      }
      case 'wave': {
        const waveRows = Math.sqrt(count);
        const row = Math.floor(i / waveRows);
        const col = i % waveRows;
        const spacing = 4;
        x = (col - waveRows / 2) * spacing;
        z = (row - waveRows / 2) * spacing;
        y = Math.sin(col * 0.3) * Math.cos(row * 0.3) * 10;
        break;
      }
    }
    
    data[offset] = x;
    data[offset + 1] = y;
    data[offset + 2] = z - 30; // Push back from camera
    data[offset + 3] = 0.3 + Math.random() * 0.5; // Scale
    data[offset + 4] = Math.random(); // Color mix
  }
  
  return data;
}

// Create view-projection matrix
function createViewProjectionMatrix(width: number, height: number, time: number, cameraSpeed: number): Float32Array {
  const aspect = width / height;
  const fov = Math.PI / 3;
  const near = 0.1;
  const far = 1000;
  
  // Perspective matrix
  const f = 1 / Math.tan(fov / 2);
  const rangeInv = 1 / (near - far);
  
  // Camera orbit
  const cameraAngle = time * cameraSpeed * 0.5;
  const cameraRadius = 40;
  const cameraX = Math.sin(cameraAngle) * cameraRadius;
  const cameraZ = Math.cos(cameraAngle) * cameraRadius;
  const cameraY = Math.sin(time * cameraSpeed * 0.3) * 10 + 10;
  
  // Simple look-at matrix (looking at origin)
  const forward = [
    -cameraX / cameraRadius,
    -cameraY / Math.sqrt(cameraX * cameraX + cameraY * cameraY + cameraZ * cameraZ),
    -cameraZ / cameraRadius,
  ];
  const right = [forward[2], 0, -forward[0]];
  const up = [
    forward[1] * right[2] - forward[2] * right[1],
    forward[2] * right[0] - forward[0] * right[2],
    forward[0] * right[1] - forward[1] * right[0],
  ];
  
  // Combined view-projection matrix (simplified)
  const viewProj = new Float32Array([
    f / aspect * right[0], f * up[0], forward[0] * (far + near) * rangeInv, forward[0],
    f / aspect * right[1], f * up[1], forward[1] * (far + near) * rangeInv, forward[1],
    f / aspect * right[2], f * up[2], forward[2] * (far + near) * rangeInv, forward[2],
    -f / aspect * (right[0] * cameraX + right[1] * cameraY + right[2] * cameraZ),
    -f * (up[0] * cameraX + up[1] * cameraY + up[2] * cameraZ),
    (2 * far * near * rangeInv) - forward[0] * cameraX - forward[1] * cameraY - forward[2] * cameraZ,
    -(forward[0] * cameraX + forward[1] * cameraY + forward[2] * cameraZ),
  ]);
  
  return viewProj;
}

export const ProceduralCanvas = forwardRef<HTMLCanvasElement, ProceduralCanvasProps>(
  ({ params }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isWebGPUSupported, setIsWebGPUSupported] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const contextRef = useRef<{
      device: GPUDevice;
      context: GPUCanvasContext;
      pipeline: GPURenderPipeline;
      uniformBuffer: GPUBuffer;
      uniformBindGroup: GPUBindGroup;
      vertexBuffer: GPUBuffer;
      indexBuffer: GPUBuffer;
      instanceBuffer: GPUBuffer;
      indexCount: number;
      instanceCount: number;
    } | null>(null);
    const animationFrameRef = useRef<number>(0);
    const startTimeRef = useRef<number>(Date.now());
    const paramsRef = useRef(params);

    // Update params ref when params change
    useEffect(() => {
      paramsRef.current = params;
    }, [params]);

    // Expose canvas ref to parent
    useImperativeHandle(ref, () => canvasRef.current!);

    // Initialize WebGPU
    useEffect(() => {
      const initWebGPU = async () => {
        if (!navigator.gpu) {
          setIsWebGPUSupported(false);
          return;
        }

        setIsWebGPUSupported(true);

        try {
          const adapter = await navigator.gpu.requestAdapter();
          if (!adapter) {
            throw new Error('No GPU adapter found');
          }

          const device = await adapter.requestDevice();
          const canvas = canvasRef.current!;
          const context = canvas.getContext('webgpu')!;

          const format = navigator.gpu.getPreferredCanvasFormat();
          context.configure({
            device,
            format,
            alphaMode: 'premultiplied',
          });

          // Create shaders
          const vertexModule = device.createShaderModule({
            code: vertexShaderCode,
          });
          const fragmentModule = device.createShaderModule({
            code: fragmentShaderCode,
          });

          // Create uniform buffer
          const uniformBufferSize = 64 + 16 + 16 + 16 + 16; // mat4 + 4 floats + vec4 * 3
          const uniformBuffer = device.createBuffer({
            size: uniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
          });

          // Create bind group layout
          const bindGroupLayout = device.createBindGroupLayout({
            entries: [{
              binding: 0,
              visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
              buffer: { type: 'uniform' },
            }],
          });

          // Create bind group
          const uniformBindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{
              binding: 0,
              resource: { buffer: uniformBuffer },
            }],
          });

          // Create pipeline
          const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout],
          });

          const pipeline = device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
              module: vertexModule,
              entryPoint: 'main',
              buffers: [
                {
                  // Vertex buffer
                  arrayStride: 24, // 6 floats
                  stepMode: 'vertex',
                  attributes: [
                    { shaderLocation: 0, offset: 0, format: 'float32x3' }, // position
                    { shaderLocation: 1, offset: 12, format: 'float32x3' }, // normal
                  ],
                },
                {
                  // Instance buffer
                  arrayStride: 20, // 5 floats
                  stepMode: 'instance',
                  attributes: [
                    { shaderLocation: 2, offset: 0, format: 'float32x3' }, // instancePos
                    { shaderLocation: 3, offset: 12, format: 'float32' }, // instanceScale
                    { shaderLocation: 4, offset: 16, format: 'float32' }, // instanceColorMix
                  ],
                },
              ],
            },
            fragment: {
              module: fragmentModule,
              entryPoint: 'main',
              targets: [{ format }],
            },
            primitive: {
              topology: 'triangle-list',
              cullMode: 'back',
            },
            depthStencil: {
              format: 'depth24plus',
              depthWriteEnabled: true,
              depthCompare: 'less',
            },
          });

          // Create geometry buffers
          const { vertices, indices } = generateCubeVertices();
          
          const vertexBuffer = device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
          });
          device.queue.writeBuffer(vertexBuffer, 0, vertices.buffer);

          const indexBuffer = device.createBuffer({
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
          });
          device.queue.writeBuffer(indexBuffer, 0, indices.buffer);

          // Create instance buffer
          const instanceData = generateInstanceData(params.instanceCount, params.arrangement);
          const instanceBuffer = device.createBuffer({
            size: instanceData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
          });
          device.queue.writeBuffer(instanceBuffer, 0, instanceData.buffer);

          contextRef.current = {
            device,
            context,
            pipeline,
            uniformBuffer,
            uniformBindGroup,
            vertexBuffer,
            indexBuffer,
            instanceBuffer,
            indexCount: indices.length,
            instanceCount: params.instanceCount,
          };

          startTimeRef.current = Date.now();
        } catch (e) {
          console.error('WebGPU initialization failed:', e);
          setError((e as Error).message);
        }
      };

      initWebGPU();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, []);

    // Update instance buffer when arrangement or count changes
    useEffect(() => {
      if (!contextRef.current) return;

      const { device } = contextRef.current;
      const instanceData = generateInstanceData(params.instanceCount, params.arrangement);
      
      // Recreate instance buffer if size changed
      if (instanceData.byteLength !== contextRef.current.instanceBuffer.size) {
        contextRef.current.instanceBuffer.destroy();
        contextRef.current.instanceBuffer = device.createBuffer({
          size: instanceData.byteLength,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
      }
      
      device.queue.writeBuffer(contextRef.current.instanceBuffer, 0, instanceData.buffer);
      contextRef.current.instanceCount = params.instanceCount;
    }, [params.instanceCount, params.arrangement]);

    // Render loop
    useEffect(() => {
      if (!contextRef.current || !canvasRef.current) return;

      const render = () => {
        if (!contextRef.current || !canvasRef.current) return;

        const { device, context, pipeline, uniformBuffer, uniformBindGroup, vertexBuffer, indexBuffer, instanceBuffer, indexCount, instanceCount } = contextRef.current;
        const canvas = canvasRef.current;
        const currentParams = paramsRef.current;

        // Update canvas size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;

        // Update uniforms
        const time = (Date.now() - startTimeRef.current) / 1000;
        const viewProjectionMatrix = createViewProjectionMatrix(canvas.width, canvas.height, time, currentParams.cameraSpeed);
        
        const primaryColor = hexToRgb(currentParams.colorPrimary);
        const secondaryColor = hexToRgb(currentParams.colorSecondary);
        const bgColor = hexToRgb(currentParams.backgroundColor);

        const uniformData = new Float32Array([
          ...viewProjectionMatrix,
          time,
          currentParams.cameraSpeed,
          currentParams.metallic,
          0, // padding
          ...primaryColor, 1,
          ...secondaryColor, 1,
          ...bgColor, 1,
        ]);
        device.queue.writeBuffer(uniformBuffer, 0, uniformData);

        // Create depth texture
        const depthTexture = device.createTexture({
          size: [canvas.width, canvas.height],
          format: 'depth24plus',
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });

        const commandEncoder = device.createCommandEncoder();
        const renderPass = commandEncoder.beginRenderPass({
          colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            clearValue: { r: bgColor[0], g: bgColor[1], b: bgColor[2], a: 1 },
            loadOp: 'clear',
            storeOp: 'store',
          }],
          depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
          },
        });

        renderPass.setPipeline(pipeline);
        renderPass.setBindGroup(0, uniformBindGroup);
        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.setVertexBuffer(1, instanceBuffer);
        renderPass.setIndexBuffer(indexBuffer, 'uint16');
        renderPass.drawIndexed(indexCount, instanceCount);
        renderPass.end();

        device.queue.submit([commandEncoder.finish()]);
        depthTexture.destroy();

        animationFrameRef.current = requestAnimationFrame(render);
      };

      animationFrameRef.current = requestAnimationFrame(render);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [isWebGPUSupported]);

    if (isWebGPUSupported === null) {
      return (
        <div className="flex h-full items-center justify-center bg-background">
          <div className="animate-pulse text-muted-foreground">Initializing...</div>
        </div>
      );
    }

    if (!isWebGPUSupported || error) {
      // Use Canvas2D fallback instead of just showing an error message
      return (
        <div className="relative h-full w-full">
          <canvas
            ref={canvasRef}
            className="h-full w-full"
            style={{ backgroundColor: params.backgroundColor }}
          />
          <Canvas2DFallback params={params} canvasRef={canvasRef} />
          <div className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground">
            2D Mode (WebGPU unavailable)
          </div>
        </div>
      );
    }

    return (
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ backgroundColor: params.backgroundColor }}
      />
    );
  }
);

ProceduralCanvas.displayName = 'ProceduralCanvas';
