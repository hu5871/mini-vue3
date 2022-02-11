import { isFunction } from "@vue/shared";
import { isTacking, ReactiveEffect, trackEffects, triggerEffects } from "./effect";
class ComputedRefImpl{
  public dep;
  public _dirty=true
  public __v_isRef=true
  public effect
  public _value
  constructor(getter,public setter){
    this.effect=new ReactiveEffect(getter,()=>{
      if(!this._dirty){
        this._dirty=true;
        triggerEffects(this.dep)
      }
    })
  }

  get value(){
    if(isTacking()){
      trackEffects(this.dep||(this.dep=new Set))
    }
    if(this._dirty){
      //将结果缓存到this._value  不会每次都run
      this._value=this.effect.run()
      this._dirty=false
    }
   
   return this._value
  }

  set value(newVal){
    this.setter(newVal)
  }
}
export function computed(options){
   const onlyGetter=isFunction(options)

   let getter;
   let setter;
   if(onlyGetter){
     getter=options
     setter=()=>{}
   }else{
    getter=options.get
    setter=options.set
   }
   return new ComputedRefImpl(getter,setter)
}