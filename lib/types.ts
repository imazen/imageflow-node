import * as fs from 'fs'
import * as stream from 'stream'
import axios, { AxiosResponse } from 'axios'
const str = require('stream-promise')

export enum Direction {
    in = 'in',
    out = 'out',
}

export class IOData {
    private readonly io_id: number
    fileName: string
    direction: Direction
    io: string
    get ioID() {
        return this.io_id
    }

    toIOData(): Object {
        return {
            io_id: this.io_id,
            direction: this.direction,
            io: this.io,
        }
    }

    constructor(
        filename: string,
        direction: Direction,
        io: string,
        ioID: number
    ) {
        this.direction = direction
        this.io = io
        this.io_id = ioID
        this.fileName = filename
    }
}

export abstract class BaseStep {
    abstract toStep(): Object | string
}

export class Decode implements BaseStep {
    private readonly io_id: number

    toStep(): Object {
        return {
            decode: {
                io_id: this.io_id,
            },
        }
    }
    get ioID() {
        return this.io_id
    }
    constructor(ioID: number) {
        this.io_id = ioID
    }
}

abstract class Preset {
    abstract toPreset(): Object | string
}

export class GIF implements Preset {
    toPreset(): string {
        return 'gif'
    }
}

export class MozJPEG implements Preset {
    private readonly quality: number
    private readonly isProgressive: boolean
    toPreset(): Object {
        return {
            mozjpeg: {
                quality: this.quality,
                progressive: this.isProgressive,
            },
        }
    }

    constructor(quality: number, isProgressive: boolean) {
        if (quality > 100 || quality < 0)
            throw new Error('invalid quality for preset')
        this.isProgressive = isProgressive
        this.quality = quality
    }
}

export class LosslessPNG implements Preset {
    private readonly maximumDeflate: boolean
    toPreset(): Object {
        return {
            lodepng: {
                maximum_deflate: this.maximumDeflate,
            },
        }
    }

    constructor(maximumDeflate: boolean = false) {
        this.maximumDeflate = maximumDeflate
    }
}

export class LossyPNG implements Preset {
    private readonly quality: number
    private readonly minimumQuality: number
    private readonly speed: number | null
    private readonly maxDeflate: boolean
    toPreset(): Object {
        return {
            pngquant: {
                quality: this.quality,
                minimum_quality: this.minimumQuality,
                speed: this.speed,
                maximum_deflate: this.maxDeflate,
            },
        }
    }
    constructor(
        quality: number,
        minQuality: number,
        speed: number | null = null,
        maxdeflate: boolean = false
    ) {
        if (quality > 100 || quality < 0)
            throw new Error('invalid quality for preset')
        if (minQuality > 100 || minQuality < 0)
            throw new Error('invalid minimum quality for preset')
        if (speed != null && (speed > 10 || speed < 0))
            throw new Error('invalid speed for preset')
        this.quality = quality
        this.maxDeflate = maxdeflate
        this.speed = speed
        this.minimumQuality = minQuality
    }
}

export class WebP implements Preset {
    private readonly quality: number
    toPreset(): Object {
        return {
            webplossy: {
                quality: this.quality,
            },
        }
    }
    constructor(quality: number) {
        if (quality > 100 || quality < 0)
            throw new Error('invalid quality for preset')
        this.quality = quality
    }
}

export class WebPLossless implements Preset {
    toPreset(): string {
        return 'webplossless'
    }
}

export interface PresetInterface {
    toPreset(): Object | string
}

export class Encode implements BaseStep {
    private preset: PresetInterface
    private readonly io_id: number
    toStep(): Object {
        return {
            encode: {
                io_id: this.io_id,
                preset: this.preset.toPreset(),
            },
        }
    }

    constructor(preset: PresetInterface, ioId: number) {
        this.io_id = ioId
        this.preset = preset
    }
}

enum Filter {
    RobidouxFast = 'robindoux_fast',
    Robidoux = 'robindoux',
    RobidouxSharp = 'robindoux_sharp',
    Ginseng = 'ginseng',
    GinsengSharp = 'ginseng_sharp',
    Lanczos = 'lanczos',
    LanczosSharp = 'lanczos_sharp',
    Lanczos2 = 'lanczos_2',
    Lanczos2Sharp = 'lanczos_2_sharp',
    CubicFast = 'cubic_fast',
    Cubic = 'cubic',
    CubicSharp = 'cubic_sharp',
    CatmullRom = 'catmull_rom',
    Mitchell = 'mitchell',

