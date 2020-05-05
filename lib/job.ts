import Job, { JobType } from './native'

export class NativeJob {
    private inUse: boolean
    private internalJob: JobType

    constructor() {
        this.inUse = false;
        this.internalJob = new Job();
    }
    addInputBytes(ioId: number, bytes: ArrayBuffer) {
        if (this.inUse) {
            throw new Error("Already running a Job");
        } else {
            this.internalJob.addInputBytesCopied(ioId, bytes)
        }
    }

    getOutputBufferBytes(ioId: number): ArrayBuffer {
        if (this.inUse) {
            throw new Error("Already running a Job");
        } else {
            return this.internalJob.getOutputBufferBytes(ioId)
        }
    }

    addOutputBuffer(ioId: number) {
        if (this.inUse) {
            throw new Error("Already running a Job");
        } else {
            this.internalJob.addOutputBuffer(ioId)
        }
    }

    async message(endPoint: String, tasks: String): Promise<String> {
        if (this.inUse) {
            throw new Error("Already running a Job");
        } else {
            this.inUse = true;
            const response = await this.internalJob.message(endPoint, tasks);
            this.inUse = false;
            return response;
        }
    }

    messageSync(endPoint: String, tasks: String): String {
        if (this.inUse) {
            throw new Error("Already running a Job");
        } else {
            this.inUse = true;
            const response = this.internalJob.messageSync(endPoint, tasks);
            this.inUse = false;
            return response;
        }
    }
}

export { getLongVersionString } from "./native";
