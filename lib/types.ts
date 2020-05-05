export enum Direction {
    in,
    out,
}

export class IOData {
    private readonly io_id: Number
    direction: Direction
    io: String
    get ioID() {
        return this.io_id
    }

    constructor(direction: Direction, io: String, ioID: Number) {
        this.direction = direction
        this.io = io
        this.io_id = ioID
    }
}

export abstract class BaseStep {
    abstract toStep(): Object | String
}

export class Decode extends BaseStep {
    private readonly io_id: Number

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
    constructor(ioID: Number) {
        super()
        this.io_id = ioID
    }
}

abstract class Preset {
    abstract toPreset(): Object | String
}

export class GIF extends Preset {
    toPreset(): String {
        return 'gif'
    }
}

export class MozJPEG extends Preset {
    private readonly quality: Number
    private readonly isProgressive: boolean
    toPreset(): Object {
        return {
            mozjpeg: {
                quality: this.quality,
                progressive: this.isProgressive,
            },
        }
    }

    constructor(quality: Number, isProgressive: boolean) {
        super()
        if (quality > 100 || quality < 0)
            throw new Error('invalid quality for preset')
        this.isProgressive = isProgressive
        this.quality = quality
    }
}

export class LosslessPNG extends Preset {
    private readonly maximumDeflate: boolean
    toPreset(): Object {
        return {
            lodepng: {
                maximum_deflate: this.maximumDeflate,
            },
        }
    }

    constructor(maximumDeflate: boolean = false) {
        super()
        this.maximumDeflate = maximumDeflate
    }
}

