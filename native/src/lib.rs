extern crate neon;
extern crate imageflow_core;

use neon::prelude::*;

fn get_long_version_string(mut cx: FunctionContext) -> JsResult<JsString> {
    Ok(cx.string(imageflow_types::version::one_line_version()))
}

pub struct ContextWrapper{
    inner: Box<imageflow_core::Context>
}
impl ContextWrapper{
    fn new() -> ContextWrapper{
        match imageflow_core::Context::create_can_panic(){
            Ok(v) => ContextWrapper{
                inner: v
            },
            Err(e) => panic!(e)
        }
    }
    fn add_input_bytes_copied_panic(&mut self, io_id: i32, bytes: &[u8]){
        match self.inner.add_copied_input_buffer(io_id, bytes){
            Ok(_) => {},
            Err(e) => panic!(e)
        }
    }
    fn test(&mut self){

       // self.inner.add_input_bytes()
       // neon::context::CallContext::n
    }
}

declare_types! {
  pub class JsContext for ContextWrapper {
    init(_cx) {
        Ok(ContextWrapper::new())
    }
    method addInputBytesCopied(mut cx){
        let mut this = cx.this();
        let io_id: i32 = cx.argument::<JsNumber>(0)?.value() as i32;
        let bytes: Handle<JsArrayBuffer> = cx.argument(1)?;
        {
            let guard = cx.lock();
            let mut job = this.borrow_mut(&guard);
            cx.borrow(&bytes, |data| {
                let slice = data.as_slice::<u8>();
                job.add_input_bytes_copied_panic(io_id, slice)
            });
        }
        Ok(cx.undefined().upcast())
    }
    method get(mut cx) {
      let attr: String = cx.argument::<JsString>(0)?.value();
      let this = cx.this();
      match &attr[..] {
        "id" => {
          let id = {
            let guard = cx.lock();
            let user = this.borrow(&guard);
            3
          };
          Ok(cx.number(id).upcast())
        },
        _ => cx.throw_type_error("property does not exist")
      }
    }
    method panic(_) {
      panic!("JobContext.prototype.panic")
    }
  }
}


register_module!(mut cx, {
    cx.export_function("getLongVersionString", get_long_version_string)?;
    cx.export_class::<JsContext>("JobContext")?;
    Ok(())
});
