const addon = require("../native/index.node")

export interface JobType {
    addInputBytesCopied(ioId: number, bytes: ArrayBuffer): void
    getOutputBufferBytes(ioId: number): ArrayBuffer
    addOutputBuffer(ioId: number): void
    message(endPoint: String, tasks: String): Promise<String>
    messageSync(endPoint: String, tasks: String): String
}

var Job: {
    new(): JobType
} = addon.Job

export default Job;

export var getLongVersionString: () => String = addon.getLongVersionString
