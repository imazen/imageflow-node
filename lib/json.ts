import {
    Decode,
    Encode,
    Constrain,
    ConstrainMode,
    Rotate90,
    Rotate180,
    Rotate270,
    Region,
    RegionPercentage,
    CropWhitespace,
    FillRect,
    ExpandCanvas,
    Direction,
    Watermark,
    WatermarkOption,
    Preset,
    FlipH,
    FlipV,
    ColorFilterSRGB,
    ColorFilterSRGBType,
    ColorFilterSRGBValue,
    ColorFilterSRGBValueType,
    DrawExactImageTo,
    DrawExactImageToCoordinates,
    ConstrainHints,
    CompositingMode,
    CopyRectangle,
    BaseStep,
    IOOperation,
    ReSample,
    CommandString,
} from './types'
import { NativeJob } from './job'

export class Steps {
    private graph: Graph
    private vertex: Array<BaseStep> = []
    private ioID: number
    private inputs: Array<IOOperation> = []
    private outputs: Array<IOOperation> = []
    private last = 0
    private decodeValue: boolean

    constructor(operation: IOOperation = null) {
        this.graph = new Graph()
        this.ioID = 0
        if (operation) {
            operation.setIOID(this.ioID, Direction.in)
            const decode = new Decode(this.ioID)
            this.inputs.push(operation)
            this.vertex.push(decode)
            this.graph.addVertex(0)
            this.last = 0
            this.ioID++
            this.decodeValue = true
        } else {
            this.decodeValue = false
        }
    }