    CubicBSpline = 'cubic_B_spline',
    Hermite = 'hermite',
    Jinc = 'jinc',
    RawLanczos3 = 'raw_lanczos_3',
    RawLanczos3Sharp = 'raw_lanczos_3_sharp',
    RawLanczos2 = 'raw_lanczos_2',
    RawLanczos2Sharp = 'raw_lanczos_2_sharp',
    Triangle = 'triangle',
    Linear = 'linear',
    Box = 'box',
    CatmullRomFast = 'catmull_rom_fast',
    CatmullRomFastSharp = 'catmull_rom_fast_sharp',

    Fastest = 'fastest',

    MitchellFast = 'mitchell_fast',
    NCubic = 'n_cubic',
    NCubicSharp = 'n_cubic_sharp',
}

enum ResampleWhen {
    SizeDiffers = 'size_differs',
    SizeDiffersOrSharpeningRequested = 'size_differs_or_sharpening_requested',
    Always = 'always',
}

enum SharpenWhen {
    Downscaling = 'downscaling',
    Upscaling = 'upscaling',
    SizeDiffers = 'size_differs',
    Always = 'always',
}

enum ScalingFloatspace {
    Srgb = 'srgb',
    Linear = 'linear',
}

interface ConstraintHintsOptions {
    downFilter?: Filter
    upFilter?: Filter
    scalingColorScape?: ScalingFloatspace
    resampleWhen?: ResampleWhen
    sharpenWhen?: SharpenWhen
}

export class ConstraintHints {
    private readonly sharpenPercent: number
    private downFilter: Filter | null
    private upFilter: Filter | null
    private scalingColorSpace: ScalingFloatspace | null
    private resampleWhen: ResampleWhen | null
    private sharpenWhen: SharpenWhen | null
    toHint(): Object {
        return {
            sharpen_percent: this.sharpenPercent,
            down_filter: this.downFilter?.toString()?.toLowerCase(),
            up_filter: this.upFilter?.toString()?.toLowerCase(),
            scaling_colorspace: this.scalingColorSpace
                ?.toString()
                .toLowerCase(),
            resample_when: this.resampleWhen?.toString(),
            sharpen_when: this.sharpenWhen?.toString(),
        }
    }
    constructor(
        sharpenPercent: number,
        {
            downFilter,
            upFilter,
            scalingColorScape,
            resampleWhen,
            sharpenWhen,
        }: ConstraintHintsOptions = {}
    ) {
        this.sharpenPercent = sharpenPercent
        this.downFilter = downFilter
        this.upFilter = upFilter
        this.scalingColorSpace = scalingColorScape
        this.resampleWhen = resampleWhen
        this.sharpenWhen = sharpenWhen
    }
}

export class ConstraintGravity {
    private readonly x: number
    private readonly y: number

    toGravity(): Object {
        return {
            percentage: {
                x: this.x,
                y: this.y,
            },
        }
    }
    constructor(x: number, y: number) {
        this.x = x
        this.y = y
    }
}

export enum ConstraintMode {
    /// ="distort" the image to exactly the given dimensions.
    /// If only one dimension is specified, behaves like `fit`.
    Distort = 'distort',
    /// Ensure the result fits within the provided dimensions. No upscaling.
    Within = 'within',
    /// Fit the image within the dimensions, upscaling if needed
    Fit = 'fit',
    /// Ensure the image is larger than the given dimensions
    LargerThan = 'larger_than',
    /// Crop to desired aspect ratio if image is larger than requested, then downscale. Ignores smaller images.
    /// If only one dimension is specified, behaves like `within`.
    WithinCrop = 'within_crop',
    /// Crop to desired aspect ratio, then downscale or upscale to fit.
    /// If only one dimension is specified, behaves like `fit`.
    FitCrop = 'fit_crop',
    /// Crop to desired aspect ratio, no upscaling or downscaling. If only one dimension is specified, behaves like Fit.
    AspectCrop = 'aspect_crop',
    /// Pad to desired aspect ratio if image is larger than requested, then downscale. Ignores smaller images.
    /// If only one dimension is specified, behaves like `within`
    WithinPad = 'within_pad',
    /// Pad to desired aspect ratio, then downscale or upscale to fit
    /// If only one dimension is specified, behaves like `fit`.
    FitPad = 'fit_pad',
}

interface ConstraintOptions {
    canvasColor?: string
    canvasGravity?: ConstraintGravity
    hints?: ConstraintHints
}
export class Constraint implements BaseStep {
    private hints?: ConstraintHints
    private readonly width?: number
    private readonly height?: number
    private gravity?: ConstraintGravity
    private mode: ConstraintMode
    private readonly canvasColor?: string
    toStep(): Object {
        return {
            constrain: {
                mode: this.mode.toString(),
                w: this.width,
                h: this.height,
                hints: this.hints?.toHint(),
                gravity: this.gravity?.toGravity(),
                canvas_color: this.canvasColor,
            },
        }
    }