export class LossyPNG extends Preset {
    private readonly quality: Number
    private readonly minimumQuality: Number
    private readonly speed: Number | null
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
        quality: Number,
        minQuality: Number,
        speed: Number | null = null,
        maxdeflate: boolean = false
    ) {
        super()
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

export class WebP extends Preset {
    private readonly quality: Number
    toPreset(): Object {
        return {
            webplossy: {
                quality: this.quality,
            },
        }
    }
    constructor(quality: Number) {
        super()
        if (quality > 100 || quality < 0)
            throw new Error('invalid quality for preset')
        this.quality = quality
    }
}

export class WebPLossless extends Preset {
    toPreset(): String {
        return 'webplossless'
    }
}

export class Encode<T extends Preset> extends BaseStep {
    private preset: T
    private readonly io_id: Number
    toStep(): Object {
        return {
            encode: {
                io_id: this.io_id,
                preset: this.preset.toPreset(),
            },
        }
    }

    constructor(preset: T, ioId: Number) {
        super()
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

class ConstraintHints {
    private readonly sharpenPercent: Number
    private downFilter: Filter | null
    private upFilter: Filter | null
    private scalingColorSpace: ScalingFloatspace | null
    private resampleWhen: ResampleWhen | null
    private sharpenWhen: SharpenWhen | null
    toHint(): Object {
        return {
            sharpen_percent: this.sharpenPercent,
            down_filter: this.downFilter.toString()?.toLowerCase(),
            up_filter: this.upFilter.toString()?.toLowerCase(),
            scaling_colorspace: this.scalingColorSpace
                ?.toString()
                .toLowerCase(),
            resample_when: this.resampleWhen?.toString(),
            sharpen_when: this.sharpenWhen?.toString(),
        }
    }
    constructor(
        sharpenPercent: Number,
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
    private readonly x: Number
    private readonly y: Number

    toGravity(): Object {
        return {
            percentage: {
                x: this.x,
                y: this.y,
            },
        }
    }
    constructor(x: Number, y: Number) {
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
    canvasColor?: String
    canvasGravity?: ConstraintGravity
    hints?: ConstraintHints
}
export class Constraint extends BaseStep {
    private hints?: ConstraintHints
    private readonly width?: Number
    private readonly hieght?: Number
    private gravity?: ConstraintGravity
    private mode: ConstraintMode
    private readonly canvasColor?: String
    toStep(): Object {
        return {
            constrain: {
                mode: this.mode.toString(),
                w: this.width,
                h: this.hieght,
                hints: this.hints?.toHint(),
                gravity: this.gravity?.toGravity(),
                canvas_color: this.canvasColor,
            },
        }
    }

    constructor(
        mode: ConstraintMode,
        width: Number | null = null,
        hieght: Number | null = null,
        {
            canvasColor = null,
            canvasGravity = null,
            hints = null,
        }: ConstraintOptions = {}
    ) {
        super()
        this.mode = mode
        this.width = width
        this.hieght = hieght
        this.canvasColor = canvasColor
        this.gravity = canvasGravity
        this.hints = hints
    }
}

export class RegionPercentage extends BaseStep {
    private readonly x1: Number
    private readonly y1: Number
    private readonly x2: Number
    private readonly y2: Number
    private backgroundColor: String
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

    constructor(x1: Number, y1: Number, x2: Number, y2: Number) {
        super()
        this.x1 = x1
        this.y2 = y2
        this.x2 = x2
        this.y1 = y1
    }
}

export class Region extends BaseStep {
    private readonly x1: Number
    private readonly y1: Number
    private readonly x2: Number
    private readonly y2: Number
    private backgroundColor: String
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

    constructor(x1: Number, y1: Number, x2: Number, y2: Number) {
        super()
        this.x1 = x1
        this.y2 = y2
        this.x2 = x2
        this.y1 = y1
    }
}

export class CropWhiteSpace extends BaseStep {
    private readonly threshold: Number
    private readonly padding: Number
    toStep(): Object {
        return {
            crop_whitespace: {
                threshold: this.threshold,
                percent_padding: this.padding,
            },
        }
    }

    constructor(threshold: Number, padding: Number) {
        super()
        if (padding < 0 || padding > 100)
            throw new Error('invalid value for percentage')
        if (threshold < 0 || threshold > 255)
            throw new Error('invalid value of threshold')
        this.padding = padding
        this.threshold = threshold
    }
}

export class Rotate90 extends BaseStep {
    toStep(): String {
        return 'rotate_90'
    }
}

export class Rotate180 extends BaseStep {
    toStep(): String {
        return 'rotate_180'
    }
}

export class Rotate270 extends BaseStep {
    toStep(): String {
        return 'rotate_270'
    }
}

export class FlipV extends BaseStep {
    toStep(): String {
        return 'flip_v'
    }
}

export class FlipH extends BaseStep {
    toStep(): String {
        return 'flip_H'
    }
}

export class FillRect extends BaseStep {
    private readonly x1: Number
    private readonly x2: Number
    private readonly y1: Number
    private readonly y2: Number
    private readonly color: String
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

    constructor(x1: Number, y1: Number, x2: Number, y2: Number, color: String) {
        super()
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

enum ColorType {
    Hex = 'hex',
}

export class SRGBColor extends Colors {
    private readonly type: ColorType
    private readonly value: String
    toColor(): Object {
        return {
            srbg: {
                [this.type]: this.value,
            },
        }
    }

    constructor(type: ColorType, value: String) {
        super()
        this.type = type
        this.value = value
    }
}

export class LinearColor extends Colors {
    private type: ColorType
    private value: String
    toColor(): Object {
        return {
            linear: {
                [this.type]: this.value,
            },
        }
    }

    constructor(type: ColorType, value: String) {
        super()
        this.type = type
        this.value = value
    }
}

interface ExpandCanvasOptions {
    top: Number
    right: Number
    bottom: Number
    left: Number
}

export class ExpandCanvas<T extends Colors> extends BaseStep {
    private readonly top: Number
    private readonly right: Number
    private readonly bottom: Number
    private readonly left: Number
    private color: T
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
        color: T
    ) {
        super()
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

interface FitBoxCordinates {
    x1: Number
    y1: Number
    x2: Number
    y2: Number
}

export class FitBoxPercentage {
    private readonly x1: Number
    private readonly y1: Number
    private readonly x2: Number
    private readonly y2: Number
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

    constructor({ x1, x2, y1, y2 }: FitBoxCordinates) {
        this.x1 = x1
        this.x2 = x2
        this.y1 = y1
        this.y2 = y2
    }
}

export class FitBoxMargin {
    private readonly left: Number
    private readonly top: Number
    private readonly right: Number
    private readonly bottom: Number
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

export class WaterMark extends BaseStep {
    private readonly ioID: Number
    private gravity: ConstraintGravity
    private readonly fitMode: FitMode
    private fitbox: FitBox
    private readonly opacity: Number
    private hint: ConstraintHints
    toStep(): Object {
        return {
            watermark: {
                io_id: this.ioID,
                gravity: this.gravity.toGravity(),
                fit_mode: this.fitMode,
                fit_box: this.fitbox.toFitBox(),
                opacity: this.opacity,
                hints: this.hint.toHint(),
            },
        }
    }

    constructor(
        ioID: Number,
        gravity: ConstraintGravity,
        mode: FitMode,
        box: FitBox,
        opacity: Number,
        hint: ConstraintHints
    ) {
        super()
        if (opacity > 1 || opacity < 0) throw new Error('invalid opacity value')
        this.ioID = ioID
        this.gravity = gravity
        this.fitMode = mode
        this.fitbox = box
        this.opacity = opacity
        this.hint = hint
    }
}

export class CommandString extends BaseStep {
    private readonly command: String
    private readonly encode: Number
    private readonly decode: Number
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

    constructor(command: String, encode: Number, decode: Number) {
        super()
        this.command = command
        this.decode = decode
        this.encode = encode
    }
}