    decode(operation: IOOperation) {
        this.decodeValue = true
        operation.setIOID(this.ioID, Direction.in)
        const decode = new Decode(this.ioID)
        this.inputs.push(operation)
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(decode)
        this.last = this.vertex.length - 1
        this.ioID++
        return this
    }
    constrain(constraint: Constrain): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(constraint)
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }
    constrainWithin(width: number, height: number): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(new Constrain(ConstrainMode.Within, width, height))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    branch(f: (arg: Steps) => any): Steps {
        let last = this.last
        f(this)
        this.last = last
        return this
    }

    drawImageExactTo(
        f: (arg: Steps) => any,
        coordinates: DrawExactImageToCoordinates,
        blend: CompositingMode,
        hint: ConstrainHints
    ) {
        let last = this.last
        f(this)
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(new DrawExactImageTo(coordinates, blend, hint))
        this.graph.addEdge(this.vertex.length - 1, last, 'input')
        this.graph.addEdge(this.vertex.length - 1, this.last, 'canvas')
        this.last = this.vertex.length - 1
        return this
    }

    async execute(): Promise<Object> {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        let job = new NativeJob()
        let files = await Promise.all(
            this.inputs.map(async (ioData) => {
                let file = await ioData.toIOBuffer()
                job.addInputBytes(ioData.ioID, file)
                return ioData.toIOID()
            })
        )
        let outputFile = this.outputs.map((ioData) => {
            job.addOutputBuffer(ioData.ioID)
            return ioData.toIOID()
        })
        let nodes = this.vertex.reduce<{ [key: string]: any }>(
            (acc: object, step: BaseStep, i: number) => {
                acc[i.toString()] = step.toStep()
                acc
                return acc
            },
            {}
        )
        let s = JSON.stringify({
            io: [...files, ...outputFile],
            framewise: {
                graph: {
                    nodes: nodes,
                    edges: this.graph.toEdge(),
                },
            },
        })
        await job.message('v0.1/execute', s)
        let collector = {}
        let buffers = await Promise.all(
            this.outputs.map(async (ioData) => {
                let arrayBuffer = job.getOutputBufferBytes(ioData.ioID)
                return await ioData.toOutput(arrayBuffer, collector)
            })
        )
        return collector
    }
    rotate90(): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(new Rotate90())
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    rotate180(): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(new Rotate180())
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    rotate270(): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(new Rotate270())
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    rotate(rotate: Rotate180 | Rotate270 | Rotate90): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(rotate)
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    region(regionData: Region | RegionPercentage): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(regionData)
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }
    cropWhiteSpace(data: CropWhitespace): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(data)
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    fillRect(data: FillRect): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(data)
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    expandCanvas(data: ExpandCanvas): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(data)
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    flipHorizontal(): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(new FlipH())
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    flipVertical(): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(new FlipV())
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    watermark(operation: IOOperation, watermarkOption: WatermarkOption): Steps {
        operation.setIOID(this.ioID, Direction.in)
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.inputs.push(operation)
        this.vertex.push(new Watermark(this.ioID, watermarkOption))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        this.ioID++
        return this
    }

    encode(operation: IOOperation, decodeData: Preset): Steps {
        operation.setIOID(this.ioID, Direction.out)
        const encoder = new Encode(decodeData, this.ioID)
        this.outputs.push(operation)
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(encoder)
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        this.ioID++
        return this
    }

    colorFilterInvert(): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(new ColorFilterSRGB(ColorFilterSRGBType.Invert))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    colorFilterGrayscaleRY(): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(new ColorFilterSRGB(ColorFilterSRGBType.GrayscaleRY))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    colorFilterGrayscaleBt709(): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(
            new ColorFilterSRGB(ColorFilterSRGBType.GrayscaleBt709)
        )
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    colorFilterGrayscaleFlat(): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(new ColorFilterSRGB(ColorFilterSRGBType.GrayscaleFlat))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    colorFilterGrayscaleNtsc(): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(new ColorFilterSRGB(ColorFilterSRGBType.GrayscaleNtsc))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    colorFilterAlpha(value: number): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(
            new ColorFilterSRGB(
                new ColorFilterSRGBValue(value, ColorFilterSRGBValueType.Alpha)
            )
        )
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    colorFilterBrightness(value: number): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(
            new ColorFilterSRGB(
                new ColorFilterSRGBValue(
                    value,
                    ColorFilterSRGBValueType.Brightness
                )
            )
        )
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    colorFilterContrast(value: number): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(
            new ColorFilterSRGB(
                new ColorFilterSRGBValue(
                    value,
                    ColorFilterSRGBValueType.Contrast
                )
            )
        )
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    colorFilter(value: ColorFilterSRGBValue) {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(new ColorFilterSRGB(value))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }
    copyRectangle(
        f: (args: Steps) => any,
        coordinates: DrawExactImageToCoordinates,
        fromX: number,
        fromY: number
    ) {
        let last = this.last
        f(this)
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(new CopyRectangle(coordinates, fromX, fromY))
        this.graph.addEdge(this.vertex.length - 1, last, 'input')
        this.graph.addEdge(this.vertex.length - 1, this.last, 'canvas')
        this.last = this.vertex.length - 1
        return this
    }
    command(value: string): Steps {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(new CommandString(value))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    async executeCommand(
        commandValue: string,
        input: IOOperation,
        output: IOOperation
    ): Promise<any> {
        let job = new NativeJob()
        const value = await input.toIOBuffer()
        job.addInputBytes(0, value)
        job.addOutputBuffer(1)
        let s = JSON.stringify({
            framewise: {
                steps: [new CommandString(commandValue, 1, 0).toStep()],
            },
        })
        await job.message('v0.1/execute', s)
        let collector = {}
        let buffer = job.getOutputBufferBytes(1)
        await output.toOutput(buffer, collector)
        return collector
    }

    distort(w: number, h: number, hint: ConstrainHints | null = null) {
        if (!this.decodeValue)
            throw new Error('decode must be the first node in graph')
        this.graph.addVertex(this.vertex.length)

        this.vertex.push(new ReSample(w, h, hint))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }
}

interface edge {
    to: number
    type: string
}

class Graph {
    _internal: Map<number, Array<edge>> = new Map()

    addVertex(vertex: number) {
        if (this._internal.has(vertex))
            throw new Error('vertex is already present')
        else this._internal.set(vertex, [])
    }

    addEdge(to: number, from: number, type: string = 'input') {
        if (!this._internal.has(from) || !this._internal.has(to))
            throw new Error('vertex not found in graph')
        this._internal.get(from).push({ to, type })
    }

    toEdge(): Array<Object> {
        let arr = []
        for (const element of this._internal.entries()) {
            for (const i of element[1]) {
                arr.push({
                    to: i.to,
                    from: element[0],
                    kind: i.type,
                })
            }
        }
        return arr
    }
}
