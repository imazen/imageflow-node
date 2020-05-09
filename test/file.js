const {
    MozJPEG,
    Steps,
    FromURL,
    FromFile,
    FromStream,
    FromBuffer,
} = require('..')
// const fs = require('fs')

// let step = new Steps(new FromURL('https://jpeg.org/images/jpeg2000-home.jpg'))
//     .constraintWithin(500, 500)
//     .branch((step) =>
//         step
//             .constraintWithin(400, 400)
//             .branch((step) =>
//                 step
//                     .constraintWithin(200, 200)
//                     .rotate90()
//                     .colorFilterGrayscaleFlat()
//                     .encode(new FromFile('./branch_2.jpg'), new MozJPEG(80))
//             )
//             .copyRectangle(
//                 (canvas) =>
//                     canvas.decode(
//                         new FromStream(fs.createReadStream('./test.jpg'))
//                     ),
//                 { x: 0, y: 0, w: 100, h: 100 },
//                 10,
//                 10
//             )
//             .encode(new FromFile('./branch.jpg'), new MozJPEG(80))
//     )
//     .constraintWithin(100, 100)
//     .rotate180()
// step.encode(new FromBuffer(null, 'key'), new MozJPEG(80))
//     .execute()
//     .then(console.log)
//     .catch(console.log)

const test = new Steps(new FromFile('./test/test.jpg'))
    .constraintWithin(800, 800)
    .branch((step) => step.encode(new FromFile('large.jpeg'), new MozJPEG()))
    .branch((step) =>
        step
            .constraintWithin(400, 400)
            .branch((step) =>
                step
                    .constraintWithin(200, 200)
                    .branch((step) =>
                        step
                            .constraintWithin(100, 100)
                            .encode(
                                new FromFile('performing.jpeg'),
                                new MozJPEG()
                            )
                    )
                    .encode(new FromFile('small.jpeg'), new MozJPEG())
            )
            .encode(new FromFile('medium.jpeg'), new MozJPEG())
    )
    .execute()

// class Graph {
//     map

//     constructor() {
//         this.map = new Map()
//     }

//     addVertex(ver) {
//         this.map.set(ver, [])
//     }

//     addEdge(to, from) {
//         console.log(this.map, to, from)
//         this.map.get(from).push(to)
//     }
// }

// class Base {
//     graph
//     vertex
//     last

//     constructor() {
//         this.graph = new Graph()
//         this.vertex = []
//         this.last = 0
//         this.graph.addVertex(0)
//         this.vertex.push(0)
//     }

//     addEdge() {
//         this.graph.addVertex(this.vertex.length)
//         this.vertex.push(this.vertex.length)
//         this.graph.addEdge(this.vertex.length - 1, this.last)
//         this.last = this.vertex.length - 1
//         return this
//     }

//     branch(f) {
//         let last = this.last
//         f(this)
//         this.last = last
//         return this
//     }
// }

// let base = new Base()

// base.addEdge()
//     .branch((step) =>
//         step
//             .addEdge()
//             .addEdge()
//             .branch((step) => step.addEdge().addEdge())
//             .addEdge()
//     )
//     .addEdge()
//     .addEdge()

// console.log(base.graph)
