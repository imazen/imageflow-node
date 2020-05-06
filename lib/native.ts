const addon = require('../native/index.node')

export interface JobType {
    addInputBytesCopied(ioId: number, bytes: ArrayBuffer): void
    getOutputBufferBytes(ioId: number): ArrayBuffer
    addOutputBuffer(ioId: number): void
    message(endPoint: string, tasks: string): Promise<string>
    messageSync(endPoint: string, tasks: string): string
}

var Job: {
    new (): JobType
} = addon.Job

export default Job

export var getLongVersionString: () => string =
    addon.getLongVersionString
