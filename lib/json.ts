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
    PresetInterface,
    FlipH,
    FlipV,
    ColorFilterSRGB,
    ColorFilterSRGBType,
    ColorFilterSRGBValue,
    ColorFilterSRGBValueType,
    DrawExactImageTo,
    DrawExactImageToCoordinate,
    ConstrainHints,
    CompositingMode,
    CopyRectangle,
    BaseStep,
    IOOperation,
    ReSample,
    Commandstring,
} from './types'
import { NativeJob } from './job'

export class Steps {
    private graph: Graph
    private vertex: Array<BaseStep> = []
    private ioID: number
    private inputs: Array<IOOperation> = []
    private outputs: Array<IOOperation> = []
    private last = 0

    constructor(operation: IOOperation) {
        this.graph = new Graph()
        this.ioID = 0
        operation.setIOID(this.ioID, Direction.in)
        const decode = new Decode(this.ioID)
        this.inputs.push(operation)
        this.vertex.push(decode)
        this.graph.addVertex(0)
        this.last = 0
        this.ioID++
    }

    decode(operation: IOOperation) {
        operation.setIOID(this.ioID, Direction.in)
        const decode = new Decode(this.ioID)
        this.inputs.push(operation)
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(decode)
        this.last = this.vertex.length - 1
        this.ioID++
        return this
    }
    constrain(constarint: Constrain): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(constarint)
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }
    constrainWithin(width: number, hieght: number): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(new Constrain(ConstrainMode.Within, width, hieght))
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

    drawImageExacTo(
        f: (arg: Steps) => any,
        cordinate: DrawExactImageToCoordinate,
        blend: CompositingMode,
        hint: ConstrainHints
    ) {
        let last = this.last
        f(this)
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(new DrawExactImageTo(cordinate, blend, hint))
        this.graph.addEdge(this.vertex.length - 1, last, 'input')
        this.graph.addEdge(this.vertex.length - 1, this.last, 'canvas')
        this.last = this.vertex.length - 1
        return this
    }

    async execute(): Promise<Object> {
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
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(new Rotate90())
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    rotate180(): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(new Rotate180())
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    rotate270(): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(new Rotate270())
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    rotate(rotate: Rotate180 | Rotate270 | Rotate90): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(rotate)
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    region(regionData: Region | RegionPercentage): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(regionData)
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }
    cropWhiteSpcae(data: CropWhitespace): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(data)
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    fillRect(data: FillRect): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(data)
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    expandCanvas(data: ExpandCanvas): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(data)
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    flipHorizontal(): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(new FlipH())
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    flipVertical(): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(new FlipV())
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    watermark(operation: IOOperation, watermarkOption: WatermarkOption): Steps {
        operation.setIOID(this.ioID, Direction.in)
        this.graph.addVertex(this.vertex.length)
        this.inputs.push(operation)
        this.vertex.push(new Watermark(this.ioID, watermarkOption))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        this.ioID++
        return this
    }

    encode(operation: IOOperation, decodeData: PresetInterface): Steps {
        operation.setIOID(this.ioID, Direction.out)
        const encoder = new Encode(decodeData, this.ioID)
        this.outputs.push(operation)
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(encoder)
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        this.ioID++
        return this
    }

    colorFilterIvert(): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(new ColorFilterSRGB(ColorFilterSRGBType.Invert))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    colorFilterGrayscaleRY(): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(new ColorFilterSRGB(ColorFilterSRGBType.GrayscaleRY))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    colorFilterGraycaleBt709(): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(
            new ColorFilterSRGB(ColorFilterSRGBType.GrayscaleBt709)
        )
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    colorFilterGrayscaleFlat(): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(new ColorFilterSRGB(ColorFilterSRGBType.GrayscaleFlat))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    colorFilterGrayscaleNtsc(): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(new ColorFilterSRGB(ColorFilterSRGBType.GrayscaleNtsc))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    colorFilterAlpha(value: number): Steps {
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
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(new ColorFilterSRGB(value))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }
    copyRectangle(
        f: (args: Steps) => any,
        cordinate: DrawExactImageToCoordinate,
        fromX: number,
        fromy: number
    ) {
        let last = this.last
        f(this)
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(new CopyRectangle(cordinate, fromX, fromy))
        this.graph.addEdge(this.vertex.length - 1, last, 'input')
        this.graph.addEdge(this.vertex.length - 1, this.last, 'canvas')
        this.last = this.vertex.length - 1
        return this
    }
    command(value: string) {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(new Commandstring(value))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    distort(w: number, h: number, hint: ConstrainHints | null = null) {
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
            throw new Error('vertext not found in graph')
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
