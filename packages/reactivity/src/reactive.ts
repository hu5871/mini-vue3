import { isObject } from '@vue/shared';
import { track, trigeer } from './effect';

const enum ReactiveFlags{
  IS_REACTIVE='__v_isReactive'
}

const mutableHandlers:ProxyHandler<Record<any,any>>={
  get(target,key,recevier){//recevier代理对象的本身
 
    if(key ===ReactiveFlags.IS_REACTIVE){
      return true
    }
    track(target,key)
    //取值时，可以收集它在哪个effect中
    const res=Reflect.get(target,key,recevier);//target[key]
    return res
  },
  set(target,key,value,recevier){
     let oldValue=(target as unknown)[key] 
   
    const res=Reflect.set(target,key,value,recevier)//target[key]=value
 //改值时，可以触发effect更新
   if(oldValue !== value){//值没变不需要触发effect执行
    trigeer(target,key)
   }
    
    return res
  }
}

const reactiveMap=new WeakMap();//弱引用 key必须是对象 如果key没有被引用可以被自动销毁
function createReactiveObject(target:object){
  
     //先默认认为这个target已经是代理过的属性
    if(target[ReactiveFlags.IS_REACTIVE]){
      return target
    }

   if(!isObject(target)) {
     //只针对对象做代理
    return target
   }

  const exisitingProxy=reactiveMap.get(target);//如果缓存中有 直接使用上一次的代理结果 
  if (exisitingProxy){
   return exisitingProxy
  }
  const proxy=new Proxy(target,mutableHandlers)//当用户获取属性或者更改的时候 劫持到

  reactiveMap.set(target,proxy)//将原对象和生成的代理对象 做一个映射表

  return proxy
}

export function reactive(target:object){

  return createReactiveObject(target)
}
export function readonly(){}

export function toReactive(value){
  return isObject(value) ? reactive(value):value
}
// export function shallowReactive(){}


// export function shallowReadnly(){}