import { toOkLab } from "../palette"
import shader from "./shader.wgsl?raw"
import type { BackgroundFrame, BackgroundRenderer } from "./types"

const uniformUsage = 0x0040 | 0x0008

interface GpuBuffer {
	destroy(): void
}

interface GpuPass {
	setPipeline(pipeline: unknown): void
	setBindGroup(index: number, bindGroup: unknown): void
	draw(vertexCount: number, instanceCount?: number): void
	end(): void
}

interface GpuDevice {
	queue: {
		writeBuffer(buffer: GpuBuffer, offset: number, data: Float32Array): void
		submit(commands: unknown[]): void
	}
	lost: Promise<{ message: string }>
	createBuffer(descriptor: { size: number; usage: number }): GpuBuffer
	createShaderModule(descriptor: { code: string }): {
		getCompilationInfo(): Promise<{
			messages: Array<{ type: string; message: string }>
		}>
	}
	createRenderPipeline(descriptor: unknown): {
		getBindGroupLayout(index: number): unknown
	}
	createBindGroup(descriptor: unknown): unknown
	createCommandEncoder(): {
		beginRenderPass(descriptor: unknown): GpuPass
		finish(): unknown
	}
	destroy(): void
}

interface GpuAdapter {
	requestDevice(): Promise<GpuDevice>
}

interface GpuApi {
	requestAdapter(): Promise<GpuAdapter | null>
	getPreferredCanvasFormat(): string
}

interface GpuCanvasContext {
	configure(options: {
		device: GpuDevice
		format: string
		alphaMode: "opaque"
	}): void
	getCurrentTexture(): { createView(): unknown }
	unconfigure(): void
}

export async function createWebGpuRenderer(
	canvas: HTMLCanvasElement,
	onDeviceLost: () => void,
): Promise<BackgroundRenderer | null> {
	let device: GpuDevice | null = null
	let context: GpuCanvasContext | null = null
	let uniformBuffer: GpuBuffer | null = null
	try {
		const gpu = (navigator as unknown as { gpu?: GpuApi }).gpu
		if (!gpu) {
			console.info("[background renderer] WebGPU API unavailable; using CPU")
			return null
		}
		const adapter = await gpu.requestAdapter()
		if (!adapter) {
			console.info("[background renderer] no WebGPU adapter; using CPU")
			return null
		}
		device = await adapter.requestDevice()
		const rawContext = (canvas.getContext as (kind: string) => unknown).call(
			canvas,
			"webgpu",
		)
		if (!rawContext) {
			device.destroy()
			return null
		}
		context = rawContext as GpuCanvasContext
		const format = gpu.getPreferredCanvasFormat()
		context.configure({ device, format, alphaMode: "opaque" })

		const shaderModule = device.createShaderModule({ code: shader })
		const compilation = await shaderModule.getCompilationInfo()
		const shaderErrors = compilation.messages.filter(
			(message) => message.type === "error",
		)
		if (shaderErrors.length) {
			throw new Error(shaderErrors.map((message) => message.message).join("\n"))
		}
		const pipeline = device.createRenderPipeline({
			layout: "auto",
			vertex: { module: shaderModule, entryPoint: "vertexMain" },
			fragment: {
				module: shaderModule,
				entryPoint: "fragmentMain",
				targets: [{ format }],
			},
			primitive: { topology: "triangle-list" },
		})
		uniformBuffer = device.createBuffer({ size: 80, usage: uniformUsage })
		const bindGroup = device.createBindGroup({
			layout: pipeline.getBindGroupLayout(0),
			entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
		})
		const activeDevice = device
		const activeContext = context
		const activeBuffer = uniformBuffer
		let disposed = false
		void device.lost.then(() => {
			if (!disposed) onDeviceLost()
		})

		return {
			render(frame: BackgroundFrame) {
				if (canvas.width !== frame.width || canvas.height !== frame.height) {
					canvas.width = frame.width
					canvas.height = frame.height
				}
				const dominant = toOkLab(frame.palette.dominant)
				const accent = toOkLab(frame.palette.accent)
				const uniforms = new Float32Array([
					frame.width,
					frame.height,
					frame.time,
					frame.beat,
					frame.random[0],
					frame.random[1],
					frame.angleJitter,
					0,
					...frame.flowParams,
					dominant[0],
					dominant[1],
					dominant[2],
					Math.max(dominant[0], accent[0]),
					accent[0],
					accent[1],
					accent[2],
					0,
				])
				activeDevice.queue.writeBuffer(activeBuffer, 0, uniforms)
				const encoder = activeDevice.createCommandEncoder()
				const pass = encoder.beginRenderPass({
					colorAttachments: [
						{
							view: activeContext.getCurrentTexture().createView(),
							clearValue: { r: 0, g: 0, b: 0, a: 1 },
							loadOp: "clear",
							storeOp: "store",
						},
					],
				})
				pass.setPipeline(pipeline)
				pass.setBindGroup(0, bindGroup)
				pass.draw(3, 1)
				pass.end()
				activeDevice.queue.submit([encoder.finish()])
			},
			dispose() {
				disposed = true
				activeContext.unconfigure()
				activeBuffer.destroy()
				activeDevice.destroy()
			},
		}
	} catch (error) {
		console.warn("[background renderer] WebGPU unavailable; using CPU", error)
		uniformBuffer?.destroy()
		context?.unconfigure()
		device?.destroy()
		return null
	}
}
