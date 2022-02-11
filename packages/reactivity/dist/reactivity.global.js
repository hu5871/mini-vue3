var VueReactivity = (function (exports) {
  'use strict';

  let effectStack = [];
  let activeEffect;
  function clealupEffect(effect) {
      const { deps } = effect;
      for (const dep of deps) {
          dep.delete(effect); //移除属性对应的effect
      }
  }
  class ReactiveEffect {
      constructor(fn, scheduler) {
          this.fn = fn;
          this.scheduler = scheduler;
          this.active = true; //激活状态
          this.deps = []; //让effct记录它依赖了哪些属性，同时要记录当前属性依赖哪个effect
      }
      run() {
          if (!this.active) { //非激活状态调用run方法
              return this.fn();
          }
          if (!effectStack.includes(this)) {
              try {
                  effectStack.push(activeEffect = this);
                  return this.fn(); //取值 new Proxy 会执行get方法《依赖收集》
              }
              finally {
                  effectStack.pop(); //执行完删除栈中最后一个effect
                  activeEffect = effectStack[effectStack.length - 1];
              }
          }
      }
      stop() {
          if (this.active) {
              clealupEffect(this);
              this.active = false;
          }
      }
  }
  function isTacking() {
      return activeEffect !== undefined;
  }
  const targetMap = new WeakMap();
  function track(target, key) {
      if (!isTacking()) { //属性不依赖于effect直接跳出
          return;
      }
      let depsMap = targetMap.get(target);
      if (!depsMap) {
          targetMap.set(target, (depsMap = new Map())); //{对象：map{}}
      }
      let dep = depsMap.get(key);
      if (!dep) {
          depsMap.set(key, (dep = new Set())); //{对象：map{key:set:[]}}  一个属性可能对象多个effect
      }
      trackEffects(dep);
  }
  function trackEffects(dep) {
      let shouldTrack = !dep.has(activeEffect);
      if (shouldTrack) {
          dep.add(activeEffect); //{对象：map{key:set:[effect，effect]}} 
          activeEffect.deps.push(dep);
      }
  }
  function trigeer(target, key) {
      let depsMap = targetMap.get(target);
      if (!depsMap) {
          return;
      }
      let deps = [];
      if (key !== undefined) {
          deps.push(depsMap.get(key));
      }
      let effects = [];
      for (const dep of deps) {
          effects.push(...dep);
      }
      triggerEffects(effects);
  }
  function effect(fn) {
      const _effect = new ReactiveEffect(fn);
      _effect.run();
      let runner = _effect.run.bind(_effect);
      runner._effect = _effect;
      return runner;
  }
  function triggerEffects(dep) {
      for (const effect of dep) { //如果当前effect执行和要执行的effect是同一个，不执行，防止循环
          if (effect !== activeEffect) {
              if (effect.scheduler) {
                  return effect.scheduler();
              }
              effect.run(); //执行effect
          }
      }
  }

  function isObject(value) {
      return typeof value === 'object' && value !== null;
  }
  function isFunction(value) {
      return typeof value === 'function';
  }

  const mutableHandlers = {
      get(target, key, recevier) {
          if (key === "__v_isReactive" /* IS_REACTIVE */) {
              return true;
          }
          track(target, key);
          //取值时，可以收集它在哪个effect中
          const res = Reflect.get(target, key, recevier); //target[key]
          return res;
      },
      set(target, key, value, recevier) {
          let oldValue = target[key];
          const res = Reflect.set(target, key, value, recevier); //target[key]=value
          //改值时，可以触发effect更新
          if (oldValue !== value) { //值没变不需要触发effect执行
              trigeer(target, key);
          }
          return res;
      }
  };
  const reactiveMap = new WeakMap(); //弱引用 key必须是对象 如果key没有被引用可以被自动销毁
  function createReactiveObject(target) {
      //先默认认为这个target已经是代理过的属性
      if (target["__v_isReactive" /* IS_REACTIVE */]) {
          return target;
      }
      if (!isObject(target)) {
          //只针对对象做代理
          return target;
      }
      const exisitingProxy = reactiveMap.get(target); //如果缓存中有 直接使用上一次的代理结果 
      if (exisitingProxy) {
          return exisitingProxy;
      }
      const proxy = new Proxy(target, mutableHandlers); //当用户获取属性或者更改的时候 劫持到
      reactiveMap.set(target, proxy); //将原对象和生成的代理对象 做一个映射表
      return proxy;
  }
  function reactive(target) {
      return createReactiveObject(target);
  }
  function toReactive(value) {
      return isObject(value) ? reactive(value) : value;
  }
  // export function shallowReactive(){}
  // export function shallowReadnly(){}

  class ComputedRefImpl {
      constructor(getter, setter) {
          this.setter = setter;
          this._dirty = true;
          this.__v_isRef = true;
          this.effect = new ReactiveEffect(getter, () => {
              if (!this._dirty) {
                  this._dirty = true;
                  triggerEffects(this.dep);
              }
          });
      }
      get value() {
          if (isTacking()) {
              trackEffects(this.dep || (this.dep = new Set));
          }
          if (this._dirty) {
              //将结果缓存到this._value  不会每次都run
              this._value = this.effect.run();
              this._dirty = false;
          }
          return this._value;
      }
      set value(newVal) {
          this.setter(newVal);
      }
  }
  function computed(options) {
      const onlyGetter = isFunction(options);
      let getter;
      let setter;
      if (onlyGetter) {
          getter = options;
          setter = () => { };
      }
      else {
          getter = options.get;
          setter = options.set;
      }
      return new ComputedRefImpl(getter, setter);
  }

  class RefImpl {
      constructor(_rawValue) {
          this._rawValue = _rawValue;
          this._value = toReactive(_rawValue);
      }
      get value() {
          if (isTacking()) {
              trackEffects(this.dep || (this.dep = new Set()));
          }
          return this._value;
      }
      set value(newVal) {
          if (newVal !== this._rawValue) {
              this._rawValue = newVal;
              this._value = toReactive(newVal);
              triggerEffects(this.dep);
          }
      }
  }
  function createRef(value) {
      return new RefImpl(value);
  }
  function ref(value) {
      return createRef(value);
  }

  exports.computed = computed;
  exports.effect = effect;
  exports.reactive = reactive;
  exports.ref = ref;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

})({});
//# sourceMappingURL=reactivity.global.js.map
