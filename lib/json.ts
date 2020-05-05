import { Decode, Encode, Constraint, ConstraintMode } from './types'

function File(path: string) {}

interface BaseStep {
    toStep(): object | String
}

class Steps {
    private inner: Array<BaseStep>
    constructor(startNode: Decode) {
        this.inner.push(startNode)
    }
    constraint(constarint: Constraint): Steps {
        this.inner.push(constarint)
        return this
    }
    constraintWithin(width: Number, hieght: Number): Steps {
        this.inner.push(new Constraint(ConstraintMode.Within, width, hieght))
        return this
    }
}
