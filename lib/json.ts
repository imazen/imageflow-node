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
} from './types'
import { NativeJob } from './job'

import * as fs from 'fs'

function File(path: string) {}

interface BaseStep {
    toStep(): object | string
}

class Execute {
    private inner: Array<BaseStep>
    private ioData: Array<IOData>
    private ioID: number

    constructor(work: Array<BaseStep>, io: Array<IOData>, ioId: number) {
        this.inner = work
        this.ioData = io
        this.ioID = ioId
    }

    async execute(): Promise<Object> {
        let job = new NativeJob()
        let files = await Promise.all(
            this.ioData.map(async (ioData) => {
                if (ioData.direction == Direction.in) {
                    let file = await fs.promises.readFile(ioData.fileName)
                    job.addInputBytes(
                        ioData.ioID,
                        file.buffer.slice(
                            file.byteOffset,
                            file.byteOffset + file.byteLength
                        )
                    )
                } else job.addOutputBuffer(ioData.ioID)
                return ioData.toIOData()
            })
        )
        let steps = this.inner.map((step) => step.toStep())
        let str = await job.message(
            'v0.1/execute',
            JSON.stringify({
                io: files,
                framewise: {
                    steps: steps,
                },
            })
        )
        let data = this.ioData[this.ioID]
        let arrayBuffer = job.getOutputBufferBytes(data.ioID)
        await fs.promises.writeFile(data.fileName, Buffer.from(arrayBuffer))
        return JSON.parse(str)
    }
}

export class Steps {
    private inner: Array<BaseStep> = []
    private ioID: number
    private ioData: Array<IOData> = []

    get work() {
        return this.inner
    }

    get io() {
        return this.ioData
    }
    constructor(filename: string) {
        this.ioID = 0
        const ioData = new IOData(
            filename,
            Direction.in,
            'placeholder',
            this.ioID
        )
        const decode = new Decode(this.ioID)
        this.ioData.push(ioData)
        this.inner.push(decode)
        this.ioID++
    }
    constraint(constarint: Constraint): Steps {
        this.inner.push(constarint)
        return this
    }
    constraintWithin(width: number, hieght: number): Steps {
        this.inner.push(new Constraint(ConstraintMode.Within, width, hieght))
        return this
    }
    rotate90(): Steps {
        this.inner.push(new Rotate90())
        return this
    }

    rotate180(): Steps {
        this.inner.push(new Rotate180())
        return this
    }

    rotate270(): Steps {
        this.inner.push(new Rotate270())
        return this
    }

    rotate(rotate: Rotate180 | Rotate270 | Rotate90): Steps {
        this.inner.push(rotate)
        return this
    }

    region(regionData: Region | RegionPercentage): Steps {
        this.inner.push(regionData)
        return this
    }
    cropWhiteSpcae(data: CropWhitespace): Steps {
        this.inner.push(data)
        return this
    }

    fillRect(data: FillRect): Steps {
        this.inner.push(data)
        return this
    }

    expandCanvas(data: ExpandCanvas): Steps {
        this.inner.push(data)
        return this
    }

    watermark(fileName: string, watermarkOption: WatermarkOption): Steps {
        const ioData = new IOData(
            fileName,
            Direction.in,
            'placeholder',
            this.ioID
        )
        this.ioData.push(ioData)
        const watermarkData = new Watermark(this.ioID, watermarkOption)
        this.inner.push(watermarkData)
        this.ioID++
        return this
    }

    encode(fileName: string, decodeData: PresetInterface): Execute {
        const ioData = new IOData(
            fileName,
            Direction.out,
            'placeholder',
            this.ioID
        )
        const encoder = new Encode(decodeData, this.ioID)
        this.ioData.push(ioData)
        this.inner.push(encoder)
        return new Execute(this.inner, this.ioData, this.ioID)
    }
}
