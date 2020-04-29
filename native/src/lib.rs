extern crate neon;
extern crate imageflow_core;

use neon::prelude::*;

fn get_long_version_string(mut cx: FunctionContext) -> JsResult<JsString> {
    Ok(cx.string(imageflow_types::version::one_line_version()))
}

// pub fn buf_copy_from_slice(data: &[u8], buf: &mut Handle<JsBuffer>) {
//     buf.grab(|mut contents| { contents.as_mut_slice().copy_from_slice(data) });
// }

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
    fn add_output_buffer_panic(&mut self, io_id: i32){
        match self.inner.add_output_buffer(io_id){
            Ok(_) => {},
            Err(e) => panic!(e)
        }
    }

    fn get_output_buffer_bytes_panic(&mut self, io_id: i32) -> &[u8]{
        match self.inner.get_output_buffer_slice(io_id){
            Ok(bytes) => bytes,
            Err(e) => panic!(e)
        }
    }



    fn message(&mut self, method: String, message: String) -> String{
        let (response, _result) =  self.inner.message(&method, message.as_bytes());
        match String::from_utf8(response.response_json.to_vec())
        {
            Ok(response) => response,
            Err(e) => panic!(e),
        }
    }


    fn test(&mut self){
        //neon::borrow::RefMut::deref_mut()
        //neon::context::CallContext::arr
       // self.inner.add_input_bytes()
        //BinaryData::write_all_at()

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
    method addOutputBuffer(mut cx){
        let mut this = cx.this();
        let io_id: i32 = cx.argument::<JsNumber>(0)?.value() as i32;
        {
            let guard = cx.lock();
            let mut job = this.borrow_mut(&guard);
            job.add_output_buffer_panic(io_id)
        }
        Ok(cx.undefined().upcast())
    }
    // method getOutputBufferBytes(mut cx){
    //     let mut this = cx.this();
    //     let io_id: i32 = cx.argument::<JsNumber>(0)?.value() as i32;
    //     let buffer = {
    //         let guard = cx.lock();
    //         let mut job = this.borrow_mut(&guard);
    //         let bytes = job.get_output_buffer_bytes_panic(io_id);
    //         let buffer = cx.array_buffer(bytes.len() as u32)?;
    //         buf_copy_from_slice(bytes, buffer);
    //         buffer
    //     };
    //
    //     Ok(buffer.upcast())
    // }

    method message(mut cx){
        let mut this = cx.this();
        let method: String = cx.argument::<JsString>(0)?.value();
        let message: String = cx.argument::<JsString>(1)?.value();
        let response = {
            let guard = cx.lock();
            let mut job = this.borrow_mut(&guard);
            job.message(method, message)
        };
        Ok(cx.string(response).upcast())
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
