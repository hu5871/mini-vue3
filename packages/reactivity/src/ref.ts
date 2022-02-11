import { isTacking, trackEffects, triggerEffects } from "./effect";
import { toReactive } from "./reactive";

class RefImpl{
  public dep;
  public __v_isRef;
  public _value;
  constructor(public _rawValue){
     this._value=toReactive(_rawValue)
  }

  get value(){
    if(isTacking()){
      trackEffects(this.dep||(this.dep=new Set()))
    }
    return this._value
  }

  set value(newVal){
   if(newVal!==this._rawValue){
     this._rawValue=newVal
     this._value=toReactive(newVal)
     triggerEffects(this.dep)
   }
  }
}

function createRef(value){
  return new RefImpl(value)
}

export function ref(value){
   return createRef(value)
}