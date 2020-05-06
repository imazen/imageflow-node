import {
    Decode,
    Encode,
    Constraint,
    ConstraintMode,
    Rotate90,
    Rotate180,
    Rotate270,
    Region,
    RegionPercentage,
    CropWhitespace,
    FillRect,
    ExpandCanvas,
    IOData,
    Direction,
    Watermark,
    WatermarkOption,
    PresetInterface,
    FlipH,
    FlipV,
} from './types'
import { NativeJob } from './job'

import * as fs from 'fs'


interface BaseStep {
    toStep(): object | string
}

export class Steps {
    private graph: Graph
    private vertex: Array<BaseStep> = []
    private ioID: number
    private inputs: Array<IOData> = []
    private outputs: Array<IOData> = []
    private last = 0

    constructor(filename: string) {
        this.graph = new Graph()
        this.ioID = 0
        const ioData = new IOData(
            filename,
            Direction.in,
            'placeholder',
            this.ioID
        )
        const decode = new Decode(this.ioID)
        this.inputs.push(ioData)
        this.vertex.push(decode)
        this.graph.addVertex(0)
        this.last = 0
        this.ioID++
    }
    constraint(constarint: Constraint): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(constarint)
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }
    constraintWithin(width: number, hieght: number): Steps {
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(new Constraint(ConstraintMode.Within, width, hieght))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        return this
    }

    branch(f: (arg: Steps) => any) {
        let last = this.last
        f(this)
        this.last = last
        return this
    }

    async execute(): Promise<Object> {
        let job = new NativeJob()
        let files = await Promise.all(
            this.inputs.map(async (ioData) => {
                let file = await fs.promises.readFile(ioData.fileName)
                job.addInputBytes(ioData.ioID, file.buffer)
                return ioData.toIOData()
            })
        )
        let outputFile = this.outputs.map((ioData) => {
            job.addOutputBuffer(ioData.ioID)
            return ioData.toIOData()
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
        let str = await job.message('v0.1/execute', s)
        this.outputs.forEach((ioData) => {
            let arrayBuffer = job.getOutputBufferBytes(ioData.ioID)
            fs.promises.writeFile(ioData.fileName, Buffer.from(arrayBuffer))
        })
        return JSON.parse(str)
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

    watermark(fileName: string, watermarkOption: WatermarkOption): Steps {
        const ioData = new IOData(
            fileName,
            Direction.in,
            'placeholder',
            this.ioID
        )
        this.graph.addVertex(this.vertex.length)
        this.inputs.push(ioData)
        this.vertex.push(new Watermark(this.ioID, watermarkOption))
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        this.ioID++
        return this
    }

    encode(fileName: string, decodeData: PresetInterface): Steps {
        const ioData = new IOData(
            fileName,
            Direction.out,
            'placeholder',
            this.ioID
        )
        const encoder = new Encode(decodeData, this.ioID)
        this.outputs.push(ioData)
        this.graph.addVertex(this.vertex.length)
        this.vertex.push(encoder)
        this.graph.addEdge(this.vertex.length - 1, this.last)
        this.last = this.vertex.length - 1
        this.ioID++
        return this
    }
}

export class Graph {
    _internal: Map<number, Array<number>> = new Map()

    addVertex(vertex: number) {
        if (this._internal.has(vertex))
            throw new Error('vertex is already present')
        else this._internal.set(vertex, [])
    }

    addEdge(to: number, from: number) {
        if (!this._internal.has(from) || !this._internal.has(to))
            throw new Error('vertext not found in graph')
        this._internal.get(from).push(to)
    }

    toEdge(): Array<Object> {
        let arr = []
        for (const element of this._internal.entries()) {
            for (const i of element[1]) {
                arr.push({
                    to: i,
                    from: element[0],
                    kind: 'input',
                })
            }
        }
        return arr
    }
}