    constructor(
        mode: ConstraintMode,
        width: number | null = null,
        height: number | null = null,
        {
            canvasColor = null,
            canvasGravity = null,
            hints = null,
        }: ConstraintOptions = {}
    ) {
        this.mode = mode
        this.width = width
        this.height = height
        this.canvasColor = canvasColor
        this.gravity = canvasGravity
        this.hints = hints
    }
}

export class RegionPercentage implements BaseStep {
    private readonly x1: number
    private readonly y1: number
    private readonly x2: number
    private readonly y2: number
    private backgroundColor: string
    toStep(): Object {
        return {
            region_percent: {
                x1: this.x1,
                y1: this.y1,
                x2: this.x2,
                y2: this.y2,
                background_color: this.backgroundColor,
            },
        }
    }

    constructor({ x1, y1, x2, y2 }: FitBoxCoordinates) {
        this.x1 = x1
        this.y2 = y2
        this.x2 = x2
        this.y1 = y1
    }
}

export class Region implements BaseStep {
    private readonly x1: number
    private readonly y1: number
    private readonly x2: number
    private readonly y2: number
    private backgroundColor: string
    toStep(): Object {
        return {
            region: {
                x1: this.x1,
                y1: this.y1,
                x2: this.x2,
                y2: this.y2,
                background_color: this.backgroundColor,
            },
        }
    }

    constructor({ x1, y1, x2, y2 }: FitBoxCoordinates) {
        this.x1 = x1
        this.y2 = y2
        this.x2 = x2
        this.y1 = y1
    }
}

export class CropWhitespace implements BaseStep {
    private readonly threshold: number
    private readonly padding: number
    toStep(): Object {
        return {
            crop_whitespace: {
                threshold: this.threshold,
                percent_padding: this.padding,
            },
        }
    }

    constructor(threshold: number, padding: number) {
        if (padding < 0 || padding > 100)
            throw new Error('invalid value for percentage')
        if (threshold < 0 || threshold > 255)
            throw new Error('invalid value of threshold')
        this.padding = padding
        this.threshold = threshold
    }
}

export class Rotate90 implements BaseStep {
    toStep(): string {
        return 'rotate_90'
    }
}

export class Rotate180 implements BaseStep {
    toStep(): string {
        return 'rotate_180'
    }
}

export class Rotate270 implements BaseStep {
    toStep(): string {
        return 'rotate_270'
    }
}

export class FlipV implements BaseStep {
    toStep(): string {
        return 'flip_v'
    }
}

export class FlipH implements BaseStep {
    toStep(): string {
        return 'flip_H'
    }
}

export class FillRect implements BaseStep {
    private readonly x1: number
    private readonly x2: number
    private readonly y1: number
    private readonly y2: number
    private readonly color: string
    toStep(): Object {
        return {
            fill_rect: {
                x1: this.x1,
                y1: this.y1,
                x2: this.x2,
                y2: this.y2,
                color: this.color,
            },
        }
    }

    constructor(x1: number, y1: number, x2: number, y2: number, color: string) {
        this.x1 = x1
        this.x2 = x2
        this.y1 = y1
        this.y2 = y2
        this.color = color
    }
}

export abstract class Colors {
    abstract toColor(): Object
}

export enum ColorType {
    Hex = 'hex',
}

export class SRGBColor implements Colors {
    private readonly type: ColorType
    private readonly value: string
    toColor(): Object {
        return {
            srgb: {
                [this.type]: this.value,
            },
        }
    }

    constructor(type: ColorType, value: string) {
        this.type = type
        this.value = value
    }
}

interface ExpandCanvasOptions {
    top: number
    right: number
    bottom: number
    left: number
}

export class ExpandCanvas implements BaseStep {
    private readonly top: number
    private readonly right: number
    private readonly bottom: number
    private readonly left: number
    private color: SRGBColor
    toStep(): Object {
        return {
            expand_canvas: {
                left: this.left,
                top: this.top,
                right: this.right,
                bottom: this.bottom,
                color: this.color.toColor(),
            },
        }
    }
    constructor(
        { top = 0, left = 0, right = 0, bottom = 0 }: ExpandCanvasOptions,
        color: SRGBColor
    ) {
        this.top = top
        this.left = left
        this.right = right
        this.bottom = bottom
        this.color = color
    }
}

enum FitMode {
    Distort = 'distort',
    Within = 'within',
    Fit = 'fit',
    WithinCrop = 'within_crop',
    FitCrop = 'fit_crop',
}

