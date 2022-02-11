let effectStack = []
let activeEffect

function clealupEffect(effect) {
  const { deps } = effect
  for (const dep of deps) {
    dep.delete(effect);//移除属性对应的effect
  }
}
export class ReactiveEffect {

  active = true;//激活状态
  deps = [];//让effct记录它依赖了哪些属性，同时要记录当前属性依赖哪个effect
  constructor(public fn, public scheduler?) {

  }

  run() {//执行fn
    if (!this.active) { //非激活状态调用run方法
      return this.fn()
    }

    if (!effectStack.includes(this)) {
      try {
        effectStack.push(activeEffect = this)
        return this.fn();//取值 new Proxy 会执行get方法《依赖收集》
      } finally {
        effectStack.pop();//执行完删除栈中最后一个effect
        activeEffect = effectStack[effectStack.length - 1]
      }
    }
  }
  stop() {//让effect和dep取消关联。，，dep上面的储存的effect移除掉
    if (this.active) {
      clealupEffect(this)
      this.active = false
    }
  }
}

export function isTacking() {//是否需要收集
  return activeEffect !== undefined
}

const targetMap = new WeakMap();

export function track(target, key) {//一个属性对应多个effect，一个effect中依赖了多个属性
  if (!isTacking()) {//属性不依赖于effect直接跳出
    return
  }

  let depsMap = targetMap.get(target)

  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))//{对象：map{}}
  }

  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))//{对象：map{key:set:[]}}  一个属性可能对象多个effect
  }

  trackEffects(dep)
}

export function trackEffects(dep) {
  let shouldTrack = !dep.has(activeEffect)
  if (shouldTrack) {
    dep.add(activeEffect)//{对象：map{key:set:[effect，effect]}} 
    activeEffect.deps.push(dep)
  }
}

export function trigeer(target, key) {
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  let deps = []

  if (key !== undefined) {
    deps.push(depsMap.get(key))
  }
  let effects = []
  for (const dep of deps) {
    effects.push(...dep)
  }
  triggerEffects(effects)
}

export function effect(fn) {

  const _effect = new ReactiveEffect(fn)
  _effect.run()
  let runner = _effect.run.bind(_effect)
  runner._effect = _effect
  return runner
}
export function triggerEffects(dep) {
  for (const effect of dep) {//如果当前effect执行和要执行的effect是同一个，不执行，防止循环
    if (effect !== activeEffect) {
      if (effect.scheduler) {
        return effect.scheduler()
      }
      effect.run()//执行effect
    }
  }
}