interface FitBox {
    toFitBox(): Object
}

interface FitBoxCoordinates {
    x1: number
    y1: number
    x2: number
    y2: number
}

export class FitBoxPercentage {
    private readonly x1: number
    private readonly y1: number
    private readonly x2: number
    private readonly y2: number
    toFitBox(): Object {
        return {
            image_percentage: {
                x1: this.x1,
                y1: this.y1,
                x2: this.x2,
                y2: this.y2,
            },
        }
    }

    constructor({ x1, x2, y1, y2 }: FitBoxCoordinates) {
        this.x1 = x1
        this.x2 = x2
        this.y1 = y1
        this.y2 = y2
    }
}

export class FitBoxMargin {
    private readonly left: number
    private readonly top: number
    private readonly right: number
    private readonly bottom: number
    toFitBox(): Object {
        return {
            image_margins: {
                left: this.left,
                top: this.top,
                right: this.right,
                bottom: this.bottom,
            },
        }
    }

    constructor({
        top = 0,
        left = 0,
        right = 0,
        bottom = 0,
    }: ExpandCanvasOptions) {
        this.top = top
        this.left = left
        this.right = right
        this.bottom = bottom
    }
}

export interface WatermarkOption {
    gravity: ConstraintGravity
    mode: FitMode
    box: FitBox
    opacity: number
    hint: ConstraintHints
}

export class Watermark implements BaseStep {
    private readonly ioID: number
    private gravity: ConstraintGravity
    private readonly fitMode: FitMode
    private fitBox: FitBox
    private readonly opacity: number
    private hint: ConstraintHints
    toStep(): Object {
        return {
            watermark: {
                io_id: this.ioID,
                gravity: this.gravity.toGravity(),
                fit_mode: this.fitMode,
                fit_box: this.fitBox.toFitBox(),
                opacity: this.opacity,
                hints: this.hint.toHint(),
            },
        }
    }

    constructor(
        ioID: number,
        { gravity, mode, box, opacity, hint }: WatermarkOption
    ) {
        if (opacity > 1 || opacity < 0) throw new Error('invalid opacity value')
        this.ioID = ioID
        this.gravity = gravity
        this.fitMode = mode
        this.fitBox = box
        this.opacity = opacity
        this.hint = hint
    }
}

export class Commandstring implements BaseStep {
    private readonly command: string
    private readonly encode: number
    private readonly decode: number
    toStep(): Object {
        return {
            command_string: {
                kind: 'ir4',
                value: this.command,
                decode: this.encode,
                encode: this.decode,
            },
        }
    }

    constructor(command: string, encode: number, decode: number) {
        this.command = command
        this.decode = decode
        this.encode = encode
    }
}

export class WhiteBalance {
    private threshold: number
    toStep(): Object {
        return {
            white_balance_histogram_area_threshold_srgb: {
                threshold: this.threshold,
            },
        }
    }
    constructor(threshold: number) {
        this.threshold = threshold
    }
}
export enum ColorFilterSRGBType {
    GrayscaleNtsc = 'grayscale_ntsc',
    GrayscaleFlat = 'grayscale_flat',
    GrayscaleBt709 = 'grayscale_bt709',
    GrayscaleRY = 'grayscale_ry',
    Invert = 'invert',
}

export enum ColorFilterSRGBValueType {
    Alpha = 'aplha',
    Contrast = 'contrast',
    Brightness = 'brightness',
}

export class ColorFilterSRGBValue {
    private value: number
    private valueType: ColorFilterSRGBValueType

    constructor(value: number, valueType: ColorFilterSRGBValueType) {
        this.value = value
        this.valueType = valueType
    }

    toFilter(): Object {
        return {
            [this.valueType]: this.value,
        }
    }
}

export class ColorFilterSRGB implements BaseStep {
    private filterType: ColorFilterSRGBType | ColorFilterSRGBValue
    toStep(): Object {
        return {
            color_filter_srgb:
                typeof this.filterType === 'string'
                    ? this.filterType
                    : this.filterType.toFilter(),
        }
    }

    constructor(filter: ColorFilterSRGBType | ColorFilterSRGBValue) {
        this.filterType = filter
    }
}

export interface DrawExactImageToCoordinate {
    x: number
    y: number
    w: number
    h: number
}

export class DrawExactImageTo implements BaseStep {
    private x: number
    private y: number
    private w: number
    private h: number

    private blend: CompositingMode
    private hint: ConstraintHints

    toStep(): Object {
        return {
            draw_image_exact: {
                x: this.x,
                y: this.y,
                w: this.w,
                h: this.h,
                blend: this.blend,
                hints: this.hint.toHint(),
            },
        }
    }

    constructor(
        { x = 0, y = 0, w = 0, h = 0 }: DrawExactImageToCoordinate,
        blend: CompositingMode,
        hint: ConstraintHints
    ) {
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.blend = blend
        this.hint = hint
    }
}

export enum CompositingMode {
    Compose = 'compose',
    Overwrite = 'overwrite',
}

export class CopyRectangle implements BaseStep {
    private fromX: number
    private fromY: number
    private w: number
    private h: number
    private x: number
    private y: number

    toStep(): Object {
        return {
            copy_rect_to_canvas: {
                from_x: this.fromX,
                from_y: this.fromY,
                w: this.w,
                h: this.h,
                x: this.x,
                y: this.y,
            },
        }
    }

    constructor(
        { x = 0, y = 0, w = 0, h = 0 }: DrawExactImageToCoordinate,
        fromX: number,
        fromY: number
    ) {
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.fromX = fromX
        this.fromY = fromY
    }
}

export abstract class IOOperation {
    abstract toIOBuffer(): Promise<ArrayBuffer | SharedArrayBuffer>
    abstract toIOID(): Object
    abstract setIOID(id: number, direction: Direction): void
    abstract get ioID(): number
    abstract toOutput(buffer: ArrayBuffer, collector: Object): Promise<any>
}

export class FromFile implements IOOperation {
    private filename: string
    private ioId: number
    private direction: Direction
    async toIOBuffer(): Promise<ArrayBuffer | SharedArrayBuffer> {
        let file = fs.promises.readFile(this.filename)
        return (await file).buffer
    }
    get ioID() {
        return this.ioId
    }
    constructor(filename: string) {
        this.filename = filename
    }
    setIOID(id: number, direction: Direction) {
        this.ioId = id
        this.direction = direction
    }

    toIOID(): Object {
        return {
            io_id: this.ioId,
            direction: this.direction,
            io: 'placeholder',
        }
    }

    async toOutput(buffer: ArrayBuffer, collector: Object) {
        await fs.promises.writeFile(this.filename, Buffer.from(buffer))
    }
}

export class FromStream implements IOOperation {
    private ioId: number
    private direction: Direction
    private internalStream: stream.Writable
    constructor(str: stream.Writable) {
        this.internalStream = str
    }

    async toIOBuffer(): Promise<ArrayBuffer | SharedArrayBuffer> {
        let buffer = await str(this.internalStream)
        return buffer.buffer
    }
    toIOID(): Object {
        return {
            io_id: this.ioId,
            direction: this.direction,
            io: 'placeholder',
        }
    }
    setIOID(id: number, direction: Direction) {
        this.ioId = id
        this.direction = direction
    }
    get ioID(): number {
        return this.ioID
    }
    async toOutput(buffer: ArrayBuffer, collector: Object): Promise<any> {
        this.internalStream.end(Buffer.from(buffer))
    }
}

export class FromBuffer implements IOOperation {
    private buffer: Buffer
    private ioId: number
    private direction: Direction
    private key: string

    async toIOBuffer(): Promise<ArrayBuffer | SharedArrayBuffer> {
        return this.buffer.buffer
    }
    constructor(buf: Buffer, key: string) {
        this.buffer = buf
        this.key = key
    }
    toIOID(): Object {
        return {
            io_id: this.ioId,
            direction: this.direction,
            io: 'placeholder',
        }
    }
    setIOID(id: number, direction: Direction) {
        this.ioId = id
        this.direction = direction
    }
    get ioID(): number {
        return this.ioID
    }
    async toOutput(buffer: ArrayBuffer, collector: Object): Promise<any> {
        collector[this.key] = buffer
    }
}

export class FromURL implements IOOperation {
    private url: string
    private ioId: number
    private direction: Direction
    async toIOBuffer(): Promise<ArrayBuffer | SharedArrayBuffer> {
        let file = axios.get<any, AxiosResponse<Buffer>>(this.url, {
            responseType: 'arraybuffer',
        })
        return (await file).data.buffer
    }
    get ioID() {
        return this.ioId
    }
    constructor(url: string) {
        this.url = url
    }
    setIOID(id: number, direction: Direction) {
        this.ioId = id
        this.direction = direction
    }

    toIOID(): Object {
        return {
            io_id: this.ioId,
            direction: this.direction,
            io: 'placeholder',
        }
    }

    async toOutput(buffer: ArrayBuffer, collector: Object) {
        await axios.post(this.url, Buffer.from(buffer))
    }
}
